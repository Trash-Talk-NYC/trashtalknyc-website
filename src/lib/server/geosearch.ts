/**
 * Server-side verification of the NYC addresses the Lead a Cleanup
 * picker offers, against NYC Planning Labs GeoSearch
 * (https://geosearch.planninglabs.nyc — free, no key).
 *
 * The picker submits the chosen feature's `gid` alongside its label,
 * and this module looks that exact feature up again: the stored
 * ROUTE_START/ROUTE_END must be the address the applicant actually
 * picked, never a different "best guess". GeoSearch's /v2/place
 * endpoint rejects its own `nycpad` source ids, so the lookup re-runs
 * the picker's /v2/autocomplete query with the submitted label and
 * requires the same gid, the same label, and an NYC locality among
 * the results.
 *
 * Fails CLOSED in every case — no match, mismatched label, outside
 * NYC, or the service being unreachable — because an address that
 * cannot be verified is not an address the team can plan a route on.
 */

const GEOSEARCH_AUTOCOMPLETE_URL = 'https://geosearch.planninglabs.nyc/v2/autocomplete';
const GEOSEARCH_TIMEOUT_MS = 4000;
// Pelias' maximum page size: identical labels (e.g. "CENTRAL PARK, …")
// can share a query with dozens of sibling features.
const GEOSEARCH_LOOKUP_SIZE = 40;

export type GeoVerifyResult =
  | { ok: true; label: string }
  | { ok: false; reason: 'no_match' | 'label_mismatch' | 'outside_nyc' | 'unavailable' };

type GeoSearchFeature = {
  properties?: { gid?: string; label?: string; locality_a?: string; borough?: string };
};

type GeoSearchResponse = { features?: GeoSearchFeature[] };

export async function verifyNycAddress(
  label: string,
  featureId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoVerifyResult> {
  const wantLabel = label.trim();
  const wantId = featureId.trim();
  if (!wantLabel || !wantId) return { ok: false, reason: 'no_match' };

  let data: GeoSearchResponse;
  try {
    const res = await fetchImpl(
      `${GEOSEARCH_AUTOCOMPLETE_URL}?text=${encodeURIComponent(wantLabel)}&size=${GEOSEARCH_LOOKUP_SIZE}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(GEOSEARCH_TIMEOUT_MS) },
    );
    if (!res.ok) throw new Error(`geosearch_http_${res.status}`);
    data = (await res.json()) as GeoSearchResponse;
  } catch (err) {
    console.warn(
      JSON.stringify({
        evt: 'geosearch_unavailable',
        detail: err instanceof Error ? err.message : 'unknown',
      }),
    );
    return { ok: false, reason: 'unavailable' };
  }

  const feature = data.features?.find((f) => f.properties?.gid === wantId);
  if (!feature?.properties) return { ok: false, reason: 'no_match' };
  const { label: foundLabel, locality_a, borough } = feature.properties;
  if (foundLabel?.trim() !== wantLabel) return { ok: false, reason: 'label_mismatch' };
  if (locality_a !== 'NYC' || !borough) return { ok: false, reason: 'outside_nyc' };
  return { ok: true, label: foundLabel.trim() };
}
