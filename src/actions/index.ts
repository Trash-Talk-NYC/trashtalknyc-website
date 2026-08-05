import { defineAction, ActionError, type ActionAPIContext } from 'astro:actions';
import { signupSchema, contactSchema, joinTeamSchema, type ContactInput } from '../lib/server/schemas';
import { checkSpam, type SpamCheckInput } from '../lib/server/spam';
import { isRateLimitedByBlobs } from '../lib/server/rate-limit';
import { storeJoinApplicationInBlobs } from '../lib/server/join-store';
import { verifyTurnstileToken } from '../lib/server/turnstile';
import {
  buildAttributes,
  buildInquiryEmail,
  buildNoteText,
  createBrevoNote,
  getBrevoContactId,
  sendBrevoEmail,
  upsertBrevoContact,
} from '../lib/server/brevo';

/**
 * Server actions for the two site forms. Flow per submission:
 * spam heuristics → per-IP rate limit → Turnstile verification →
 * env check → Brevo contact upsert.
 *
 * Log lines are structured JSON (Netlify captures stdout/stderr) and
 * deliberately exclude API keys and submitted PII.
 */

type FormName = 'signup' | 'contact' | 'join';

const GENERIC_FAILURE = 'Something went wrong — please try again.';

function log(level: 'info' | 'warn' | 'error', evt: string, fields: Record<string, string | number> = {}) {
  console[level](JSON.stringify({ evt, ...fields }));
}

/**
 * Reads an env var from the runtime (Netlify injects secrets into
 * process.env) with an import.meta.env fallback for local dev.
 */
function getEnv(name: string): string | undefined {
  return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name];
}

function requireEnv(name: string, form: FormName): string {
  const value = getEnv(name);
  if (!value) {
    log('error', 'form_env_missing', { form, var: name });
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
  }
  return value;
}

/**
 * Runs the spam + rate-limit gate. Returns true when the caller should
 * silently pretend success (honeypot hits — never tip off the bot).
 */
async function shouldSilentlyDrop(form: FormName, ctx: ActionAPIContext, spamInput: SpamCheckInput): Promise<boolean> {
  const verdict = checkSpam(spamInput);
  if (verdict.spam) {
    log('warn', 'form_spam_rejected', { form, reason: verdict.reason });
    if (verdict.reason === 'honeypot') return true;
    throw new ActionError({ code: 'BAD_REQUEST', message: GENERIC_FAILURE });
  }

  if (await isRateLimitedByBlobs(ctx.clientAddress)) {
    log('warn', 'form_rate_limited', { form });
    throw new ActionError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many submissions — please wait a few minutes and try again.',
    });
  }

  return false;
}

/**
 * Enforces Cloudflare Turnstile alongside (not replacing) the heuristics in
 * shouldSilentlyDrop. Runs after the rate limit so hammering IPs can't burn
 * siteverify calls. Dormant until PUBLIC_TURNSTILE_SITE_KEY is provisioned:
 * pages built without the site key render no widget, so enforcing here would
 * reject every legitimate submission. Once the site key is set, a missing
 * secret is a misconfiguration and fails closed like any missing form env.
 */
async function requireTurnstile(form: FormName, ctx: ActionAPIContext, token: string | undefined): Promise<void> {
  if (!getEnv('PUBLIC_TURNSTILE_SITE_KEY')) {
    log('warn', 'turnstile_not_configured', { form });
    return;
  }

  const secret = requireEnv('TURNSTILE_SECRET_KEY', form);
  const result = token
    ? await verifyTurnstileToken(secret, token, ctx.clientAddress)
    : { ok: false as const, detail: 'missing_token' };

  if (!result.ok) {
    log('warn', 'form_turnstile_rejected', { form, reason: result.detail });
    throw new ActionError({ code: 'BAD_REQUEST', message: GENERIC_FAILURE });
  }
}

