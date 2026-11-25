import { parse as devalueParse } from 'devalue';
import { getBrevoAccount, getBrevoList } from '../brevo';
import { notifyRoute, resolveRecipients, type InquiryKind, type NotifyVar } from '../notifyRouting';
import { fetchEventbriteEvents } from '../../events';
import { rollingMonths } from '../../months';
import { PARTNERSHIP_TYPES, type PartnershipType } from '../../leadOptions';
import { HEALTH_CONTACT, HEALTH_HEADER, type HealthActionReport } from './healthMode';

/**
 * The daily site health check (captain, 2026-11-25): each check answers
 * one question about the live site and reports green or red with a short
 * reason. A failed check is retried once before it counts as red, so one
 * slow API response doesn't page anyone.
 *
 * Nothing here logs or returns a secret: details carry list names, inbox
 * addresses, counts, and HTTP statuses only.
 */

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  /** Passed only on the retry. */
  retried?: boolean;
}

type Outcome = { ok: boolean; detail: string };

export interface HealthConfig {
  readEnv: (name: string) => string | undefined;
  /** The deploy whose form actions are exercised (production, or the preview being tested). */
  formOrigin: string;
  /** Where the public pages are checked (always production). */
  pagesOrigin: string;
  fetchImpl?: typeof fetch;
  retryDelayMs?: number;
}

const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_RETRY_DELAY_MS = 2000;

/** The form lists, by the env var each form reads (see AGENTS.md, Brevo). */
export const FORM_LISTS: { envVar: string; label: string }[] = [
  { envVar: 'BREVO_LIST_ID_SIGNUP', label: 'signup' },
  { envVar: 'CONTACT_GENERAL', label: 'general' },
  { envVar: 'CONTACT_COLLAB', label: 'partner' },
  { envVar: 'CONTACT_SPONSOR', label: 'brand partner' },
  { envVar: 'BREVO_LIST_ID_LEADS', label: 'lead a cleanup' },
];

export const PRODUCTION_PAGES = ['/', '/events/', '/contact/', '/in-the-news/'];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

/** Runs a check, and once more after a pause if it fails or throws. */
export async function withRetry(name: string, run: () => Promise<Outcome>, retryDelayMs = DEFAULT_RETRY_DELAY_MS): Promise<CheckResult> {
  const attempt = async (): Promise<Outcome> => {
    try {
      return await run();
    } catch (err) {
      return { ok: false, detail: errorText(err) };
    }
  };
  const first = await attempt();
  if (first.ok) return { name, ...first };
  await sleep(retryDelayMs);
  const second = await attempt();
  return second.ok ? { name, ...second, retried: true } : { name, ...second };
}

function apiKey(config: HealthConfig): string {
  const key = config.readEnv('BREVO_API_KEY');
  if (!key) throw new Error('BREVO_API_KEY is not set');
  return key;
}

async function checkBrevoAccount(config: HealthConfig): Promise<Outcome> {
  const account = await getBrevoAccount(apiKey(config));
  if (!account.ok) return { ok: false, detail: `account read failed (${account.status ?? 'network'}: ${account.detail})` };
  return { ok: true, detail: `key valid, account ${account.data.companyName ?? 'read'}` };
}

async function checkBrevoLists(config: HealthConfig): Promise<Outcome> {
  const key = apiKey(config);
  const parts = await Promise.all(
    FORM_LISTS.map(async ({ envVar, label }) => {
      const id = Number(config.readEnv(envVar));
      if (!Number.isInteger(id) || id <= 0) return { ok: false, text: `${label}: ${envVar} unset` };
      const list = await getBrevoList(key, id);
      return list.ok
        ? { ok: true, text: `${id} ${label}` }
        : { ok: false, text: `${id} ${label} unreadable (${list.status ?? 'network'}: ${list.detail})` };
    }),
  );
  return { ok: parts.every((p) => p.ok), detail: parts.map((p) => p.text).join(', ') };
}

