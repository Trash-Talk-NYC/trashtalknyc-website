/**
 * Minimal Brevo Contacts API client. Deliberately a raw fetch() — the
 * @getbrevo/brevo SDK would add a dependency for one endpoint.
 *
 * NOTE for go-live: the custom attributes sent here (BOROUGH, PHONE,
 * EXPERIENCE, HEAR_ABOUT, ORGANIZATION, MESSAGE, INQUIRY_TYPE) must be
 * created as contact attributes in the Brevo dashboard first, or Brevo
 * will reject the payload.
 */

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';

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
  let res: Response;
  try {
    res = await fetch(BREVO_CONTACTS_URL, {
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
    });
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'network error' };
  }

  // 201 = created, 204 = updated existing contact
  if (res.ok) return { ok: true };

  // Surface Brevo's error `code` (e.g. "duplicate_parameter") but not the
  // full body, which echoes back submitted contact data.
  let code = 'unknown';
  try {
    const body = (await res.json()) as { code?: string };
    if (body.code) code = body.code;
  } catch {
    // Non-JSON error body — status alone will have to do
  }
  return { ok: false, status: res.status, detail: code };
}
