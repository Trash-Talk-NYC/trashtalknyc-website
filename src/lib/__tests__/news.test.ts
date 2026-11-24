import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IN_THE_NEWS, NEWS_LIVE } from '../media';
import { checkedNews, newsDate, newsItems, type NewsItem } from '../news';

const item = (title: string, date: string, link = 'https://example.com/story'): NewsItem => ({
  title,
  outlet: 'The Outlet',
  date,
  link,
});

describe('checkedNews', () => {
  it('keeps the listed order rather than sorting by date', () => {
    const listed = checkedNews([item('old', '2026-06-01'), item('new', '2026-10-01'), item('mid', '2026-08-15')]);
    expect(listed.map((n) => n.title)).toEqual(['old', 'new', 'mid']);
  });

  it('refuses a malformed date or a link that is not a full https URL', () => {
    expect(() => checkedNews([item('a', 'Oct 2026')])).toThrow(/YYYY-MM-DD/);
    expect(() => checkedNews([item('a', '2026-10-01', '/story')])).toThrow(/https URL/);
    expect(() => checkedNews([item('a', '2026-10-01', 'http://example.com/story')])).toThrow(/https URL/);
  });

  it('ships only valid entries', () => {
    expect(() => checkedNews(newsItems)).not.toThrow();
  });
});

// The captain's five verified clippings (2026-11-24), in the captain's order
describe('newsItems', () => {
  it('lists the verified coverage in the captain\'s order', () => {
    expect(newsItems.map((n) => n.outlet)).toEqual([
      'ABC7 New York',
      'Streetsblog NYC',
      'WNYC All Of It',
      'The Mary Sue',
      'Good News Network',
    ]);
  });

  it('carries no placeholder entries', () => {
    for (const n of newsItems) expect(new URL(n.link).hostname).not.toBe('example.com');
  });

  it('quotes WNYC as the captain chose and Good News Network not at all', () => {
    expect(newsItems.find((n) => n.outlet === 'WNYC All Of It')?.quote).toBe(
      'I do think the best stewards for a neighborhood are going to be the people who live there.',
    );
    expect(newsItems.find((n) => n.outlet === 'Good News Network')?.quote).toBeUndefined();
  });

  it('keeps each quote to one short sentence', () => {
    for (const n of newsItems) if (n.quote) expect(n.quote.split(/[.!?](\s|$)/).filter((x) => x?.trim()).length).toBe(1);
  });
});

describe('newsDate', () => {
  it('writes the date in both languages without slipping a day', () => {
    expect(newsDate('2026-10-01')).toEqual({ en: 'October 1, 2026', es: '1 de octubre de 2026' });
    expect(newsDate('2026-12-31').en).toBe('December 31, 2026');
  });
});

// NEWS_LIVE and the page file must agree: off, the page is parked as
// _in-the-news.astro (never routed)
describe('NEWS_LIVE', () => {
  it('builds the page exactly when NEWS_LIVE is on', () => {
    expect(existsSync(join(process.cwd(), `src/pages${IN_THE_NEWS.path}.astro`))).toBe(NEWS_LIVE);
    expect(existsSync(join(process.cwd(), `src/pages/_${IN_THE_NEWS.path.slice(1)}.astro`))).toBe(!NEWS_LIVE);
  });
});
