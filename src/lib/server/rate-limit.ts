import { createHash } from 'node:crypto';

/**
 * Per-IP sliding-window rate limiter backed by Netlify Blobs.
 *
 * Netlify functions are stateless per invocation, so in-memory counters
 * reset on every cold start and never see traffic handled by other
 * instances. Blobs gives us shared state without adding a database.
 * Tradeoff: get→set is not atomic, so two simultaneous submissions can
 * both slip under the limit — acceptable for throttling form abuse,
 * where the goal is stopping sustained flooding, not exact counting.
 *
 * The store dependency is injected so tests can pass a fake.
 */

export interface WindowStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  now?: number;
}

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 5;

/** Hash the IP so raw addresses are never persisted in the store. */
export function keyForIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function isRateLimited(
  store: WindowStore,
  ip: string,
  { windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS, now = Date.now() }: RateLimitOptions = {},
): Promise<boolean> {
  const key = keyForIp(ip);
  const raw = await store.get(key);

  let timestamps: number[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) timestamps = parsed.filter((t) => typeof t === 'number');
    } catch {
      // Corrupt entry — treat as empty rather than locking the IP out
    }
  }

  const inWindow = timestamps.filter((t) => now - t < windowMs);
  if (inWindow.length >= maxRequests) return true;

  inWindow.push(now);
  await store.set(key, JSON.stringify(inWindow));
  return false;
}

/**
 * Production entrypoint: resolves the Netlify Blobs store lazily and
 * fails OPEN (allows the submission, logs a warning) when Blobs isn't
 * reachable — e.g. plain `astro dev` without Netlify credentials —
 * so a rate-limiter outage never blocks real signups.
 */
export async function isRateLimitedByBlobs(ip: string, options: RateLimitOptions = {}): Promise<boolean> {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({ name: 'form-rate-limits', consistency: 'strong' });
    return await isRateLimited(store, ip, options);
  } catch (err) {
    console.warn(
      JSON.stringify({
        evt: 'rate_limit_unavailable',
        detail: err instanceof Error ? err.message : 'unknown',
      }),
    );
    return false;
  }
}
