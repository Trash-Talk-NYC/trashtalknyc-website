import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IN_THE_NEWS, NEWS_LIVE } from '../media';
import { newsDate, newsItems, newsKindLabel, sortedNews, visibleNews, type NewsItem } from '../news';

const item = (title: string, date: string, link = 'https://example.com/story'): NewsItem => ({
  kind: 'article',
  title,
  outlet: 'The Outlet',
  date,
  link,
});

describe('sortedNews', () => {
  it('lists the newest coverage first', () => {
    const sorted = sortedNews([item('old', '2026-06-01'), item('new', '2026-10-01'), item('mid', '2026-08-15')]);
    expect(sorted.map((n) => n.title)).toEqual(['new', 'mid', 'old']);
  });

  it('refuses a malformed date or a relative link', () => {
    expect(() => sortedNews([item('a', 'Oct 2026')])).toThrow(/YYYY-MM-DD/);
    expect(() => sortedNews([item('a', '2026-10-01', '/story')])).toThrow(/full URL/);
  });

  it('ships only valid entries', () => {
    expect(() => sortedNews(newsItems)).not.toThrow();
  });
});

describe('visibleNews', () => {
  const real = item('real', '2026-10-01');
  const sample: NewsItem = { ...item('sample', '2026-09-01'), sample: true };

  it('shows samples only while the flag is on, and real coverage always', () => {
    expect(visibleNews([real, sample], true)).toEqual([real, sample]);
    expect(visibleNews([real, sample], false)).toEqual([real]);
  });

  it('keeps every shipped sample on a reserved example domain, so none can pass for real coverage', () => {
    for (const n of newsItems.filter((n) => n.sample)) expect(new URL(n.link).hostname).toBe('example.com');
  });
});

describe('newsKindLabel', () => {
  it('names both kinds in both languages', () => {
    expect(newsKindLabel('article')).toEqual({ en: 'Article', es: 'Artículo' });
    expect(newsKindLabel('podcast')).toEqual({ en: 'Podcast', es: 'Pódcast' });
  });
});

describe('newsDate', () => {
  it('writes the date in both languages without slipping a day', () => {
    expect(newsDate('2026-10-01')).toEqual({ en: 'October 1, 2026', es: '1 de octubre de 2026' });
    expect(newsDate('2026-12-31').en).toBe('December 31, 2026');
  });
});

// In The News is out of this release behind NEWS_LIVE: its page is kept as
// _in-the-news.astro (never routed) until the flag comes back on
describe('NEWS_LIVE', () => {
  it('builds the page exactly when NEWS_LIVE is on', () => {
    expect(existsSync(join(process.cwd(), `src/pages${IN_THE_NEWS.path}.astro`))).toBe(NEWS_LIVE);
    expect(existsSync(join(process.cwd(), `src/pages/_${IN_THE_NEWS.path.slice(1)}.astro`))).toBe(!NEWS_LIVE);
  });
});
