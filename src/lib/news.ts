/**
 * In The News (/in-the-news, captain 2026-10-19) — the single source for
 * the press coverage the page lists. Real, verified coverage only (the
 * 2026-11-24 press scout, firstmate data ttnyc-news-scout-n6): each entry
 * was checked to be about this David Clarke and @trashtalk_nyc.
 *
 * The page lists entries in this file's order, which is the captain's
 * (2026-11-24), not date order. Each is plain text, as the outlets'
 * terms allow: the outlet, the exact headline linking out, and the date.
 * No quotes (captain, 2026-11-24: "take out the quoting"), and no outlet
 * logos or pictures: none of
 * the outlets grants their use. Outlet names and headlines stay in
 * English in both languages; only the page's own labels translate.
 */

type Copy = { en: string; es: string };

export interface NewsItem {
  /** The publication or show, as it names itself. */
  outlet: string;
  /** The piece's exact headline, character for character (never translated). */
  title: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  /** The live piece. */
  link: string;
}

export const newsItems: NewsItem[] = [
  {
    outlet: 'ABC7 New York',
    title: 'Rubbish revolution: NYC man goes viral for cleaning up trash throughout city',
    date: '2026-05-30',
    link: 'https://abc7ny.com/post/columbia-university-grad-takes-cleaning-passion-nyc-streets-viral-social-media-videos/19194204/',
  },
  {
    outlet: 'Streetsblog NYC',
    title: "New York's Rampant Illegal Parking Stumps Viral Good Samaritan Street Cleaners",
    date: '2026-07-10',
    link: 'https://nyc.streetsblog.org/2026/07/10/new-yorks-rampant-illegal-parking-stumps-viral-good-samaritan-street-cleaners',
  },
  {
    outlet: 'WNYC All Of It',
    title: "Taking Out NYC's Trash, One Block at a Time",
    date: '2026-06-23',
    link: 'https://www.wnyc.org/story/taking-out-nycs-trash-one-block-at-a-time',
  },
  {
    outlet: 'The Mary Sue',
    title:
      "A Man Spent 100 Days Cleaning One Block of New York City Per Day. It Transformed His Neighborhood: 'The Story of Trash is The Story of People'",
    date: '2026-08-25',
    link: 'https://www.themarysue.com/a-man-spent-100-days-cleaning-his-one-block-of-new-york-city-per-day-it-transformed-his-neighborhood-the-story-of-trash-is-the-story-of-people/',
  },
  {
    outlet: 'Good News Network',
    title: "Neighbors Get Swept Up in Man's Viral Journey to Clean a NYC Street Block Every Day for 100 Days",
    date: '2026-09-04',
    link: 'https://www.goodnewsnetwork.org/neighbors-gets-swept-up-in-mans-viral-journey-to-clean-1-nyc-street-block-every-day-for-100-days/',
  },
];

/** The entries in their listed order; throws on a malformed entry so a typo can't ship. */
export function checkedNews(items: NewsItem[] = newsItems): NewsItem[] {
  for (const item of items) {
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.date)) {
      throw new Error(`In The News: date must be YYYY-MM-DD, got "${item.date}" for "${item.title}"`);
    }
    if (!/^https:\/\//.test(item.link)) {
      throw new Error(`In The News: link must be a full https URL, got "${item.link}" for "${item.title}"`);
    }
  }
  return items;
}

/** "October 19, 2026" / "19 de octubre de 2026" for a YYYY-MM-DD date. */
export function newsDate(date: string): Copy {
  const [y, m, d] = date.split('-').map(Number);
  // Noon UTC so no timezone can tip it into a neighboring day
  const when = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = (locale: string) => when.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return { en: fmt('en-US'), es: fmt('es-419') };
}
