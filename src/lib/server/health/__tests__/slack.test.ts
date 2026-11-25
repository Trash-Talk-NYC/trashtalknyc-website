import { describe, expect, it, vi } from 'vitest';
import { formatHealthMessage, postToSlack } from '../slack';
import type { CheckResult } from '../checks';

// 8:00 a.m. in New York (EST)
const at = new Date('2026-11-26T13:00:00Z');

const passing: CheckResult[] = [
  { name: 'Brevo API', ok: true, detail: 'key valid' },
  { name: 'Production pages', ok: true, detail: '/ /events/ all 200' },
];

describe('formatHealthMessage', () => {
  it('says everything passed in the header, then one green line per check', () => {
    const { text } = formatHealthMessage(passing, { at, target: 'trashtalknyc.org' });
    const [header, ...lines] = text.split('\n');
    expect(header).toBe(':white_check_mark: *Site health: all 2 checks passed* · Thu, Nov 26, 8:00 AM ET · trashtalknyc.org');
    expect(lines).toEqual([':large_green_circle: *Brevo API*: key valid', ':large_green_circle: *Production pages*: / /events/ all 200']);
  });

  it('names every failing check in the header and marks its line red', () => {
    const results: CheckResult[] = [
      ...passing,
      { name: 'Eventbrite events', ok: false, detail: 'API request failed (upcoming events)' },
      { name: 'Brevo form lists', ok: false, detail: '16 lead a cleanup unreadable (404: document_not_found)' },
    ];
    const { text } = formatHealthMessage(results, { at, target: 'trashtalknyc.org' });
    const [header, ...lines] = text.split('\n');
    expect(header).toContain(':rotating_light: *Site health: 2 of 4 failing: Eventbrite events, Brevo form lists*');
    expect(lines[2]).toBe(':red_circle: *Eventbrite events*: API request failed (upcoming events)');
  });

  it('flags a check that passed only on its retry', () => {
    const { text } = formatHealthMessage([{ name: 'Brevo API', ok: true, detail: 'key valid', retried: true }], { at, target: 't' });
    expect(text.split('\n')[1]).toBe(':large_green_circle: *Brevo API*: key valid _(passed on retry)_');
  });

  it("escapes Slack's control characters so a detail can't become a link or mention", () => {
    const { text } = formatHealthMessage([{ name: 'Routing', ok: false, detail: 'General → <!channel> & <https://x|y>' }], { at, target: 't' });
    expect(text).toContain('General → &lt;!channel&gt; &amp; &lt;https://x|y&gt;');
  });
});

describe('postToSlack', () => {
  it('posts the message as JSON and returns the webhook status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    expect(await postToSlack('https://hooks.example/x', { text: 'hi' }, fetchImpl)).toBe(200);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ text: 'hi' });
  });

  it('returns 0 instead of throwing when the webhook is unreachable', async () => {
    expect(await postToSlack('https://hooks.example/x', { text: 'hi' }, vi.fn().mockRejectedValue(new Error('down')))).toBe(0);
  });
});
