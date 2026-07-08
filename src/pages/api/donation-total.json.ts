import type { APIRoute } from 'astro';
import { fetchDonationTotal } from '../../lib/server/gofundme';

// On-demand so the wallet page can refresh the build-time total with a
// live number; the CDN cache below keeps GoFundMe traffic to a trickle.
export const prerender = false;

export const GET: APIRoute = async () => {
  const amountRaised = await fetchDonationTotal();

  if (amountRaised === null) {
    return new Response(JSON.stringify({ error: 'GoFundMe total unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(JSON.stringify({ amountRaised }), {
    headers: {
      'Content-Type': 'application/json',
      // GoFundMe's own gateway caches for 300s; mirror that at our CDN.
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    },
  });
};
