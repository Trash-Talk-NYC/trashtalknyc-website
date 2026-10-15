import { describe, expect, it } from 'vitest';
import { notifyRecipientVar } from '../notifyRouting';
import { PARTNERSHIP_TYPE_VALUES } from '../../leadOptions';

describe('notifyRecipientVar', () => {
  it('gives each inquiry kind its own inbox var', () => {
    expect(notifyRecipientVar('general')).toBe('CONTACT_NOTIFY_TO');
    expect(notifyRecipientVar('sponsor')).toBe('SPONSOR_NOTIFY_TO');
    expect(notifyRecipientVar('lead')).toBe('LEAD_NOTIFY_TO');
  });

  it('routes every partnership kind to one of the three partner inboxes', () => {
    const vars = new Set(PARTNERSHIP_TYPE_VALUES.map((t) => notifyRecipientVar('partnership', t)));
    expect([...vars].sort()).toEqual(['NONPROFIT_NOTIFY_TO', 'PARTNER_CONTENT_NOTIFY_TO', 'PODCAST_NOTIFY_TO']);
  });
});
