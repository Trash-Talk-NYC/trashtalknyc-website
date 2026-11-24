import { describe, expect, it, vi } from 'vitest';
import { resolveSignupLocation } from '../location';
import { lookupUsZip, type ZipLookupResult } from '../zip';

const found = (city: string, state = 'New York', stateCode = 'NY'): ZipLookupResult => ({
  status: 'found',
  place: { city, state, stateCode },
});

describe('resolveSignupLocation', () => {
  it('derives city, state, and borough for an NYC ZIP', async () => {
    const result = await resolveSignupLocation({ country: 'United States', zip: '11368' }, async () => found('Corona'));
    expect(result).toEqual({
      ok: true,
      zipLookup: 'found',
      location: { COUNTRY: 'United States', CITY: 'Corona', STATE_REGION: 'New York', ZIP_CODE: '11368', BOROUGH: 'Queens' },
    });
  });

  it('sends no borough for a US ZIP outside NYC', async () => {
    const result = await resolveSignupLocation({ country: 'United States', zip: '07030' }, async () =>
      found('Hoboken', 'New Jersey', 'NJ'),
    );
    expect(result.ok && result.location).toEqual({
      COUNTRY: 'United States',
      CITY: 'Hoboken',
      STATE_REGION: 'New Jersey',
      ZIP_CODE: '07030',
      BOROUGH: undefined,
    });
  });

  it('ignores client-sent city and region for a US signup', async () => {
    const result = await resolveSignupLocation(
      { country: 'United States', zip: '11211', city: 'Paris', region: 'Texas' },
      async () => found('Brooklyn'),
    );
    expect(result.ok && result.location.CITY).toBe('Brooklyn');
    expect(result.ok && result.location.STATE_REGION).toBe('New York');
  });

  it('refuses a ZIP that does not exist', async () => {
    const result = await resolveSignupLocation({ country: 'United States', zip: '00000' }, async () => ({
      status: 'not_found',
    }));
    expect(result).toEqual({ ok: false, reason: 'zip_not_found' });
  });

  it('still lands the signup (with the borough) when the lookup is down', async () => {
    const result = await resolveSignupLocation({ country: 'United States', zip: '10451' }, async () => ({
      status: 'unavailable',
    }));
    expect(result).toEqual({
      ok: true,
      zipLookup: 'unavailable',
      location: { COUNTRY: 'United States', CITY: undefined, STATE_REGION: undefined, ZIP_CODE: '10451', BOROUGH: 'The Bronx' },
    });
  });

  it('passes an outside-US location through without a lookup', async () => {
    const lookup = vi.fn();
    const result = await resolveSignupLocation(
      { country: 'Canada', city: 'Toronto, Ontario', region: 'Ontario', postal: 'M5V 2T6' },
      lookup,
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      zipLookup: 'not_us',
      location: { COUNTRY: 'Canada', CITY: 'Toronto, Ontario', STATE_REGION: 'Ontario', ZIP_CODE: 'M5V 2T6' },
    });
  });
});

describe('lookupUsZip', () => {
  const respond = (status: number, body: unknown = {}) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('returns the place for a known ZIP', async () => {
    const body = { places: [{ 'place name': 'Brooklyn', state: 'New York', 'state abbreviation': 'NY' }] };
    expect(await lookupUsZip('11211', respond(200, body))).toEqual(found('Brooklyn'));
  });

  it('maps 404 to not_found', async () => {
    expect(await lookupUsZip('00000', respond(404))).toEqual({ status: 'not_found' });
  });

  it('maps server errors, odd payloads, and network failures to unavailable', async () => {
    expect(await lookupUsZip('11211', respond(503))).toEqual({ status: 'unavailable' });
    expect(await lookupUsZip('11211', respond(200, { nope: true }))).toEqual({ status: 'unavailable' });
    const failing = vi.fn(async () => {
      throw new TypeError('network');
    }) as unknown as typeof fetch;
    expect(await lookupUsZip('11211', failing)).toEqual({ status: 'unavailable' });
  });
});
