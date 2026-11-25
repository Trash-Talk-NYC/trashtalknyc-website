import { runHealthChecks, type CheckResult } from './checks';
import { formatHealthMessage, postToSlack } from './slack';

/** The production site, whose pages are checked on every run. */
export const PRODUCTION_ORIGIN = 'https://trashtalknyc.org';

export interface HealthRunSummary {
  ok: boolean;
  results: CheckResult[];
  /** The Slack webhook's HTTP status; 0 when unreachable, null when no webhook is set. */
  slackStatus: number | null;
}

const readEnv = (name: string): string | undefined => process.env[name] || undefined;

/**
 * One health run, shared by the daily schedule and the manual trigger:
 * runs the checks against `formOrigin`, posts the summary to Slack, and
 * logs a one-line JSON record (no secrets, no webhook URL).
 */
export async function runAndReport(formOrigin: string): Promise<HealthRunSummary> {
  const results = await runHealthChecks({ readEnv, formOrigin, pagesOrigin: PRODUCTION_ORIGIN });
  const ok = results.every((r) => r.ok);
  const webhook = readEnv('SLACK_HEALTH_WEBHOOK_URL');
  const slackStatus = webhook
    ? await postToSlack(webhook, formatHealthMessage(results, { at: new Date(), target: new URL(formOrigin).host }))
    : null;
  console.log(
    JSON.stringify({
      evt: 'site_health_run',
      ok,
      failed: results.filter((r) => !r.ok).map((r) => r.name).join(', '),
      target: new URL(formOrigin).host,
      slackStatus: slackStatus ?? 'no_webhook',
    }),
  );
  return { ok, results, slackStatus };
}
