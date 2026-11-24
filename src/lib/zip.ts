/**
 * US ZIP handling for the newsletter's location flow, shared by the
 * page script (live preview) and the signup action (authoritative
 * re-check). The captain's flow (2026-10-09): a US signup types only a
 * ZIP; city and state come from the ZIP, and an NYC ZIP sets the
 * borough with no borough question.
 *
 * The borough comes from the local table below, never from the lookup
 * service, so NYC detection keeps working when that service is down.
 */

export const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'] as const;

export type Borough = (typeof BOROUGHS)[number];

export const US_ZIP_PATTERN = /^\d{5}$/;

/**
 * NYC ZIP ranges by borough (inclusive). Unassigned numbers inside a
 * range are harmless: the lookup rejects a ZIP that doesn't exist
 * before the borough is ever used. Checked against zippopotam.us
 * (2026-10): 11001 and 11040 are Nassau County and stay out, while
 * 11004/11005 (Glen Oaks / Floral Park, Queens) are in.
 */
const BOROUGH_ZIP_RANGES: ReadonlyArray<readonly [from: number, to: number, borough: Borough]> = [
  [10001, 10292, 'Manhattan'],
  [10301, 10314, 'Staten Island'],
  [10451, 10475, 'The Bronx'],
  [11004, 11005, 'Queens'],
  [11101, 11109, 'Queens'],
  [11201, 11256, 'Brooklyn'],
  [11351, 11499, 'Queens'],
  [11690, 11697, 'Queens'],
];

/** The NYC borough a 5-digit ZIP belongs to, or undefined outside NYC. */
export function boroughForZip(zip: string): Borough | undefined {
  if (!US_ZIP_PATTERN.test(zip)) return undefined;
  const n = Number(zip);
  return BOROUGH_ZIP_RANGES.find(([from, to]) => n >= from && n <= to)?.[2];
}

/** Free, keyless ZIP lookup with permissive CORS (https://api.zippopotam.us). */
export function zipLookupUrl(zip: string): string {
  return `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`;
}

export interface ZipPlace {
  city: string;
  /** Full state name, e.g. "New York" — what STATE_REGION stores. */
  state: string;
  /** Two-letter abbreviation, e.g. "NY" — for the on-page preview. */
  stateCode: string;
}

/** Reads the first place out of a zippopotam.us response; null if the shape is off. */
export function parseZipPlace(data: unknown): ZipPlace | null {
  const place = (data as { places?: Array<Record<string, unknown>> } | null)?.places?.[0];
  const city = place?.['place name'];
  const state = place?.state;
  const stateCode = place?.['state abbreviation'];
  if (typeof city !== 'string' || typeof state !== 'string' || typeof stateCode !== 'string' || !city || !state) {
    return null;
  }
  return { city, state, stateCode };
}
