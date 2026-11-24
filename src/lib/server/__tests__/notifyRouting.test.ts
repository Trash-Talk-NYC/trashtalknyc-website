import { describe, expect, it } from 'vitest';
import { mentionsPodcast, notifyRoute, resolveRecipients, type NotifyVar } from '../notifyRouting';
import { PARTNERSHIP_TYPE_VALUES, type PartnershipType } from '../../leadOptions';

// The captain's addresses (2026-11-24), as the vars hold them on Netlify
const INBOXES: Record<NotifyVar, string> = {
  CONTACT_NOTIFY_TO: 'contact@trashtalknyc.org',
  SPONSOR_NOTIFY_TO: 'partners@trashtalknyc.org',
  LEAD_NOTIFY_TO: 'events@trashtalknyc.org',
  PARTNER_CONTENT_NOTIFY_TO: 'partners@trashtalknyc.org',
  PODCAST_NOTIFY_TO: 'podcast@trashtalknyc.org',
  NONPROFIT_NOTIFY_TO: 'partners@trashtalknyc.org',
};

function inboxesFor(...args: Parameters<typeof notifyRoute>): string[] {
  return resolveRecipients(notifyRoute(...args).envVars, (name) => INBOXES[name]).recipients.map((r) => r.email);
}

describe('notifyRoute', () => {
  it('sends each tile to its inbox with its own tag', () => {
    expect(notifyRoute('general')).toEqual({ tag: '[General]', envVars: ['CONTACT_NOTIFY_TO'] });
    expect(notifyRoute('sponsor')).toEqual({ tag: '[Brand partnership]', envVars: ['SPONSOR_NOTIFY_TO'] });
    expect(notifyRoute('lead')).toEqual({ tag: '[Lead a cleanup]', envVars: ['LEAD_NOTIFY_TO'] });
    expect(inboxesFor('general')).toEqual(['contact@trashtalknyc.org']);
    expect(inboxesFor('sponsor')).toEqual(['partners@trashtalknyc.org']);
    expect(inboxesFor('lead')).toEqual(['events@trashtalknyc.org']);
  });

  it.each<[PartnershipType, string, string[]]>([
    ['content-collaboration', '[Content]', ['partners@trashtalknyc.org']],
    ['content-creation', '[Content]', ['partners@trashtalknyc.org']],
    ['influencer', '[Content]', ['partners@trashtalknyc.org']],
    ['podcast', '[Podcast]', ['podcast@trashtalknyc.org', 'partners@trashtalknyc.org']],
    ['nonprofit', '[Nonprofit]', ['partners@trashtalknyc.org']],
    ['corporate-event', '[Content]', ['partners@trashtalknyc.org', 'events@trashtalknyc.org']],
    ['other', '[Content]', ['partners@trashtalknyc.org']],
  ])('routes a %s partnership', (kind, tag, inboxes) => {
    expect(notifyRoute('partnership', { partnershipTypes: [kind] }).tag).toBe(tag);
    expect(inboxesFor('partnership', { partnershipTypes: [kind] })).toEqual(inboxes);
  });

  it('covers every partnership choice', () => {
    for (const kind of PARTNERSHIP_TYPE_VALUES) {
      expect(notifyRoute('partnership', { partnershipTypes: [kind] }).envVars.length).toBeGreaterThan(0);
    }
  });

  it('gives several picked kinds every inbox once', () => {
    const route = notifyRoute('partnership', { partnershipTypes: ['corporate-event', 'podcast', 'influencer'] });
    expect(route.envVars).toEqual(['PARTNER_CONTENT_NOTIFY_TO', 'PODCAST_NOTIFY_TO', 'LEAD_NOTIFY_TO']);
    expect(inboxesFor('partnership', { partnershipTypes: ['corporate-event', 'podcast', 'influencer'] }).sort()).toEqual([
      'events@trashtalknyc.org',
      'partners@trashtalknyc.org',
      'podcast@trashtalknyc.org',
    ]);
  });

  it('tags several kinds in choice-list order, each tag once, however they were ticked', () => {
    expect(notifyRoute('partnership', { partnershipTypes: ['nonprofit', 'influencer', 'podcast', 'other'] }).tag).toBe(
      '[Content] [Podcast] [Nonprofit]',
    );
  });

  it('still reaches partners@ if a partnership arrives with no kind', () => {
    expect(inboxesFor('partnership', { partnershipTypes: [] })).toEqual(['partners@trashtalknyc.org']);
  });

  it.each(['We host a podcast', 'PODCAST collab', 'Tenemos un pódcast', 'NUESTRO PÓDCAST', 'two podcasts', 'pódcast'])(
    'copies podcast@ on a Partner or Brand Partner message that says %j',
    (message) => {
      for (const kind of ['partnership', 'sponsor'] as const) {
        const inboxes = inboxesFor(kind, { partnershipTypes: ['influencer'], message });
        expect(inboxes).toContain('podcast@trashtalknyc.org');
        expect(inboxes).toContain('partners@trashtalknyc.org');
        expect(new Set(inboxes).size).toBe(inboxes.length);
      }
    },
  );

  it('keeps the tag when the keyword adds the copy', () => {
    expect(notifyRoute('sponsor', { message: 'our podcast' }).tag).toBe('[Brand partnership]');
  });

  it('copies podcast@ only for Partner and Brand Partner messages', () => {
    expect(inboxesFor('general', { message: 'I love your podcast' })).toEqual(['contact@trashtalknyc.org']);
    expect(inboxesFor('lead', { message: 'podcast' })).toEqual(['events@trashtalknyc.org']);
    expect(inboxesFor('partnership', { partnershipTypes: ['influencer'], message: 'a video series' })).toEqual([
      'partners@trashtalknyc.org',
    ]);
  });
});

describe('mentionsPodcast', () => {
  it('ignores words that only look close', () => {
    expect(mentionsPodcast('pod cast')).toBe(false);
    expect(mentionsPodcast('broadcast')).toBe(false);
  });
});

describe('resolveRecipients', () => {
  it('lists an address once however many vars hold it, ignoring case and spaces', () => {
    const env: Partial<Record<NotifyVar, string>> = {
      PARTNER_CONTENT_NOTIFY_TO: 'partners@trashtalknyc.org, Ana@example.com',
      PODCAST_NOTIFY_TO: ' Partners@TrashTalkNYC.org ,podcast@trashtalknyc.org',
    };
    expect(resolveRecipients(['PARTNER_CONTENT_NOTIFY_TO', 'PODCAST_NOTIFY_TO'], (n) => env[n])).toEqual({
      recipients: [{ email: 'partners@trashtalknyc.org' }, { email: 'Ana@example.com' }, { email: 'podcast@trashtalknyc.org' }],
      unset: [],
    });
  });

  it('reports each unset or empty var and keeps the configured ones, never substituting another inbox', () => {
    const env: Partial<Record<NotifyVar, string>> = { PARTNER_CONTENT_NOTIFY_TO: 'partners@trashtalknyc.org', LEAD_NOTIFY_TO: ' , ' };
    expect(
      resolveRecipients(['PODCAST_NOTIFY_TO', 'PARTNER_CONTENT_NOTIFY_TO', 'LEAD_NOTIFY_TO'], (n) => env[n]),
    ).toEqual({ recipients: [{ email: 'partners@trashtalknyc.org' }], unset: ['PODCAST_NOTIFY_TO', 'LEAD_NOTIFY_TO'] });
  });
});
