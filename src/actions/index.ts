import { defineAction, ActionError, type ActionAPIContext } from 'astro:actions';
import { signupSchema, contactSchema } from '../lib/server/schemas';
import { checkSpam, type SpamCheckInput } from '../lib/server/spam';
import { isRateLimitedByBlobs } from '../lib/server/rate-limit';
import { buildAttributes, upsertBrevoContact } from '../lib/server/brevo';

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
          EXPERIENCE: input.experience,
          HEAR_ABOUT: input.hear,
        }),
        'BREVO_LIST_ID_SIGNUP',
      );

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

      await upsertOrThrow(
        'contact',
        input.email,
        buildAttributes({
          FIRSTNAME: input.fname,
          LASTNAME: input.lname,
          INQUIRY_TYPE: input.inquiryType,
          ORGANIZATION: input.organization,
          MESSAGE: input.message,
        }),
        'BREVO_LIST_ID_CONTACT',
      );

      return { ok: true };
    },
  }),
};
