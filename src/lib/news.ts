/**
 * In The News (/in-the-news, captain 2026-10-19) — the single source for
 * the press coverage the page lists: articles, podcasts, and other pieces
 * that feature Trash Talk NYC. Add an entry here and the page shows it,
 * newest first.
 *
 * Real coverage only, with one sanctioned exception: the sample entries
 * below (captain, 2026-10-21: "have dummy articles/podcast features"),
 * each marked `sample: true`, shown with a "Sample" mark, and shown at all
 * only while SHOW_SAMPLE_NEWS is true. Their outlets are generic on
 * purpose, never real publications. Turn the flag off (or delete the
 * samples) when real coverage arrives; with nothing to show the page says
 * "No clippings yet".
 *
 * Images are optional; put them in src/assets/news/ and import them so
 * they ship through astro:assets. Their alt text describes the picture.
 */
import type { ImageMetadata } from 'astro';

type Copy = { en: string; es: string };

/** Shows the sample entries; set to false once real coverage is in. */
export const SHOW_SAMPLE_NEWS = true;

export interface NewsItem {
  /** A written piece or a podcast feature. */
  kind: 'article' | 'podcast';
  /** The piece's own headline, as published (not translated). */
  title: string;
  /** The publication, show, or channel. */
  outlet: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  /** Where to read, watch, or listen. */
  link: string;
  image?: { src: ImageMetadata; alt: Copy };
  /** A made-up entry that shows the layout; never real coverage. */
  sample?: true;
}

// Sample links use example.com (reserved for examples, RFC 2606), and the
// page never links a sample anywhere
export const newsItems: NewsItem[] = [
  {
    kind: 'article',
    title: 'The grabber brigade: how one daily cleanup became a citywide club',
    outlet: 'Neighborhood Gazette',
    date: '2026-10-12',
    link: 'https://example.com/sample-1',
    sample: true,
  },
  {
    kind: 'podcast',
    title: 'Talking trash with Trash Talk NYC',
    outlet: 'Five Borough Podcast',
    date: '2026-09-28',
    link: 'https://example.com/sample-2',
    sample: true,
  },
  {
    kind: 'article',
    title: 'Volunteers clear an uptown block in under two hours',
    outlet: 'Uptown Ledger',
    date: '2026-09-03',
    link: 'https://example.com/sample-3',
    sample: true,
  },
  {
    kind: 'podcast',
    title: 'Cleanup clubs and the city that never sweeps',
    outlet: 'Curbside Conversations',
    date: '2026-08-19',
    link: 'https://example.com/sample-4',
    sample: true,
  },
  {
    kind: 'article',
    title: 'Tree guards, built by neighbors',
    outlet: 'Borough Bulletin',
    date: '2026-07-30',
    link: 'https://example.com/sample-5',
    sample: true,
  },
  {
    kind: 'podcast',
    title: 'Why a cleanup video took over our feeds',
    outlet: 'Sidewalk Sessions',
    date: '2026-06-14',
    link: 'https://example.com/sample-6',
    sample: true,
  },
];

/** The entries the page shows: real ones always, samples only while the flag is on. */
export function visibleNews(items: NewsItem[] = newsItems, showSamples: boolean = SHOW_SAMPLE_NEWS): NewsItem[] {
  return items.filter((item) => showSamples || !item.sample);
}

/** "Article" / "Podcast" in both languages. */
export function newsKindLabel(kind: NewsItem['kind']): Copy {
  return kind === 'podcast' ? { en: 'Podcast', es: 'Pódcast' } : { en: 'Article', es: 'Artículo' };
}

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
