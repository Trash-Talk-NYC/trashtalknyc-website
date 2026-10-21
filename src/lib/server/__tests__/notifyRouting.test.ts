import { describe, expect, it } from 'vitest';
import { notifyRoute } from '../notifyRouting';
import { PARTNERSHIP_TYPE_VALUES } from '../../leadOptions';

describe('notifyRoute', () => {
  it('gives each inquiry kind its own tag and inbox var', () => {
    expect(notifyRoute('general')).toEqual({ tag: '[General]', envVar: 'CONTACT_NOTIFY_TO' });
    expect(notifyRoute('sponsor')).toEqual({ tag: '[Sponsorship]', envVar: 'SPONSOR_NOTIFY_TO' });
    expect(notifyRoute('lead')).toEqual({ tag: '[Lead a cleanup]', envVar: 'LEAD_NOTIFY_TO' });
  });

  it('routes every partnership kind to one of the three partner categories', () => {
    expect(notifyRoute('partnership', 'podcast')).toEqual({ tag: '[Podcast]', envVar: 'PODCAST_NOTIFY_TO' });
    expect(notifyRoute('partnership', 'nonprofit')).toEqual({ tag: '[Nonprofit]', envVar: 'NONPROFIT_NOTIFY_TO' });
    const routes = new Set(PARTNERSHIP_TYPE_VALUES.map((t) => notifyRoute('partnership', t).tag));
    expect([...routes].sort()).toEqual(['[Content]', '[Nonprofit]', '[Podcast]']);
  });
});
