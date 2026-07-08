/**
 * Minimal Brevo API client (contacts upsert + CRM notes). Deliberately
 * raw fetch() — the @getbrevo/brevo SDK would add a dependency for a
 * couple of endpoints.
 *
 * The custom attributes sent here (BOROUGH, PHONE, HEAR_ABOUT_US,
 * WAIVER_ACCEPTED, ORGANIZATION, MESSAGE, INQUIRY_TYPE) exist live in
 * Brevo; adding a new one requires creating it in the Brevo dashboard
 * first or Brevo rejects the payload. (EXPERIENCE is dormant — kept in
 * Brevo for historical contacts, no longer written.)
 */

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';
const BREVO_NOTES_URL = 'https://api.brevo.com/v3/crm/notes';

// The action runs in a synchronous Netlify function with a 10s budget and
// makes up to three sequential Brevo calls; without timeouts one hung
// connection eats the whole budget. The upsert (the call that must not lose
// a signup) gets the larger share; the best-effort note flow gets less.
const UPSERT_TIMEOUT_MS = 5000;
const NOTE_TIMEOUT_MS = 3000;

// Brevo allows 10 req/s on non-enterprise plans, so a viral-post burst can
// 429 the upsert and lose a signup. One retry (bounded so two attempts plus
// the wait still fit the function budget) turns most of those into slightly
// slower successes.
const RETRY_DELAY_CAP_MS = 2000;
const RETRY_FALLBACK_DELAY_MS = 1000;

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryDelayMs(res: Response): number {
  const raw = res.headers.get('retry-after');
  const seconds = raw === null ? NaN : Number(raw);
  // HTTP-date Retry-After values parse as NaN and fall through to the
  // jittered fallback rather than being honored — acceptable for one retry.
  const base = Number.isFinite(seconds) && seconds >= 0
    ? seconds * 1000
    : RETRY_FALLBACK_DELAY_MS + Math.random() * 250;
  return Math.min(base, RETRY_DELAY_CAP_MS);
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export interface BrevoUpsert {
  email: string;
  attributes: Record<string, string>;
  listId: number;
}

export type BrevoResult = { ok: true } | { ok: false; status?: number; detail: string };

/** Drop empty-string attributes so Brevo doesn't blank existing values on update. */
export function buildAttributes(fields: Record<string, string | undefined>): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const trimmed = value?.trim();
    if (trimmed) attributes[key] = trimmed;
  }
  return attributes;
}

export async function upsertBrevoContact(apiKey: string, contact: BrevoUpsert): Promise<BrevoResult> {
  const attempt = () =>
    fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: contact.email,
        attributes: contact.attributes,
        listIds: [contact.listId],
        updateEnabled: true,
      }),
      signal: AbortSignal.timeout(UPSERT_TIMEOUT_MS),
    });

  let res: Response;
  try {
    res = await attempt();
    if (isRetryable(res.status)) {
      await sleep(retryDelayMs(res));
      res = await attempt();
    }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'network error' };
  }

  // 201 = created, 204 = updated existing contact
  if (res.ok) return { ok: true };

  return { ok: false, status: res.status, detail: await errorCode(res) };
}

/**
 * Note text with a queryable header so submissions can be filtered in
 * Brevo later: `form=… | field=… | submitted=<ISO>` then the raw content.
 */
export function buildNoteText(form: string, field: string, content: string, submittedAt: Date = new Date()): string {
  return `form=${form} | field=${field} | submitted=${submittedAt.toISOString()}\n—\n${content}`;
}

export type BrevoContactIdResult = { ok: true; id: number } | { ok: false; status?: number; detail: string };

/** Looks up the numeric Brevo contact id — needed to attach CRM notes. */
export async function getBrevoContactId(apiKey: string, email: string): Promise<BrevoContactIdResult> {
  let res: Response;
  try {
    res = await fetch(`${BREVO_CONTACTS_URL}/${encodeURIComponent(email)}`, {
      headers: { 'api-key': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(NOTE_TIMEOUT_MS),
    });
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'network error' };
  }

  if (!res.ok) return { ok: false, status: res.status, detail: await errorCode(res) };

  let body: { id?: number };
  try {
    body = (await res.json()) as { id?: number };
  } catch {
    return { ok: false, status: res.status, detail: 'invalid_json' };
  }
  if (typeof body.id !== 'number') return { ok: false, status: res.status, detail: 'missing_contact_id' };
  return { ok: true, id: body.id };
}

/**
 * Attaches a CRM note to a contact. Notes preserve full submission
 * history; the MESSAGE attribute alone only keeps the latest value.
 */
export async function createBrevoNote(apiKey: string, contactId: number, text: string): Promise<BrevoResult> {
  let res: Response;
  try {
    res = await fetch(BREVO_NOTES_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ text, contactIds: [contactId] }),
      signal: AbortSignal.timeout(NOTE_TIMEOUT_MS),
    });
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'network error' };
  }

  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, detail: await errorCode(res) };
}

/**
 * Extracts Brevo's error `code` (e.g. "duplicate_parameter") but not the
 * full body, which echoes back submitted contact data.
 */
async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: string };
    if (body.code) return body.code;
  } catch {
    // Non-JSON error body — status alone will have to do
  }
  return 'unknown';
}
