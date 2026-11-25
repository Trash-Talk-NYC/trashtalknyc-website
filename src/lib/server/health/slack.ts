import type { CheckResult } from './checks';

/**
 * The health check's Slack post: one header line that says whether
 * everything passed (and names what failed), then one green or red line
 * per check. Sent through an incoming webhook, whose URL is a secret and
 * is never logged or returned.
 */

export interface SlackMessage {
  text: string;
}

// Slack treats &, <, and > as control characters in message text
function escapeSlack(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function nyTime(at: Date): string {
  return at.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatHealthMessage(results: CheckResult[], { at, target }: { at: Date; target: string }): SlackMessage {
  const failed = results.filter((r) => !r.ok);
  const when = `${nyTime(at)} ET · ${escapeSlack(target)}`;
  const header = failed.length
    ? `:rotating_light: *Site health: ${failed.length} of ${results.length} failing: ${escapeSlack(failed.map((r) => r.name).join(', '))}* · ${when}`
    : `:white_check_mark: *Site health: all ${results.length} checks passed* · ${when}`;
  const lines = results.map(
    (r) =>
      `${r.ok ? ':large_green_circle:' : ':red_circle:'} *${escapeSlack(r.name)}*: ${escapeSlack(r.detail)}${r.retried ? ' _(passed on retry)_' : ''}`,
  );
  return { text: [header, ...lines].join('\n') };
}

/** Posts the message and returns the webhook's HTTP status (0 when unreachable). */
export async function postToSlack(webhookUrl: string, message: SlackMessage, fetchImpl: typeof fetch = fetch): Promise<number> {
  try {
    const res = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(8000),
    });
    return res.status;
  } catch {
    return 0;
  }
}
