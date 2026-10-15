import { PARTNERSHIP_TYPES, type PartnershipType } from '../leadOptions';

export type InquiryKind = 'general' | 'partnership' | 'sponsor' | 'lead';

/**
 * The env var holding the inbox a contact-page notification goes to
 * (captain, 2026-10-15: route by bucket so nothing sinks in one shared
 * inbox). One var per bucket, with NO fallback between them: an unset var
 * means that notification isn't sent and the action logs an error naming
 * the var, so a misroute is impossible.
 *
 *   general                                → CONTACT_NOTIFY_TO
 *   sponsor                                → SPONSOR_NOTIFY_TO
 *   lead a cleanup                         → LEAD_NOTIFY_TO
 *   partner: podcast                       → PODCAST_NOTIFY_TO
 *   partner: nonprofit partnership         → NONPROFIT_NOTIFY_TO
 *   partner: content collaboration/creation,
 *            influencer, corporate event, other → PARTNER_CONTENT_NOTIFY_TO
 */
export function notifyRecipientVar(kind: InquiryKind, partnershipType?: PartnershipType): string {
  switch (kind) {
    case 'general':
      return 'CONTACT_NOTIFY_TO';
    case 'sponsor':
      return 'SPONSOR_NOTIFY_TO';
    case 'lead':
      return 'LEAD_NOTIFY_TO';
    case 'partnership': {
      const bucket = PARTNERSHIP_TYPES.find((t) => t.value === partnershipType)?.bucket ?? 'content';
      return bucket === 'podcast' ? 'PODCAST_NOTIFY_TO' : bucket === 'nonprofit' ? 'NONPROFIT_NOTIFY_TO' : 'PARTNER_CONTENT_NOTIFY_TO';
    }
  }
}
