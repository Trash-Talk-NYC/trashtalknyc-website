import { describe, expect, it } from 'vitest';
import { newsDate, newsItems, sortedNews, type NewsItem } from '../news';

const item = (title: string, date: string, link = 'https://example.com/story'): NewsItem => ({
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

  it('ships with real entries only, all of them valid', () => {
    expect(() => sortedNews(newsItems)).not.toThrow();
  });
});

describe('newsDate', () => {
  it('writes the date in both languages without slipping a day', () => {
    expect(newsDate('2026-10-01')).toEqual({ en: 'October 1, 2026', es: '1 de octubre de 2026' });
    expect(newsDate('2026-12-31').en).toBe('December 31, 2026');
  });
});
