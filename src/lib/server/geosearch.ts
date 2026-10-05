/**
 * Server-side re-validation of NYC addresses against NYC Planning
 * Labs GeoSearch (https://geosearch.planninglabs.nyc — free, no key),
 * the same service the Lead a Cleanup form's address picker queries
 * client-side. The client already forces picking a real suggestion;
 * this re-check stops hand-crafted submissions that bypass the page.
 *
 * Fails CLOSED on "no match" (the address is the point of the form)
 * but OPEN on network trouble, mirroring the rate limiter: a
 * GeoSearch outage must not block real applications, and the team
 * reviews every application by hand anyway.
 */

const GEOSEARCH_SEARCH_URL = 'https://geosearch.planninglabs.nyc/v2/search';
const GEOSEARCH_TIMEOUT_MS = 4000;

export type GeoVerifyResult =
  | { ok: true; label: string }
  | { ok: false; reason: 'no_match' }
  | { ok: true; label: string; unverified: true };

type GeoSearchResponse = {
  features?: Array<{ properties?: { label?: string } }>;
};

export async function verifyNycAddress(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoVerifyResult> {
  const query = text.trim();
  let res: Response;
  try {
    res = await fetchImpl(
      `${GEOSEARCH_SEARCH_URL}?text=${encodeURIComponent(query)}&size=1`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(GEOSEARCH_TIMEOUT_MS) },
    );
    if (!res.ok) throw new Error(`geosearch_http_${res.status}`);
    const data = (await res.json()) as GeoSearchResponse;
    const label = data.features?.[0]?.properties?.label;
    if (!label) return { ok: false, reason: 'no_match' };
    return { ok: true, label };
  } catch (err) {
    console.warn(
      JSON.stringify({
        evt: 'geosearch_unavailable',
        detail: err instanceof Error ? err.message : 'unknown',
      }),
    );
    // Service trouble — keep the submitted text, marked unverified.
    return { ok: true, label: query, unverified: true };
  }
}
