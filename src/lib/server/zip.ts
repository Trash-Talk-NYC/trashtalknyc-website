import { parseZipPlace, zipLookupUrl, type ZipPlace } from '../zip';

export type ZipLookupResult =
  | { status: 'found'; place: ZipPlace }
  | { status: 'not_found' }
  | { status: 'unavailable' };

const LOOKUP_TIMEOUT_MS = 4000;

/**
 * Server-side re-check of a signup's ZIP against zippopotam.us. A 404
 * means the ZIP doesn't exist; anything else that goes wrong (outage,
 * timeout, odd payload) is "unavailable", and the caller lets the
 * signup through with the ZIP alone rather than losing it.
 */
export async function lookupUsZip(zip: string, fetchImpl: typeof fetch = fetch): Promise<ZipLookupResult> {
  try {
    const res = await fetchImpl(zipLookupUrl(zip), { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'unavailable' };
    const place = parseZipPlace(await res.json());
    return place ? { status: 'found', place } : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}
