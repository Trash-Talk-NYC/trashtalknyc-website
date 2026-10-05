import { describe, expect, it, vi } from 'vitest';
import { verifyNycAddress } from '../geosearch';

const LABEL = '708 WEST 171 STREET, New York, NY, USA';
const GID = 'nycpad:venue:337433';

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
    const result = await verifyNycAddress(LABEL, GID, fakeFetch({ features: [sibling, picked] }));
    expect(result).toEqual({ ok: true, label: LABEL });
  });

  it('looks the label up on the same autocomplete endpoint the picker uses', async () => {
    const spy = vi.fn(fakeFetch({ features: [picked] }));
    await verifyNycAddress(LABEL, GID, spy as unknown as typeof fetch);
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain('/v2/autocomplete?');
    expect(url).toContain(`text=${encodeURIComponent(LABEL)}`);
  });

  it('never substitutes a different result when the picked feature is absent', async () => {
    const result = await verifyNycAddress(LABEL, GID, fakeFetch({ features: [sibling] }));
    expect(result).toEqual({ ok: false, reason: 'no_match' });
  });

  it('rejects a submitted label that does not match the picked feature', async () => {
    const result = await verifyNycAddress('1 Fake Street, New York, NY, USA', GID, fakeFetch({ features: [picked] }));
    expect(result).toEqual({ ok: false, reason: 'label_mismatch' });
  });

  it('rejects a feature outside NYC', async () => {
    const outside = { properties: { ...picked.properties, locality_a: undefined, borough: undefined } };
    const result = await verifyNycAddress(LABEL, GID, fakeFetch({ features: [outside] }));
    expect(result).toEqual({ ok: false, reason: 'outside_nyc' });
  });

  it('rejects a missing feature id without calling the service', async () => {
    const spy = vi.fn(fakeFetch({ features: [picked] }));
    const result = await verifyNycAddress(LABEL, '', spy as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, reason: 'no_match' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('fails CLOSED when the service errors', async () => {
    const result = await verifyNycAddress(LABEL, GID, fakeFetch({}, 503));
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('fails CLOSED on network failure', async () => {
    const failing = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const result = await verifyNycAddress(LABEL, GID, failing);
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
  });
});
