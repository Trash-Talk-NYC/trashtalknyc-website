/**
 * Server-side verification of the NYC addresses the Lead a Cleanup
 * picker offers, against NYC Planning Labs GeoSearch
 * (https://geosearch.planninglabs.nyc — free, no key).
 *
 * The picker submits the chosen feature's `gid` and map point alongside
 * its label, and this module looks that exact feature up again: the
 * stored ROUTE_START/ROUTE_END must be the address the applicant
 * actually picked, never a different "best guess". GeoSearch's
 * /v2/place endpoint rejects its own `nycpad` source ids (HTTP 400,
 * "nycpad is invalid", re-checked 2026-10), so the lookup re-runs the
 * picker's /v2/autocomplete query with the submitted label, confined
 * to a small circle around the submitted point and focused on it, and
 * requires the same gid, the same label, and an NYC locality among the
 * results. Confining it to the point is what keeps an honest pick of a
 * common label (dozens of "CENTRAL PARK" features) from being crowded
 * out of the page by same-named siblings elsewhere in the city; a
 * tampered point simply finds no match.
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
// GeoSearch rejects circle radii under 0.5 km with a parse error.
const GEOSEARCH_LOOKUP_RADIUS_KM = 0.5;

export type GeoVerifyResult =
  | { ok: true; label: string }
  | { ok: false; reason: 'no_match' | 'label_mismatch' | 'outside_nyc' | 'unavailable' };

type GeoSearchFeature = {
  properties?: { gid?: string; label?: string; locality_a?: string; borough?: string };
};

type GeoSearchResponse = { features?: GeoSearchFeature[] };

/** Parses the picker's `lon,lat` point (GeoJSON order); null unless both are in range. */
export function parsePoint(point: string): { lon: number; lat: number } | null {
  const parts = point.trim().split(',');
  if (parts.length !== 2) return null;
  const [lon, lat] = parts.map((part) => (part.trim() === '' ? NaN : Number(part)));
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (Math.abs(lon) > 180 || Math.abs(lat) > 90) return null;
  return { lon, lat };
}

export async function verifyNycAddress(
  label: string,
  featureId: string,
  point: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeoVerifyResult> {
  const wantLabel = label.trim();
  const wantId = featureId.trim();
  const at = parsePoint(point);
  if (!wantLabel || !wantId || !at) return { ok: false, reason: 'no_match' };

  const query = new URLSearchParams({
    text: wantLabel,
    size: String(GEOSEARCH_LOOKUP_SIZE),
    'boundary.circle.lat': String(at.lat),
    'boundary.circle.lon': String(at.lon),
    'boundary.circle.radius': String(GEOSEARCH_LOOKUP_RADIUS_KM),
    'focus.point.lat': String(at.lat),
    'focus.point.lon': String(at.lon),
  });

  let data: GeoSearchResponse;
  try {
    const res = await fetchImpl(
      `${GEOSEARCH_AUTOCOMPLETE_URL}?${query}`,
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
