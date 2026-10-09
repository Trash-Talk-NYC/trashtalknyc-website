import { US_COUNTRY } from '../countries';
import { boroughForZip, type Borough } from '../zip';
import { lookupUsZip, type ZipLookupResult } from './zip';

export interface SignupLocationInput {
  country: string;
  zip?: string;
  city?: string;
  region?: string;
  postal?: string;
}

/** The Brevo location attributes a signup lands with. */
export interface SignupLocation {
  COUNTRY: string;
  STATE_REGION?: string;
  CITY?: string;
  ZIP_CODE?: string;
  /** Only for NYC ZIPs — one of the five borough names. */
  BOROUGH?: Borough;
}

export type ResolveLocationResult =
  | { ok: true; location: SignupLocation; zipLookup: ZipLookupResult['status'] | 'not_us' }
  | { ok: false; reason: 'zip_not_found' };

/**
 * Turns the submitted location fields into Brevo attributes. For the US
 * the server never trusts client-sent city/state: it re-looks-up the
 * ZIP and derives the borough from its own table. When the lookup
 * service is unavailable the signup still lands, with COUNTRY, ZIP, and
 * (for NYC) BOROUGH — only a ZIP that provably doesn't exist is refused.
 */
export async function resolveSignupLocation(
  input: SignupLocationInput,
  lookup: (zip: string) => Promise<ZipLookupResult> = lookupUsZip,
): Promise<ResolveLocationResult> {
  if (input.country !== US_COUNTRY) {
    return {
      ok: true,
      zipLookup: 'not_us',
      location: {
        COUNTRY: input.country,
        CITY: input.city,
        STATE_REGION: input.region,
        ZIP_CODE: input.postal,
      },
    };
  }

  const zip = input.zip ?? '';
  const result = await lookup(zip);
  if (result.status === 'not_found') return { ok: false, reason: 'zip_not_found' };

  return {
    ok: true,
    zipLookup: result.status,
    location: {
      COUNTRY: US_COUNTRY,
      CITY: result.status === 'found' ? result.place.city : undefined,
      STATE_REGION: result.status === 'found' ? result.place.state : undefined,
      ZIP_CODE: zip,
      BOROUGH: boroughForZip(zip),
    },
  };
}
