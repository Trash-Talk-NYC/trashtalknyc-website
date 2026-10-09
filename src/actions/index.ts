import { defineAction, ActionError, ActionInputError, type ActionAPIContext } from 'astro:actions';
import { signupSchema, contactSchema, leadSchema, type ContactInput } from '../lib/server/schemas';
import { resolveSignupLocation } from '../lib/server/location';
import { ADDRESS_UNAVAILABLE, ADDRESS_UNVERIFIED } from '../lib/addressErrors';
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
 * HEAR_ABOUT_US choices that may not exist in Brevo yet (the attribute
 * is multiple-choice, and these options plus the HEAR_ABOUT_US_OTHER
 * text attribute must be added in the Brevo dashboard). Until then,
 * payloads carrying them are rejected wholesale — the signup fallback
 * below strips them and preserves the answer as a CRM note instead.
 */
const PENDING_HEAR_VALUES = ['Article', 'Somewhere else'];

/** The HEAR_ABOUT_US choice that carries the free-text companion. */
const HEAR_SOMEWHERE_ELSE = 'Somewhere else';

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

/**
 * Verifies one picked route address, throwing a field-level input error
 * (whose message the page maps onto that picker) when it can't be.
 */
async function verifyAddressField(
  field: 'startAddress' | 'endAddress',
  label: string,
  featureId: string,
  point: string,
): Promise<Extract<GeoVerifyResult, { ok: true }>> {
  const verified = await verifyNycAddress(label, featureId, point);
  if (verified.ok) return verified;
  log('warn', 'form_address_rejected', { form: 'lead', field, reason: verified.reason });
  throw new ActionInputError([
    {
      code: 'custom',
      path: [field],
      message: verified.reason === 'unavailable' ? ADDRESS_UNAVAILABLE : ADDRESS_UNVERIFIED,
    },
  ]);
}

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
 * Signup upsert that tolerates Brevo not knowing the new HEAR_ABOUT_US
 * material yet (see PENDING_HEAR_VALUES): a rejected payload carrying
 * any of it is retried once without those fields, so the signup is
 * never lost to dashboard lag. Returns true when the stripped retry
 * landed — the caller must then preserve the answer as a CRM note.
 */
async function upsertSignupWithHearFallback(
  email: string,
  attributes: Record<string, string>,
  target: BrevoTarget,
): Promise<boolean> {
  const pendingKeys = [
    ...(PENDING_HEAR_VALUES.includes(attributes.HEAR_ABOUT_US ?? '') ? ['HEAR_ABOUT_US'] : []),
    ...('HEAR_ABOUT_US_OTHER' in attributes ? ['HEAR_ABOUT_US_OTHER'] : []),
  ];

  const result = await upsertBrevoContact(target.apiKey, { email, attributes, listId: target.listId });
  if (result.ok) {
    log('info', 'form_submitted', { form: 'signup' });
    return false;
  }
  if (pendingKeys.length === 0) {
    log('error', 'brevo_upsert_failed', { form: 'signup', status: result.status ?? 0, detail: result.detail });
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
  }

  log('warn', 'brevo_hear_attrs_rejected', {
    form: 'signup',
    status: result.status ?? 0,
    detail: result.detail,
    stripped: pendingKeys.join(','),
  });
  const stripped = { ...attributes };
  for (const key of pendingKeys) delete stripped[key];

  const retried = await upsertBrevoContact(target.apiKey, { email, attributes: stripped, listId: target.listId });
  if (!retried.ok) {
    log('error', 'brevo_upsert_failed', { form: 'signup', status: retried.status ?? 0, detail: retried.detail });
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: GENERIC_FAILURE });
  }

  log('info', 'form_submitted', { form: 'signup' });
  return true;
}

/**
 * Records the free-text field as a Brevo CRM note so the full submission
 * history survives (the MESSAGE attribute only keeps the latest value).
 * Best-effort: a note failure is logged but never fails the submission —
 * the contact upsert already succeeded. Resolves true only when the note
 * was created.
 */
async function tryCreateNote(noteForm: string, email: string, content: string | undefined, field = 'message'): Promise<boolean> {
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

    const note = await createBrevoNote(apiKey, contact.id, buildNoteText(noteForm, field, trimmed));
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

      // Country-first location (captain, 2026-10-09). A US ZIP is re-looked-
      // up here (the page's preview is never trusted) and an NYC ZIP sets
      // BOROUGH from our own table; a ZIP that doesn't exist is refused,
      // but a lookup outage still lets the signup land with the ZIP alone.
      const resolved = await resolveSignupLocation(input);
      if (!resolved.ok) {
        log('warn', 'form_zip_rejected', { form: 'signup' });
        throw new ActionInputError([{ code: 'custom', path: ['zip'], message: "We couldn't find that ZIP code" }]);
      }
      if (resolved.zipLookup === 'unavailable') log('warn', 'signup_zip_lookup_unavailable', { form: 'signup' });
      const { location } = resolved;

      // The free-text companion belongs to "Somewhere else" only; a
      // stale hidden field must never attach it to another choice.
      const hearOther = input.hear === HEAR_SOMEWHERE_ELSE ? input.hearOther : undefined;

      const hearNoteNeeded = await upsertSignupWithHearFallback(
        input.email,
        buildAttributes({
          FIRSTNAME: input.fname,
          LASTNAME: input.lname,
          COUNTRY: location.COUNTRY,
          STATE_REGION: location.STATE_REGION,
          CITY: location.CITY,
          ZIP_CODE: location.ZIP_CODE,
          BOROUGH: location.BOROUGH,
          PHONE: input.phone,
          MESSAGE: input.experience,
          HEAR_ABOUT_US: input.hear,
          HEAR_ABOUT_US_OTHER: hearOther,
          WAIVER_ACCEPTED: input.waiverCheck === 'on' && input.ageCheck === 'on' ? 'true' : 'false',
        }),
        requireBrevoTarget('signup', 'BREVO_LIST_ID_SIGNUP'),
      );

      await tryCreateNote('signup', input.email, input.experience);
      if (hearNoteNeeded) {
        const hearAnswer = hearOther ? `${input.hear} — ${hearOther}` : input.hear;
        await tryCreateNote('signup', input.email, hearAnswer, 'hear');
      }

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

      // Re-verify the exact GeoSearch features the picker submitted. Any
      // address that cannot be verified (bypassed picker, mismatched
      // label, outside NYC, or GeoSearch unreachable) rejects the
      // application rather than storing an unchecked or substituted one,
      // as an error on that address field so the applicant knows to
      // re-pick it (or retry, when the map service is down).
      const start = await verifyAddressField('startAddress', input.startAddress, input.startAddressId, input.startAddressPoint);
      const end =
        input.routeType === 'oneway'
          ? await verifyAddressField('endAddress', input.endAddress ?? '', input.endAddressId ?? '', input.endAddressPoint ?? '')
          : undefined;

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
        `Route: ${input.routeType === 'loop' ? 'Loop' : 'One-way'} — start: ${start.label}${end ? ` — end: ${end.label}` : ''}`,
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
