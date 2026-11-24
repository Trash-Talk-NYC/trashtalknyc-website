import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IN_THE_NEWS, NEWS_LIVE } from '../media';
import { checkedNews, newsByYear, newsDate, newsItems, newsMonth, type NewsItem } from '../news';

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

// The captain's five verified clippings (2026-11-24)
describe('newsItems', () => {
  it('holds the five verified pieces', () => {
    expect(newsItems.map((n) => n.outlet).sort()).toEqual([
      'ABC7 New York',
      'Good News Network',
      'Streetsblog NYC',
      'The Mary Sue',
      'WNYC All Of It',
    ]);
  });

  it('carries no placeholder entries', () => {
    for (const n of newsItems) expect(new URL(n.link).hostname).not.toBe('example.com');
  });
});

describe('newsByYear', () => {
  it('groups by year, newest year first and newest piece first within it', () => {
    const years = newsByYear([item('a', '2025-12-01'), item('b', '2026-03-01'), item('c', '2026-09-01'), item('d', '2025-01-01')]);
    expect(years.map((y) => y.year)).toEqual(['2026', '2025']);
    expect(years[0].items.map((n) => n.title)).toEqual(['c', 'b']);
    expect(years[1].items.map((n) => n.title)).toEqual(['a', 'd']);
  });

  it('puts the shipped coverage newest first', () => {
    expect(newsByYear()[0].items[0].outlet).toBe('Good News Network');
  });
});

describe('newsMonth', () => {
  it('names the month in both languages', () => {
    expect(newsMonth('2026-09-04')).toEqual({ en: 'September', es: 'septiembre' });
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
