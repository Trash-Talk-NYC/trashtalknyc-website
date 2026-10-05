import { defineAction, ActionError, type ActionAPIContext } from 'astro:actions';
import { signupSchema, contactSchema, leadSchema, NOT_IN_NYC, type ContactInput } from '../lib/server/schemas';
import { checkSpam, type SpamCheckInput } from '../lib/server/spam';
import { isRateLimitedByBlobs } from '../lib/server/rate-limit';
import { verifyTurnstileToken } from '../lib/server/turnstile';
import { verifyNycAddress, type GeoVerifyResult } from '../lib/server/geosearch';
import { MAX_PHOTOS, deleteLeadPhotos, processPhoto, storeLeadPhotos } from '../lib/server/photos';
import {
  buildAttributes,
  buildInquiryEmail,
  buildNoteText,
  createBrevoNote,
  getBrevoContactId,
  sendBrevoEmail,
  upsertBrevoContact,
  type InquiryEmailInput,
} from '../lib/server/brevo';

/**
 * Server actions for the site forms. Flow per submission:
 * spam heuristics → per-IP rate limit → Turnstile verification →
 * env check → Brevo contact upsert.
 *
 * Log lines are structured JSON (Netlify captures stdout/stderr) and
 * deliberately exclude API keys and submitted PII.
 */

type FormName = 'signup' | 'contact' | 'lead';

const GENERIC_FAILURE = 'Something went wrong. Please try again.';

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
      message: 'Too many submissions. Please wait a few minutes and try again.',
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

interface BrevoTarget {
  apiKey: string;
  listId: number;
}

/**
 * Resolves the Brevo key and list for a form, failing closed when either
 * is missing or invalid. Separate from the upsert so a form with side
 * effects before the upsert (lead photos) can check its env first.
 */
function requireBrevoTarget(form: FormName, listIdVar: string): BrevoTarget {
  const apiKey = requireEnv('BREVO_API_KEY', form);
  const listId = Number(requireEnv(listIdVar, form));
  if (!Number.isFinite(listId) || listId <= 0) {
    log('error', 'form_env_invalid', { form, var: listIdVar });
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
  }
  return { apiKey, listId };
}

