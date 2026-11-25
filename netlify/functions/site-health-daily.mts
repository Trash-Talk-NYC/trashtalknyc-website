import { PRODUCTION_ORIGIN, runAndReport } from '../../src/lib/server/health/run';

/**
 * The daily site health check (captain, 2026-11-25): about 8:00 in New York,
 * one Slack post with a green or red line per check. Cron runs in UTC, so
 * it fires at both 12:00 and 13:00 UTC and only the one that lands on 8 a.m.
 * New York time (EDT or EST) goes ahead.
 *
 * Scheduled functions run only on the published production deploy, so this
 * always checks production. Run it by hand with the site-health function.
 */
export default async (): Promise<Response> => {
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }));
  if (hour !== 8) return new Response(null, { status: 204 });
  await runAndReport(PRODUCTION_ORIGIN);
  return new Response(null, { status: 204 });
};

export const config = { schedule: '0 12,13 * * *' };