const ROUTES: { label: string; kind: InquiryKind; options?: { partnershipTypes?: PartnershipType[]; bug?: boolean } }[] = [
  { label: 'General', kind: 'general' },
  { label: 'Bug', kind: 'general', options: { bug: true } },
  { label: 'Brand Partner', kind: 'sponsor' },
  { label: 'Lead a Cleanup', kind: 'lead' },
  ...PARTNERSHIP_TYPES.map((t) => ({ label: `Partner: ${t.en}`, kind: 'partnership' as const, options: { partnershipTypes: [t.value] } })),
];

/** Every form route resolves to its inboxes from this context's env (nothing is emailed). */
function checkRouting(config: HealthConfig): Outcome {
  const unset = new Set<NotifyVar>();
  const lines = ROUTES.map(({ label, kind, options }) => {
    const { envVars } = notifyRoute(kind, options);
    const resolved = resolveRecipients(envVars, (name) => config.readEnv(name));
    resolved.unset.forEach((v) => unset.add(v));
    return `${label} → ${resolved.recipients.map((r) => r.email).join(' + ') || 'nobody'}`;
  });
  if (!config.readEnv('CONTACT_NOTIFY_FROM')) unset.add('CONTACT_NOTIFY_FROM' as NotifyVar);
  return unset.size
    ? { ok: false, detail: `unset: ${[...unset].join(', ')}. ${lines.join('; ')}` }
    : { ok: true, detail: lines.join('; ') };
}

/** Posts a form to its real Astro Action endpoint in health mode and reads its report. */
async function submitAction(config: HealthConfig, action: string, fields: Record<string, string | string[]>): Promise<HealthActionReport> {
  const secret = config.readEnv('HEALTHCHECK_SECRET');
  if (!secret) throw new Error('HEALTHCHECK_SECRET is not set');
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) body.append(name, v);
  }
  const fetchImpl = config.fetchImpl ?? fetch;
  const res = await fetchImpl(`${config.formOrigin}/_actions/${action}`, {
    method: 'POST',
    // Astro's origin check requires a same-origin Origin on form posts
    headers: { Origin: config.formOrigin, [HEALTH_HEADER]: secret },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS * 2),
  });
  const text = await res.text();
  if (!res.ok) {
    let code = '';
    try {
      code = (JSON.parse(text) as { code?: string }).code ?? '';
    } catch {
      // not JSON
    }
    throw new Error(`HTTP ${res.status}${code ? ` ${code}` : ''}`);
  }
  const data = devalueParse(text) as { ok?: boolean; health?: HealthActionReport };
  // Without the report, health mode didn't engage (a secret mismatch can't
  // reach here: Turnstile would have refused the post)
  if (!data?.health) throw new Error('no health report: health mode did not engage');
  return data.health;
}

const startedAt = () => String(Date.now() - 60_000);

async function checkSignup(config: HealthConfig): Promise<Outcome> {
  const report = await submitAction(config, 'signup', {
    ...HEALTH_CONTACT,
    startedAt: startedAt(),
    botcheck: '',
    country: 'United States',
    zip: '10007',
    hear: 'Word of Mouth',
  });
  return { ok: true, detail: `saved to list ${report.listId}` };
}

function notifyOutcome(report: HealthActionReport): Outcome {
  const routed = report.routedTo.join(' + ') || 'nobody';
  if (report.unset.length) return { ok: false, detail: `saved to list ${report.listId}; routing vars unset: ${report.unset.join(', ')}` };
  if (!report.messageId) return { ok: false, detail: `saved to list ${report.listId}; email not accepted (${report.notifyError ?? 'no messageId'}); routes to ${routed}` };
  return { ok: true, detail: `saved to list ${report.listId}; email accepted (messageId); routes to ${routed}` };
}

async function checkContact(config: HealthConfig): Promise<Outcome> {
  return notifyOutcome(
    await submitAction(config, 'contact', {
      ...HEALTH_CONTACT,
      startedAt: startedAt(),
      botcheck: '',
      inquiryType: 'general',
      message: 'Automated daily site health check. Nothing to do.',
    }),
  );
}

