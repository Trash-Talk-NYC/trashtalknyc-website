import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDonationTotal, parseDonationTotal } from '../gofundme';

const gatewayPayload = (amount: unknown) => ({
  references: { counts: { total_donations: 368, amount_raised_unattributed: amount } },
  meta: { last_updated_at: '2026-07-08T12:10:56-05:00' },
});

describe('parseDonationTotal', () => {
  it('extracts and rounds the raised amount', () => {
    expect(parseDonationTotal(gatewayPayload(20651))).toBe(20651);
    expect(parseDonationTotal(gatewayPayload(20651.72))).toBe(20652);
  });

  it('returns null on unexpected shapes instead of rendering garbage', () => {
    expect(parseDonationTotal(null)).toBeNull();
    expect(parseDonationTotal('nope')).toBeNull();
    expect(parseDonationTotal({})).toBeNull();
    expect(parseDonationTotal({ references: {} })).toBeNull();
    expect(parseDonationTotal(gatewayPayload('20651'))).toBeNull();
    expect(parseDonationTotal(gatewayPayload(Number.NaN))).toBeNull();
    expect(parseDonationTotal(gatewayPayload(-5))).toBeNull();
  });
});

describe('fetchDonationTotal', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the parsed total on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(gatewayPayload(20651)), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDonationTotal()).resolves.toBe(20651);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('join-trash-talk-clean-up-new-york-together'),
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('returns null on HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 503 })));
    await expect(fetchDonationTotal()).resolves.toBeNull();
  });

  it('returns null on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
    await expect(fetchDonationTotal()).resolves.toBeNull();
  });

  it('returns null on non-JSON bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    await expect(fetchDonationTotal()).resolves.toBeNull();
  });
});
