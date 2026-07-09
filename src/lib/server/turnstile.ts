/**
 * Cloudflare Turnstile server-side token verification (siteverify).
 * Deliberately raw fetch(), matching the Brevo client — one endpoint
 * doesn't justify an SDK dependency.
 *
 * Verification failures (including siteverify outages) fail closed: a
 * submission without a provable human is rejected rather than risking
 * bot pollution of the paid Brevo list. The caller decides whether to
 * enforce at all — see requireTurnstile in src/actions/index.ts, which
 * stays dormant until the Turnstile env vars are provisioned.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// The action runs in a synchronous Netlify function with a 10s budget that
// also has to cover up to three Brevo calls (see brevo.ts); siteverify gets
// a small slice so a hung connection can't eat the upsert's share.
const VERIFY_TIMEOUT_MS = 3000;

export type TurnstileResult = { ok: true } | { ok: false; status?: number; detail: string };

export async function verifyTurnstileToken(secret: string, token: string, remoteIp?: string): Promise<TurnstileResult> {
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);

  let res: Response;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'network error' };
  }

  if (!res.ok) return { ok: false, status: res.status, detail: 'siteverify_http_error' };

  let data: { success?: boolean; 'error-codes'?: string[] };
  try {
    data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
  } catch {
    return { ok: false, status: res.status, detail: 'invalid_json' };
  }

  if (data.success === true) return { ok: true };
  // error-codes are Cloudflare's own slugs (e.g. "invalid-input-response",
  // "timeout-or-duplicate") — safe to log, no submitted PII in them.
  return { ok: false, detail: data['error-codes']?.join(',') || 'not_verified' };
}
