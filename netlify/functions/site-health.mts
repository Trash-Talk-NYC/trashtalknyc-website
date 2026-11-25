import { HEALTH_HEADER, healthSecretMatches } from '../../src/lib/server/health/healthMode';
import { runAndReport } from '../../src/lib/server/health/run';

/**
 * Manual trigger for the site health check, so it can be run on demand:
 *
 *   curl -X POST -H "x-healthcheck-secret: $HEALTHCHECK_SECRET" \
 *     https://<deploy>/.netlify/functions/site-health
 *
 * It checks the deploy it is called on (production, or a preview), posts the
 * same Slack summary as the daily run, and answers with the results and the
 * webhook's HTTP status. Anything without the secret gets a bare 404.
 */
export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST' || !healthSecretMatches(req.headers.get(HEALTH_HEADER), process.env.HEALTHCHECK_SECRET)) {
    return new Response('Not found', { status: 404 });
  }
  const summary = await runAndReport(new URL(req.url).origin);
  return Response.json(summary, { status: summary.ok ? 200 : 500 });
};
