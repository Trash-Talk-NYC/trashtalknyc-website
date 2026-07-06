import { describe, expect, it } from 'vitest';
import { isRateLimited, keyForIp, type WindowStore } from '../rate-limit';

function memoryStore(): WindowStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key) { return data.get(key) ?? null; },
    async set(key, value) { data.set(key, value); },
  };
}

const IP = '203.0.113.7';

describe('keyForIp', () => {
  it('never stores the raw IP', () => {
    expect(keyForIp(IP)).not.toContain(IP);
  });

  it('is deterministic per IP and distinct across IPs', () => {
    expect(keyForIp(IP)).toBe(keyForIp(IP));
    expect(keyForIp(IP)).not.toBe(keyForIp('203.0.113.8'));
  });
});

describe('isRateLimited', () => {
  const opts = { windowMs: 10_000, maxRequests: 3 };

  it('allows requests under the limit', async () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) {
      expect(await isRateLimited(store, IP, { ...opts, now: 1000 + i })).toBe(false);
    }
  });

  it('blocks the request over the limit', async () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) await isRateLimited(store, IP, { ...opts, now: 1000 + i });
    expect(await isRateLimited(store, IP, { ...opts, now: 1004 })).toBe(true);
  });

  it('slides: old requests fall out of the window', async () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) await isRateLimited(store, IP, { ...opts, now: 1000 + i });
    expect(await isRateLimited(store, IP, { ...opts, now: 1000 + 10_001 })).toBe(false);
  });

  it('tracks IPs independently', async () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) await isRateLimited(store, IP, { ...opts, now: 1000 + i });
    expect(await isRateLimited(store, '198.51.100.1', { ...opts, now: 1004 })).toBe(false);
  });

  it('recovers from a corrupt store entry', async () => {
    const store = memoryStore();
    store.data.set(keyForIp(IP), 'not-json');
    expect(await isRateLimited(store, IP, { ...opts, now: 1000 })).toBe(false);
  });
});
