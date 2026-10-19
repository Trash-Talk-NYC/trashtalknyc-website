/**
 * In The News (/in-the-news, captain 2026-10-19) — the single source for
 * the press coverage the page lists: articles, podcasts, and other pieces
 * that feature Trash Talk NYC. Add an entry here and the page shows it,
 * newest first.
 *
 * Only real coverage goes here — never an invented or placeholder entry.
 * While the list is empty the page says so plainly.
 *
 * Images are optional; put them in src/assets/news/ and import them so
 * they ship through astro:assets. Their alt text describes the picture.
 */
import type { ImageMetadata } from 'astro';

type Copy = { en: string; es: string };

export interface NewsItem {
  /** The piece's own headline, as published (not translated). */
  title: string;
  /** The publication, show, or channel. */
  outlet: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  /** Where to read, watch, or listen. */
  link: string;
  image?: { src: ImageMetadata; alt: Copy };
}

export const newsItems: NewsItem[] = [];

/** Entries newest first; throws on a malformed date so a typo can't misorder the page. */
export function sortedNews(items: NewsItem[] = newsItems): NewsItem[] {
  for (const item of items) {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.date)) {
      throw new Error(`In The News: date must be YYYY-MM-DD, got "${item.date}" for "${item.title}"`);
    }
    if (!/^https?:\/\//.test(item.link)) {
      throw new Error(`In The News: link must be a full URL, got "${item.link}" for "${item.title}"`);
    }
  }
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

/** "October 19, 2026" / "19 de octubre de 2026" for a YYYY-MM-DD date. */
export function newsDate(date: string): Copy {
  const [y, m, d] = date.split('-').map(Number);
  // Noon UTC so no timezone can tip it into a neighboring day
  const when = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = (locale: string) => when.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return { en: fmt('en-US'), es: fmt('es-419') };
}
