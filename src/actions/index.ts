import { defineAction, ActionError, type ActionAPIContext } from 'astro:actions';
import { signupSchema, contactSchema } from '../lib/server/schemas';
import { checkSpam, type SpamCheckInput } from '../lib/server/spam';
import { isRateLimitedByBlobs } from '../lib/server/rate-limit';
import {
  buildAttributes,
  buildNoteText,
  createBrevoNote,
  getBrevoContactId,
  upsertBrevoContact,
} from '../lib/server/brevo';

/**
 * Server actions for the two site forms. Flow per submission:
 * spam heuristics → per-IP rate limit → env check → Brevo contact upsert.
 *
 * Log lines are structured JSON (Netlify captures stdout/stderr) and
 * deliberately exclude API keys and submitted PII.
 */

type FormName = 'signup' | 'contact';

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
          // Both waiver checkboxes are client-required to submit at all,
          // so reaching this handler implies acceptance
          WAIVER_ACCEPTED: 'true',
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

      return { ok: true };
    },
  }),
};
