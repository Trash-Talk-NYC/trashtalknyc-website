import { describe, expect, it, vi } from 'vitest';
import { runHealthChecks, withRetry, type HealthConfig } from '../checks';

describe('withRetry', () => {
  it('passes straight through when the first try passes', async () => {
    const run = vi.fn().mockResolvedValue({ ok: true, detail: 'fine' });
    expect(await withRetry('X', run, 0)).toEqual({ name: 'X', ok: true, detail: 'fine' });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries once and marks a pass on the retry', async () => {
    const run = vi.fn().mockResolvedValueOnce({ ok: false, detail: 'blip' }).mockResolvedValueOnce({ ok: true, detail: 'fine' });
    expect(await withRetry('X', run, 0)).toEqual({ name: 'X', ok: true, detail: 'fine', retried: true });
  });

  it('goes red after one retry, reporting the second failure, and turns a throw into a red line', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('first')).mockRejectedValueOnce(new Error('second'));
    expect(await withRetry('X', run, 0)).toEqual({ name: 'X', ok: false, detail: 'second' });
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe('runHealthChecks', () => {
  it('runs every check, reports each one, and never leaks a secret into a detail', async () => {
    const secrets = { BREVO_API_KEY: 'brevo-secret-key', HEALTHCHECK_SECRET: 'h'.repeat(64), EVENTBRITE_TOKEN: 'eb-secret-token' };
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('trashtalknyc.org/') && !u.includes('_actions')) return new Response('<html>', { status: 200 });
      return new Response('{}', { status: 503 });
    });
    vi.stubGlobal('fetch', fetchImpl);
    const config: HealthConfig = {
      readEnv: (name) => (secrets as Record<string, string>)[name],
      formOrigin: 'https://preview.example',
      pagesOrigin: 'https://trashtalknyc.org',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      retryDelayMs: 0,
    };
    const results = await runHealthChecks(config);
    vi.unstubAllGlobals();

    expect(results.map((r) => r.name)).toEqual([
      'Brevo API',
      'Brevo form lists',
      'Signup form',
      'Contact form + email',
      'Lead a Cleanup form + email',
      'Email routing',
      'Eventbrite events',
      'Production pages',
    ]);
    expect(results.find((r) => r.name === 'Production pages')).toMatchObject({ ok: true });
    expect(results.find((r) => r.name === 'Brevo form lists')?.detail).toContain('BREVO_LIST_ID_SIGNUP unset');
    expect(results.find((r) => r.name === 'Email routing')).toMatchObject({ ok: false });
    for (const r of results) {
      for (const secret of Object.values(secrets)) expect(r.detail).not.toContain(secret);
    }
  });
});
