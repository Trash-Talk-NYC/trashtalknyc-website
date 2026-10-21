import { PARTNERSHIP_TYPES, type PartnershipType } from '../leadOptions';

export type InquiryKind = 'general' | 'partnership' | 'sponsor' | 'lead';

export interface NotifyRoute {
  /** Bracket tag that starts the email subject, for inbox filters. */
  tag: string;
  /** The env var holding that category's inbox. */
  envVar: string;
}

/**
 * Where a contact-page notification goes and how its subject is tagged
 * (captain, 2026-10-15/19: route by category so nothing sinks in one shared
 * inbox). One var per category, with NO fallback between them: an unset
 * var means that notification isn't sent and the action logs an error
 * naming the var, so a misroute is impossible. docs/inbox-routing.md is
 * the human-readable copy of this table — keep the two in step.
 *
 *   general                                → [General]         CONTACT_NOTIFY_TO
 *   sponsor                                → [Sponsorship]     SPONSOR_NOTIFY_TO
 *   lead a cleanup                         → [Lead a cleanup]  LEAD_NOTIFY_TO
 *   partner: podcast                       → [Podcast]         PODCAST_NOTIFY_TO
 *   partner: nonprofit partnership         → [Nonprofit]       NONPROFIT_NOTIFY_TO
 *   partner: content collaboration/creation,
 *            influencer, corporate event, other → [Content]    PARTNER_CONTENT_NOTIFY_TO
 */
export function notifyRoute(kind: InquiryKind, partnershipType?: PartnershipType): NotifyRoute {
  switch (kind) {
    case 'general':
      return { tag: '[General]', envVar: 'CONTACT_NOTIFY_TO' };
    case 'sponsor':
      return { tag: '[Sponsorship]', envVar: 'SPONSOR_NOTIFY_TO' };
    case 'lead':
      return { tag: '[Lead a cleanup]', envVar: 'LEAD_NOTIFY_TO' };
    case 'partnership': {
      const bucket = PARTNERSHIP_TYPES.find((t) => t.value === partnershipType)?.bucket ?? 'content';
      if (bucket === 'podcast') return { tag: '[Podcast]', envVar: 'PODCAST_NOTIFY_TO' };
      if (bucket === 'nonprofit') return { tag: '[Nonprofit]', envVar: 'NONPROFIT_NOTIFY_TO' };
      return { tag: '[Content]', envVar: 'PARTNER_CONTENT_NOTIFY_TO' };
    }
  }
}
