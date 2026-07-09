import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstileToken } from '../turnstile';

describe('verifyTurnstileToken', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the expected request and succeeds when Cloudflare verifies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await verifyTurnstileToken('secret-123', 'token-abc', '203.0.113.7');

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret-123');
    expect(body.get('response')).toBe('token-abc');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });

  it('omits remoteip when no client address is available', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await verifyTurnstileToken('secret', 'token');

    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.has('remoteip')).toBe(false);
  });

  it("reports Cloudflare's error codes when verification fails", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response', 'timeout-or-duplicate'] }), { status: 200 }),
    ));

    expect(await verifyTurnstileToken('secret', 'spent-token')).toEqual({
      ok: false,
      detail: 'invalid-input-response,timeout-or-duplicate',
    });
  });

  it('fails closed when success is false with no error codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 })));
    expect(await verifyTurnstileToken('secret', 'token')).toEqual({ ok: false, detail: 'not_verified' });
  });

  it('fails closed on siteverify HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 503 })));
    expect(await verifyTurnstileToken('secret', 'token')).toEqual({ ok: false, status: 503, detail: 'siteverify_http_error' });
  });

  it('fails closed on a non-JSON response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>gateway</html>', { status: 200 })));
    expect(await verifyTurnstileToken('secret', 'token')).toEqual({ ok: false, status: 200, detail: 'invalid_json' });
  });

  it('fails closed on network failures without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')));
    const result = await verifyTurnstileToken('secret', 'token');
    expect(result.ok).toBe(false);
  });
});
