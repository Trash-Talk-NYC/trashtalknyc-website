import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Health mode: how the daily site health check (captain, 2026-11-25) runs
 * the real form actions without touching real people or real inboxes.
 *
 * A request is in health mode only when it carries HEALTHCHECK_SECRET in
 * the HEALTH_HEADER header and that matches the server-side env var. Health
 * mode skips Turnstile (a scheduled function can't solve a challenge) and
 * nothing else: the honeypot, timing, rate limit, validation, and every
 * Brevo call still run. It also pins the submission to one fixed contact
 * and sends the team notification to one inbox, so a daily run never adds
 * a new contact, never deletes one, and never emails contact@,
 * partnerships@, events@, or podcast@.
 */

export const HEALTH_HEADER = 'x-healthcheck-secret';

/** The one contact every health run upserts (lists gain at most this one). */
export const HEALTH_CONTACT = {
  email: 'healthcheck@trashtalknyc.org',
  fname: 'Site',
  lname: 'Health Check',
} as const;

/** Where a health run's notification goes instead of the team inboxes. */
export const HEALTH_NOTIFY_TO = 'fabiola@trashtalknyc.org';
export const HEALTH_SUBJECT_TAG = '[Health check]';

// A short or empty secret must never open the gate; the real one is a
// 64-character random hex string
const MIN_SECRET_LENGTH = 32;

/**
 * Constant-time comparison of the presented secret against the configured
 * one. Both sides are hashed first so the comparison takes the same time
 * whatever the lengths, and an unset or too-short configured secret always
 * refuses.
 */
export function healthSecretMatches(presented: string | null | undefined, configured: string | null | undefined): boolean {
  if (!configured || configured.length < MIN_SECRET_LENGTH || !presented) return false;
  const a = createHash('sha256').update(presented).digest();
  const b = createHash('sha256').update(configured).digest();
  return timingSafeEqual(a, b);
}

/** Whether a request is a health-check run, read from its headers and the server env. */
export function isHealthRequest(headers: Headers, readEnv: (name: string) => string | undefined): boolean {
  return healthSecretMatches(headers.get(HEALTH_HEADER), readEnv('HEALTHCHECK_SECRET'));
}

export interface NotifyPlan {
  /** Who actually receives the email. */
  to: { email: string }[];
  /** The subject tag the email carries. */
  tag: string;
  /** The team inboxes the routing table chose (only emailed outside health mode). */
  routedTo: string[];
}

/**
 * Turns the routing table's answer into the send. Outside health mode the
 * routed inboxes receive it under the route's tag; in health mode only
 * HEALTH_NOTIFY_TO does, tagged [Health check], while the routed
 * addresses are still reported so the check can show routing works.
 */
export function planNotification(health: boolean, routeTag: string, recipients: { email: string }[]): NotifyPlan {
  const routedTo = recipients.map((r) => r.email);
  if (!health) return { to: recipients, tag: routeTag, routedTo };
  return { to: [{ email: HEALTH_NOTIFY_TO }], tag: `${HEALTH_SUBJECT_TAG} ${routeTag}`, routedTo };
}

/** What a health-mode action run reports back to the health check. */
export interface HealthActionReport {
  listId: number;
  /** The team inboxes the routing table chose; never emailed in health mode. */
  routedTo: string[];
  /** Routing env vars that were unset. */
  unset: string[];
  /** Brevo's id for the notification it accepted, when one was sent. */
  messageId?: string;
  /** Why no notification was accepted, when none was. */
  notifyError?: string;
}