async function upsertOrThrow(
  form: FormName,
  email: string,
  attributes: Record<string, string>,
  listIdVar: string,
): Promise<void> {
  const apiKey = requireEnv('BREVO_API_KEY', form);
  const listId = Number(requireEnv(listIdVar, form));
  if (!Number.isFinite(listId) || listId <= 0) {
    log('error', 'form_env_invalid', { form, var: listIdVar });
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
  }

  const result = await upsertBrevoContact(apiKey, { email, attributes, listId });
  if (!result.ok) {
    log('error', 'brevo_upsert_failed', { form, status: result.status ?? 0, detail: result.detail });
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
  }

  log('info', 'form_submitted', { form });
}

/**
 * Records the free-text field as a Brevo CRM note so the full submission
 * history survives (the MESSAGE attribute only keeps the latest value).
 * Best-effort: a note failure is logged but never fails the submission —
 * the contact upsert already succeeded.
 */
async function tryCreateNote(noteForm: string, email: string, content: string | undefined): Promise<void> {
  // Outer guard: the contact upsert already succeeded, so nothing in the
  // note flow — including bugs — may fail the user's submission.
  try {
    const trimmed = content?.trim();
    if (!trimmed) return;

    const apiKey = getEnv('BREVO_API_KEY');
    if (!apiKey) return; // upsert would have thrown already; belt and braces

    const contact = await getBrevoContactId(apiKey, email);
    if (!contact.ok) {
      log('warn', 'brevo_note_failed', { form: noteForm, stage: 'contact_lookup', status: contact.status ?? 0, detail: contact.detail });
      return;
    }

    const note = await createBrevoNote(apiKey, contact.id, buildNoteText(noteForm, 'message', trimmed));
    if (!note.ok) {
      log('warn', 'brevo_note_failed', { form: noteForm, stage: 'create_note', status: note.status ?? 0, detail: note.detail });
      return;
    }

    log('info', 'brevo_note_created', { form: noteForm });
  } catch (err) {
    log('warn', 'brevo_note_failed', {
      form: noteForm,
      stage: 'unexpected',
      detail: err instanceof Error ? err.message : 'unknown',
    });
  }
}

/**
 * Emails the team the moment a contact-form inquiry arrives (both the General
 * and Collaborate tabs) so a new lead is seen without polling Brevo. Reply-to
 * is the person who wrote in, so a reply reaches them directly.
 *
 * Dormant until both CONTACT_NOTIFY_TO (recipient) and CONTACT_NOTIFY_FROM (a
 * verified Brevo sender) are set — mirroring the Turnstile-keys pattern — so no
 * mail is sent in environments that have not opted in. Best-effort and never
 * throws: the contact upsert already succeeded and must not be undone by a
 * notification failure.
 */
async function tryNotifyInquiry(input: ContactInput): Promise<void> {
  try {
    const apiKey = getEnv('BREVO_API_KEY');
    const to = getEnv('CONTACT_NOTIFY_TO');
    const from = getEnv('CONTACT_NOTIFY_FROM');
    if (!apiKey || !to || !from) {
      log('info', 'inquiry_notify_skipped', { form: 'contact', inquiry: input.inquiryType });
      return;
    }

    // CONTACT_NOTIFY_TO may list several recipients, comma-separated, so the
    // team can alert more than one address (e.g. a shared inbox plus a person).
    const recipients = to
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean)
      .map((email) => ({ email }));
    if (recipients.length === 0) {
      log('info', 'inquiry_notify_skipped', { form: 'contact', inquiry: input.inquiryType });
      return;
    }

    const { subject, htmlContent } = buildInquiryEmail({
      inquiryType: input.inquiryType,
      fname: input.fname,
      lname: input.lname,
      email: input.email,
      message: input.message,
      phone: input.phone,
      organization: input.organization,
    });

    const result = await sendBrevoEmail(apiKey, {
      sender: { email: from, name: 'Trash Talk NYC Website' },
      to: recipients,
      replyTo: { email: input.email, name: `${input.fname} ${input.lname}`.trim() },
      subject,
      htmlContent,
    });

    if (!result.ok) {
      log('warn', 'inquiry_notify_failed', {
        form: 'contact',
        inquiry: input.inquiryType,
        status: result.status ?? 0,
        detail: result.detail,
      });
      return;
    }

    log('info', 'inquiry_notify_sent', { form: 'contact', inquiry: input.inquiryType });
  } catch (err) {
    log('warn', 'inquiry_notify_failed', {
      form: 'contact',
      stage: 'unexpected',
      detail: err instanceof Error ? err.message : 'unknown',
    });
  }
}

