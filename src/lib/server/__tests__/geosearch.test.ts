import { describe, expect, it, vi } from 'vitest';
import { parsePoint, verifyNycAddress } from '../geosearch';

const LABEL = '708 WEST 171 STREET, New York, NY, USA';
const GID = 'nycpad:venue:337433';
const POINT = '-73.938,40.843';

const picked = { properties: { gid: GID, label: LABEL, locality_a: 'NYC', borough: 'Manhattan' } };
const sibling = {
  properties: { gid: 'nycpad:venue:337434', label: '710 WEST 171 STREET, New York, NY, USA', locality_a: 'NYC', borough: 'Manhattan' },
};

function fakeFetch(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
}

describe('verifyNycAddress', () => {
  it('returns the label of the exact feature the applicant picked', async () => {
    const result = await verifyNycAddress(LABEL, GID, POINT, fakeFetch({ features: [sibling, picked] }));
    expect(result).toEqual({ ok: true, label: LABEL });
  });

  it('looks the label up on the same autocomplete endpoint the picker uses', async () => {
    const spy = vi.fn(fakeFetch({ features: [picked] }));
    await verifyNycAddress(LABEL, GID, POINT, spy as unknown as typeof fetch);
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain('/v2/autocomplete?');
    expect(new URL(url).searchParams.get('text')).toBe(LABEL);
  });

  it('confines the lookup to the picked point so same-named features elsewhere cannot crowd it out', async () => {
    const spy = vi.fn(fakeFetch({ features: [picked] }));
    await verifyNycAddress(LABEL, GID, POINT, spy as unknown as typeof fetch);
    const params = new URL(String(spy.mock.calls[0][0])).searchParams;
    expect(params.get('boundary.circle.lon')).toBe('-73.938');
    expect(params.get('boundary.circle.lat')).toBe('40.843');
    expect(Number(params.get('boundary.circle.radius'))).toBeGreaterThanOrEqual(0.5);
    expect(params.get('focus.point.lon')).toBe('-73.938');
    expect(params.get('focus.point.lat')).toBe('40.843');
  });

  it.each(['', 'nowhere', '-73.9', '-73.9,', '1,2,3', '-200,40', '-73.9,95'])(
    'rejects a missing or malformed point (%j) without calling the service',
    async (point) => {
      const spy = vi.fn(fakeFetch({ features: [picked] }));
      const result = await verifyNycAddress(LABEL, GID, point, spy as unknown as typeof fetch);
      expect(result).toEqual({ ok: false, reason: 'no_match' });
      expect(spy).not.toHaveBeenCalled();
    },
  );

  it('never substitutes a different result when the picked feature is absent', async () => {
    const result = await verifyNycAddress(LABEL, GID, POINT, fakeFetch({ features: [sibling] }));
    expect(result).toEqual({ ok: false, reason: 'no_match' });
  });

  it('rejects a submitted label that does not match the picked feature', async () => {
    const result = await verifyNycAddress('1 Fake Street, New York, NY, USA', GID, POINT, fakeFetch({ features: [picked] }));
    expect(result).toEqual({ ok: false, reason: 'label_mismatch' });
  });

  it('rejects a feature outside NYC', async () => {
    const outside = { properties: { ...picked.properties, locality_a: undefined, borough: undefined } };
    const result = await verifyNycAddress(LABEL, GID, POINT, fakeFetch({ features: [outside] }));
    expect(result).toEqual({ ok: false, reason: 'outside_nyc' });
  });

  it('rejects a missing feature id without calling the service', async () => {
    const spy = vi.fn(fakeFetch({ features: [picked] }));
    const result = await verifyNycAddress(LABEL, '', POINT, spy as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'no_match' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('fails CLOSED when the service errors', async () => {
    const result = await verifyNycAddress(LABEL, GID, POINT, fakeFetch({}, 503));
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('fails CLOSED on network failure', async () => {
    const failing = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const result = await verifyNycAddress(LABEL, GID, POINT, failing);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('parsePoint', () => {
  it('reads the GeoJSON lon,lat order the picker submits', () => {
    expect(parsePoint('-73.96554,40.78249')).toEqual({ lon: -73.96554, lat: 40.78249 });
  });
});