/** A real GeoSearch feature for the lead form's verified starting address. */
async function pickStartAddress(config: HealthConfig): Promise<{ label: string; id: string; point: string }> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const res = await fetchImpl('https://geosearch.planninglabs.nyc/v2/autocomplete?text=1%20Centre%20Street', {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GeoSearch HTTP ${res.status}`);
  const data = (await res.json()) as { features?: { properties?: { gid?: string; label?: string; locality_a?: string }; geometry?: { coordinates?: number[] } }[] };
  const f = data.features?.find((x) => x.properties?.locality_a === 'NYC' && x.properties.gid && x.geometry?.coordinates?.length === 2);
  if (!f?.properties?.gid || !f.properties.label || !f.geometry?.coordinates) throw new Error('GeoSearch returned no NYC address');
  return { label: f.properties.label, id: f.properties.gid, point: f.geometry.coordinates.join(',') };
}

async function checkLead(config: HealthConfig): Promise<Outcome> {
  const start = await pickStartAddress(config);
  return notifyOutcome(
    await submitAction(config, 'leadCleanup', {
      ...HEALTH_CONTACT,
      startedAt: startedAt(),
      botcheck: '',
      behalf: ['individual'],
      phone: '2126399675',
      startAddress: start.label,
      startAddressId: start.id,
      startAddressPoint: start.point,
      cleaningNeed: ['streets'],
      support: ['supplies'],
      preferredMonth: rollingMonths(2)[1].value,
    }),
  );
}

async function checkEventbrite(config: HealthConfig): Promise<Outcome> {
  const token = config.readEnv('EVENTBRITE_TOKEN');
  const orgId = config.readEnv('EVENTBRITE_ORGANIZER_ID');
  if (!token || !orgId) return { ok: false, detail: `${!token ? 'EVENTBRITE_TOKEN ' : ''}${!orgId ? 'EVENTBRITE_ORGANIZER_ID ' : ''}unset`.trim() };
  const { upcoming, past, failed } = await fetchEventbriteEvents(token, orgId);
  if (failed.length) return { ok: false, detail: `API request failed (${failed.join(' and ')} events)` };
  if (upcoming.length + past.length === 0) return { ok: false, detail: 'API answered but returned no events at all' };
  return { ok: true, detail: `${upcoming.length} upcoming, ${past.length} past` };
}

async function checkPages(config: HealthConfig): Promise<Outcome> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const statuses = await Promise.all(
    PRODUCTION_PAGES.map(async (path) => {
      try {
        const res = await fetchImpl(`${config.pagesOrigin}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        return { path, status: res.status };
      } catch (err) {
        return { path, status: 0, error: errorText(err) };
      }
    }),
  );
  const bad = statuses.filter((s) => s.status !== 200);
  return bad.length
    ? { ok: false, detail: bad.map((s) => `${s.path} ${s.status || s.error}`).join(', ') }
    : { ok: true, detail: `${PRODUCTION_PAGES.join(' ')} all 200` };
}

/** Runs every check; the form submissions go one after another so they never race on the shared contact. */
export async function runHealthChecks(config: HealthConfig): Promise<CheckResult[]> {
  const delay = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const forms = (async () => [
    await withRetry('Signup form', () => checkSignup(config), delay),
    await withRetry('Contact form + email', () => checkContact(config), delay),
    await withRetry('Lead a Cleanup form + email', () => checkLead(config), delay),
  ])();
  const [brevo, lists, routing, eventbrite, pages, formResults] = await Promise.all([
    withRetry('Brevo API', () => checkBrevoAccount(config), delay),
    withRetry('Brevo form lists', () => checkBrevoLists(config), delay),
    withRetry('Email routing', async () => checkRouting(config), delay),
    withRetry('Eventbrite events', () => checkEventbrite(config), delay),
    withRetry('Production pages', () => checkPages(config), delay),
    forms,
  ]);
  return [brevo, lists, ...formResults, routing, eventbrite, pages];
}