export const server = {
  signup: defineAction({
    accept: 'form',
    input: signupSchema,
    handler: async (input, ctx) => {
      const dropped = await shouldSilentlyDrop('signup', ctx, {
        botcheck: input.botcheck,
        startedAt: input.startedAt,
        text: input.experience,
      });
      if (dropped) return { ok: true };

      await requireTurnstile('signup', ctx, input['cf-turnstile-response']);

      await upsertOrThrow(
        'signup',
        input.email,
        buildAttributes({
          FIRSTNAME: input.fname,
          LASTNAME: input.lname,
          BOROUGH: input.borough,
          PHONE: input.phone,
          MESSAGE: input.experience,
          HEAR_ABOUT_US: input.hear,
          WAIVER_ACCEPTED: input.waiverCheck === 'on' && input.ageCheck === 'on' ? 'true' : 'false',
        }),
        'BREVO_LIST_ID_SIGNUP',
      );

      await tryCreateNote('signup', input.email, input.experience);

      return { ok: true };
    },
  }),

  contact: defineAction({
    accept: 'form',
    input: contactSchema,
    handler: async (input, ctx) => {
      const dropped = await shouldSilentlyDrop('contact', ctx, {
        botcheck: input.botcheck,
        startedAt: input.startedAt,
        text: input.message,
      });
      if (dropped) return { ok: true };

      await requireTurnstile('contact', ctx, input['cf-turnstile-response']);

      // Each tab routes to its own Brevo list. These env-var names are
      // short (no BREVO_LIST_ID_ prefix) because Netlify rejected the
      // longer names when the captain configured them — keep as-is.
      const listIdVar = input.inquiryType === 'partnership' ? 'CONTACT_COLLAB' : 'CONTACT_GENERAL';

      await upsertOrThrow(
        'contact',
        input.email,
        buildAttributes({
          FIRSTNAME: input.fname,
          LASTNAME: input.lname,
          PHONE: input.phone,
          INQUIRY_TYPE: input.inquiryType,
          ORGANIZATION: input.organization,
          MESSAGE: input.message,
        }),
        listIdVar,
      );

      const noteForm = input.inquiryType === 'partnership' ? 'contact-collab' : 'contact-general';
      await tryCreateNote(noteForm, input.email, input.message);
      await tryNotifyInquiry(input);

      return { ok: true };
    },
  }),

  /**
   * Join the Team applications (About page). Deliberately NOT Brevo —
   * the captain ruled it out for this form — and the final intake
   * destination is still the captain's call (see AGENTS.md). Until then
   * submissions land in the Netlify Blobs holding pen so none are lost.
   *
   * No Turnstile here on purpose: the About page renders no widget, so
   * calling requireTurnstile would hard-reject every join submission the
   * moment real Turnstile keys go live for the other two forms.
   */
  joinTeam: defineAction({
    accept: 'form',
    input: joinTeamSchema,
    handler: async (input, ctx) => {
      const dropped = await shouldSilentlyDrop('join', ctx, {
        botcheck: input.botcheck,
        startedAt: input.startedAt,
        text: input.why,
      });
      if (dropped) return { ok: true };

      const stored = await storeJoinApplicationInBlobs(input);
      if (!stored.ok) {
        // Fail closed: the success screen says the application was saved,
        // so a lost write must surface as an error, not a fake success.
        log('error', 'join_store_failed', { form: 'join', detail: stored.detail });
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
      }

      log('info', 'form_submitted', { form: 'join', role: input.role });
      return { ok: true };
    },
  }),
};
