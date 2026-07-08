/**
 * Donation total from GoFundMe's public web gateway — the same campaign
 * the homepage embed widget renders, pulled as a raw number so pages can
 * typeset it themselves. Deliberately raw fetch(): GoFundMe has no
 * official API, and this gateway endpoint is what their own embed uses.
 *
 * The gateway sends no Access-Control-Allow-Origin header, so browsers
 * cannot call it directly; fetch it here (build frontmatter or the
 * /api/donation-total.json on-demand route) and hand the number down.
 */

export const GOFUNDME_CAMPAIGN_SLUG = 'join-trash-talk-clean-up-new-york-together';

const COUNTS_URL = `https://gateway.gofundme.com/web-gateway/v1/feed/${GOFUNDME_CAMPAIGN_SLUG}/counts`;

/** Keep a slow GoFundMe from hanging builds or function invocations. */
const FETCH_TIMEOUT_MS = 8000;

/**
 * Extract the raised amount (whole US dollars) from a gateway counts
 * payload. `amount_raised_unattributed` is the campaign-wide total the
 * embed widget displays, despite the odd name. Returns null on any
 * unexpected shape so callers degrade instead of rendering garbage.
 */
export function parseDonationTotal(payload: unknown): number | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const references = (payload as Record<string, unknown>).references;
  if (typeof references !== 'object' || references === null) return null;

  const counts = (references as Record<string, unknown>).counts;
  if (typeof counts !== 'object' || counts === null) return null;

  const amount = (counts as Record<string, unknown>).amount_raised_unattributed;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount);
}

/** Fetch the live raised total; null means "unavailable right now". */
export async function fetchDonationTotal(): Promise<number | null> {
  let res: Response;
  try {
    res = await fetch(COUNTS_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  try {
    return parseDonationTotal(await res.json());
  } catch {
    return null;
  }
}
