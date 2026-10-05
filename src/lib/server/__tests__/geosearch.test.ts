import { describe, expect, it } from 'vitest';
import { verifyNycAddress } from '../geosearch';

function fakeFetch(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
}

describe('verifyNycAddress', () => {
  it('returns the canonical label when GeoSearch finds the address', async () => {
    const result = await verifyNycAddress(
      '708 W 171st St',
      fakeFetch({ features: [{ properties: { label: '708 West 171st Street, Manhattan, NY, USA' } }] }),
    );
    expect(result).toEqual({ ok: true, label: '708 West 171st Street, Manhattan, NY, USA' });
  });

  it('fails CLOSED when GeoSearch has no match', async () => {
    const result = await verifyNycAddress('123 Nowhere Lane, Mars', fakeFetch({ features: [] }));
    expect(result).toEqual({ ok: false, reason: 'no_match' });
  });

  it('fails OPEN (keeps the submitted text, marked unverified) when the service errors', async () => {
    const result = await verifyNycAddress('708 W 171st St', fakeFetch({}, 503));
    expect(result).toEqual({ ok: true, label: '708 W 171st St', unverified: true });
  });

  it('fails OPEN on network failure', async () => {
    const failing = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const result = await verifyNycAddress('708 W 171st St', failing);
    expect(result).toEqual({ ok: true, label: '708 W 171st St', unverified: true });
  });
});