async function upsertOrThrow(
  form: FormName,
  email: string,
  attributes: Record<string, string>,
  { apiKey, listId }: BrevoTarget,
): Promise<void> {
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
 * the contact upsert already succeeded. Resolves true only when the note
 * was created.
 */
async function tryCreateNote(noteForm: string, email: string, content: string | undefined): Promise<boolean> {
  // Outer guard: the contact upsert already succeeded, so nothing in the
  // note flow — including bugs — may fail the user's submission.
  try {
    const trimmed = content?.trim();
    if (!trimmed) return false;

    const apiKey = getEnv('BREVO_API_KEY');
    if (!apiKey) return false; // upsert would have thrown already; belt and braces

    const contact = await getBrevoContactId(apiKey, email);
    if (!contact.ok) {
      log('warn', 'brevo_note_failed', { form: noteForm, stage: 'contact_lookup', status: contact.status ?? 0, detail: contact.detail });
      return false;
    }

    const note = await createBrevoNote(apiKey, contact.id, buildNoteText(noteForm, 'message', trimmed));
    if (!note.ok) {
      log('warn', 'brevo_note_failed', { form: noteForm, stage: 'create_note', status: note.status ?? 0, detail: note.detail });
      return false;
    }

    log('info', 'brevo_note_created', { form: noteForm });
    return true;
  } catch (err) {
    log('warn', 'brevo_note_failed', {
      form: noteForm,
      stage: 'unexpected',
      detail: err instanceof Error ? err.message : 'unknown',
    });
    return false;
  }
}

/**
 * Emails the team the moment a contact-form inquiry arrives (every tab) so a
 * new lead is seen without polling Brevo. Reply-to is the person who wrote
 * in, so a reply reaches them directly. Sponsor inquiries notify the
 * sponsorship inbox (SPONSOR_NOTIFY_TO) instead of the general team address —
 * with no fallback between the two, so a misroute is impossible.
 *
 * Dormant until both the tab's recipient var and CONTACT_NOTIFY_FROM (a
 * verified Brevo sender) are set — mirroring the Turnstile-keys pattern — so no
 * mail is sent in environments that have not opted in. Best-effort and never
 * throws: the contact upsert already succeeded and must not be undone by a
 * notification failure.
 */
async function tryNotifyInquiry(input: InquiryEmailInput): Promise<void> {
  const form: FormName = input.inquiryType === 'lead' ? 'lead' : 'contact';
  try {
    const apiKey = getEnv('BREVO_API_KEY');
    const to = getEnv(input.inquiryType === 'sponsor' ? 'SPONSOR_NOTIFY_TO' : 'CONTACT_NOTIFY_TO');
    const from = getEnv('CONTACT_NOTIFY_FROM');
    if (!apiKey || !to || !from) {
      log('info', 'inquiry_notify_skipped', { form, inquiry: input.inquiryType });
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
      log('info', 'inquiry_notify_skipped', { form, inquiry: input.inquiryType });
      return;
    }

    const { subject, htmlContent } = buildInquiryEmail(input);

    const result = await sendBrevoEmail(apiKey, {
      sender: { email: from, name: 'Trash Talk NYC Website' },
      to: recipients,
      replyTo: { email: input.email, name: `${input.fname} ${input.lname}`.trim() },
      subject,
      htmlContent,
    });

    if (!result.ok) {
      log('warn', 'inquiry_notify_failed', {
        form,
        inquiry: input.inquiryType,
        status: result.status ?? 0,
        detail: result.detail,
      });
      return;
    }

    log('info', 'inquiry_notify_sent', { form, inquiry: input.inquiryType });
  } catch (err) {
    log('warn', 'inquiry_notify_failed', {
      form,
      stage: 'unexpected',
      detail: err instanceof Error ? err.message : 'unknown',
    });
  }
}

/** Marks addresses GeoSearch could not check (service outage) so the team knows to verify them by hand. */
function noteAddress(result: Extract<GeoVerifyResult, { ok: true }>): string {
  return 'unverified' in result ? `${result.label} (unverified: map lookup was unavailable)` : result.label;
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

      // Outside-NYC signups: BOROUGH is omitted (its live option set may
      // not include "Not in NYC") and the location lands in the COUNTRY /
      // CITY / ZIP_CODE attributes instead — COUNTRY present exactly when
      // BOROUGH is absent, so the two states stay distinguishable.
      const outsideNyc = input.borough === NOT_IN_NYC;

      await upsertOrThrow(
        'signup',
        input.email,
        buildAttributes({
          FIRSTNAME: input.fname,
          LASTNAME: input.lname,
          BOROUGH: outsideNyc ? undefined : input.borough,
          COUNTRY: outsideNyc ? input.country : undefined,
          CITY: outsideNyc ? input.city : undefined,
          ZIP_CODE: outsideNyc ? input.zip : undefined,
          PHONE: input.phone,
          MESSAGE: input.experience,
          HEAR_ABOUT_US: input.hear,
          WAIVER_ACCEPTED: input.waiverCheck === 'on' && input.ageCheck === 'on' ? 'true' : 'false',
        }),
        requireBrevoTarget('signup', 'BREVO_LIST_ID_SIGNUP'),
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
      const listIdVars: Record<ContactInput['inquiryType'], string> = {
        general: 'CONTACT_GENERAL',
        partnership: 'CONTACT_COLLAB',
        sponsor: 'CONTACT_SPONSOR',
      };
      const listIdVar = listIdVars[input.inquiryType];

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
        requireBrevoTarget('contact', listIdVar),
      );

      const noteForms: Record<ContactInput['inquiryType'], string> = {
        general: 'contact-general',
        partnership: 'contact-collab',
        sponsor: 'contact-sponsor',
      };
      const noteForm = noteForms[input.inquiryType];
      await tryCreateNote(noteForm, input.email, input.message);
      await tryNotifyInquiry(input);

      return { ok: true };
    },
  }),

  leadCleanup: defineAction({
    accept: 'form',
    input: leadSchema,
    handler: async (input, ctx) => {
      const dropped = await shouldSilentlyDrop('lead', ctx, {
        botcheck: input.botcheck,
        startedAt: input.startedAt,
      });
      if (dropped) return { ok: true };

      await requireTurnstile('lead', ctx, input['cf-turnstile-response']);

      const brevo = requireBrevoTarget('lead', 'BREVO_LIST_ID_LEADS');

      // Re-verify the route addresses against NYC GeoSearch — the page's
      // picker already forces choosing a real suggestion, so a no-match
      // here is a bypassed client, not a typo. The verified label (when
      // available) is what gets stored.
      const start = await verifyNycAddress(input.startAddress);
      if (!start.ok) {
        log('warn', 'form_address_rejected', { form: 'lead', field: 'startAddress' });
        throw new ActionError({ code: 'BAD_REQUEST', message: GENERIC_FAILURE });
      }
      let end: Extract<GeoVerifyResult, { ok: true }> | undefined;
      if (input.routeType === 'oneway') {
        const verified = await verifyNycAddress(input.endAddress ?? '');
        if (!verified.ok) {
          log('warn', 'form_address_rejected', { form: 'lead', field: 'endAddress' });
          throw new ActionError({ code: 'BAD_REQUEST', message: GENERIC_FAILURE });
        }
        end = verified;
      }

      // Route photos: content-validated, re-encoded (metadata including
      // GPS stripped), stored privately under random keys. File inputs
      // submit one empty File when nothing was chosen — drop those first.
      const files = (input.photos ?? []).filter((f) => f.size > 0);
      if (files.length > MAX_PHOTOS) {
        log('warn', 'lead_photos_rejected', { form: 'lead', reason: 'too_many', count: files.length });
        throw new ActionError({ code: 'BAD_REQUEST', message: GENERIC_FAILURE });
      }
      const jpegs: Buffer[] = [];
      for (const file of files) {
        const result = await processPhoto(new Uint8Array(await file.arrayBuffer()));
        if (!result.ok) {
          log('warn', 'lead_photos_rejected', { form: 'lead', reason: result.error });
          throw new ActionError({ code: 'BAD_REQUEST', message: GENERIC_FAILURE });
        }
        jpegs.push(result.jpeg);
      }
      let photoKeys: string[] = [];
      if (jpegs.length > 0) {
        const stored = await storeLeadPhotos(jpegs);
        if (!stored.ok) {
          // The applicant believes the photos were sent — failing loudly
          // beats silently dropping attachments.
          log('error', 'lead_photo_store_failed', { form: 'lead', detail: stored.detail });
          throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
        }
        photoKeys = stored.keys;
      }

      try {
        await upsertOrThrow(
          'lead',
          input.email,
          buildAttributes({
            FIRSTNAME: input.fname,
            LASTNAME: input.lname,
            PHONE: input.phone,
            INQUIRY_TYPE: 'lead',
            LEAD_BEHALF: input.behalf,
            MAILING_ADDRESS: input.mailingAddress,
            ROUTE_TYPE: input.routeType,
            ROUTE_START: start.label,
            ROUTE_END: end?.label,
            PREFERRED_MONTH: input.preferredMonth,
          }),
          brevo,
        );
      } catch (err) {
        const { failed } = await deleteLeadPhotos(photoKeys);
        if (failed > 0) log('error', 'lead_photo_cleanup_failed', { form: 'lead', count: failed });
        throw err;
      }

      // The CRM note preserves the full application (attributes are
      // last-write-wins), including where the private photos live.
      const noteLines = [
        `Applying on behalf of: ${input.behalf}`,
        `Mailing address: ${input.mailingAddress}`,
        `Route: ${input.routeType === 'loop' ? 'Loop' : 'One-way'} — start: ${noteAddress(start)}${end ? ` — end: ${noteAddress(end)}` : ''}`,
        `Preferred month: ${input.preferredMonth}`,
        photoKeys.length > 0
          ? `Photos (${photoKeys.length}, private Blobs store lead-route-photos): ${photoKeys.join(', ')}`
          : 'Photos: none attached',
      ];
      const noted = await tryCreateNote('contact-lead', input.email, noteLines.join('\n'));
      if (!noted && photoKeys.length > 0) {
        log('warn', 'lead_photo_keys_unrecorded', { form: 'lead', keys: photoKeys.join(', ') });
      }

      await tryNotifyInquiry({
        inquiryType: 'lead',
        fname: input.fname,
        lname: input.lname,
        email: input.email,
        phone: input.phone,
        message: noteLines.join('\n'),
        extraRows: [['Preferred month', input.preferredMonth]],
      });

      return { ok: true };
    },
  }),
};
