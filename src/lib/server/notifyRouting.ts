import { PARTNERSHIP_TYPES, type PartnershipType } from '../leadOptions';

export type InquiryKind = 'general' | 'partnership' | 'sponsor' | 'lead';

/** The env vars that hold the team inboxes, read at runtime per Netlify context. */
export type NotifyVar =
  | 'CONTACT_NOTIFY_TO'
  | 'SPONSOR_NOTIFY_TO'
  | 'LEAD_NOTIFY_TO'
  | 'PARTNER_CONTENT_NOTIFY_TO'
  | 'PODCAST_NOTIFY_TO'
  | 'NONPROFIT_NOTIFY_TO'
  | 'BUG_NOTIFY_TO';

export interface NotifyRoute {
  /** Bracket tag(s) that start the email subject, for inbox filters. */
  tag: string;
  /** Every inbox var that hears about it, deduped, in a stable order. */
  envVars: NotifyVar[];
}

interface Route {
  tag: string;
  envVars: readonly NotifyVar[];
}

// A General message ticked as a website problem goes to the bug inbox
// instead (captain, 2026-11-24: "straight to my inbox")
const BUG_ROUTE: Route = { tag: '[Bug]', envVars: ['BUG_NOTIFY_TO'] };

const KIND_ROUTES: Record<Exclude<InquiryKind, 'partnership'>, Route> = {
  general: { tag: '[General]', envVars: ['CONTACT_NOTIFY_TO'] },
  sponsor: { tag: '[Brand partnership]', envVars: ['SPONSOR_NOTIFY_TO'] },
  lead: { tag: '[Lead a cleanup]', envVars: ['LEAD_NOTIFY_TO'] },
};

// A Record, so a new partnership choice can't ship without a route.
// PARTNER_CONTENT_NOTIFY_TO is the partnerships@ inbox; corporate events reuse
// LEAD_NOTIFY_TO (events@) for their copy rather than adding a var.
const PARTNERSHIP_ROUTES: Record<PartnershipType, Route> = {
  'content-collaboration': { tag: '[Content]', envVars: ['PARTNER_CONTENT_NOTIFY_TO'] },
  'content-creation': { tag: '[Content]', envVars: ['PARTNER_CONTENT_NOTIFY_TO'] },
  influencer: { tag: '[Content]', envVars: ['PARTNER_CONTENT_NOTIFY_TO'] },
  podcast: { tag: '[Podcast]', envVars: ['PODCAST_NOTIFY_TO', 'PARTNER_CONTENT_NOTIFY_TO'] },
  nonprofit: { tag: '[Nonprofit]', envVars: ['NONPROFIT_NOTIFY_TO'] },
  'corporate-event': { tag: '[Content]', envVars: ['PARTNER_CONTENT_NOTIFY_TO', 'LEAD_NOTIFY_TO'] },
  other: { tag: '[Content]', envVars: ['PARTNER_CONTENT_NOTIFY_TO'] },
};

// "podcast" in either language (ES "pódcast"), any case, plurals included
const PODCAST_MENTION = /p[oó]dcast/i;

/** Whether free text mentions a podcast, so the podcast inbox gets a copy. */
export function mentionsPodcast(text: string): boolean {
  // NFC first: a decomposed "ó" (o + combining accent) must still match
  return PODCAST_MENTION.test(text.normalize('NFC'));
}

/**
 * Who hears about a contact-page inquiry and how its subject is tagged
 * (captain, 2026-11-24): General → contact@, Brand Partner → partnerships@,
 * Lead a cleanup → events@, and on the Partner tile each picked kind adds
 * its inboxes (podcast → podcast@ and partnerships@, corporate event →
 * partnerships@ and events@, every other kind → partnerships@). A Partner or
 * Brand Partner message that mentions a podcast also copies podcast@, and
 * a General message ticked as a website problem goes to the bug inbox
 * (fabiola@) tagged [Bug] instead of contact@. docs/inbox-routing.md is the human-readable copy of this table — keep
 * the two in step.
 *
 * There is NO fallback between vars: an unset one is reported by
 * resolveRecipients and never replaced with another inbox.
 */
export function notifyRoute(
  kind: InquiryKind,
  {
    partnershipTypes = [],
    message = '',
    bug = false,
  }: { partnershipTypes?: readonly PartnershipType[]; message?: string; bug?: boolean } = {},
): NotifyRoute {
  let routes: Route[];
  if (kind === 'general' && bug) {
    routes = [BUG_ROUTE];
  } else if (kind === 'partnership') {
    // Choice-list order, not tick order, so the tag reads the same however
    // they were ticked; an empty pick (never valid past the schema) still
    // reaches partnerships@ rather than nobody
    const picked = PARTNERSHIP_TYPES.map((t) => t.value).filter((v) => partnershipTypes.includes(v));
    routes = picked.length ? picked.map((v) => PARTNERSHIP_ROUTES[v]) : [PARTNERSHIP_ROUTES.other];
  } else {
    routes = [KIND_ROUTES[kind]];
  }

  const envVars = new Set(routes.flatMap((r) => r.envVars));
  if ((kind === 'partnership' || kind === 'sponsor') && mentionsPodcast(message)) envVars.add('PODCAST_NOTIFY_TO');

  return {
    tag: [...new Set(routes.map((r) => r.tag))].join(' '),
    envVars: [...envVars],
  };
}

/**
 * Turns the route's vars into one deduped recipient list. A var may hold
 * several comma-separated addresses, and several vars may hold the same
 * inbox (partnerships@ sits behind three of them), so an address is listed
 * once however many vars name it, compared case-insensitively.
 */
export function resolveRecipients(
  envVars: readonly NotifyVar[],
  readEnv: (name: NotifyVar) => string | undefined,
): { recipients: { email: string }[]; unset: NotifyVar[] } {
  const seen = new Set<string>();
  const recipients: { email: string }[] = [];
  const unset: NotifyVar[] = [];
  for (const name of envVars) {
    const addresses = (readEnv(name) ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    if (addresses.length === 0) unset.push(name);
    for (const email of addresses) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      recipients.push({ email });
    }
  }
  return { recipients, unset };
}
