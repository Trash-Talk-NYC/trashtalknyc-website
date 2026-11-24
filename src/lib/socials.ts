/**
 * The club's social channels — single source for every surface that
 * lists them (footer, homepage sticker tiles, the Events page). Icon paths
 * are the 24×24 glyphs the approved mockups use.
 *
 * A channel without a real URL yet uses href '#' with `placeholder: true`
 * (rendered without target=_blank); all are real since 2026-10-09, and
 * Spotify (the podcast) joined on 2026-11-24.
 */

export type SocialId = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'facebook' | 'spotify' | 'eventbrite';

export interface SocialChannel {
  id: SocialId;
  /** Brand name — identical in EN and ES on purpose. */
  label: string;
  /** Handle or account name shown on the homepage tiles. */
  handle: string;
  href: string;
  /** True while the captain hasn't supplied the real URL yet. */
  placeholder?: boolean;
  /** SVG path data for a 24×24 viewBox, filled with currentColor. */
  path: string;
}

export const socials: Record<SocialId, SocialChannel> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    handle: '@trashtalk_nyc',
    href: 'https://www.instagram.com/trashtalk_nyc/',
    path: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zm0 4.8a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-9.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    handle: '@trashtalk_nyc',
    href: 'https://www.tiktok.com/@trashtalk_nyc',
    path: 'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.3V2h-3.4v13.7a2.9 2.9 0 1 1-2.1-2.8V9.4a6.3 6.3 0 1 0 5.5 6.3V8.7a8.2 8.2 0 0 0 4.8 1.5V6.8z',
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    handle: '@trash-talk-nyc',
    href: 'https://www.youtube.com/@trash-talk-nyc',
    path: 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'Trash Talk NYC',
    href: 'https://www.linkedin.com/company/trash-talk-nyc/',
    path: 'M20.4 20.5h-3.5v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.3zM5.3 7.4a2 2 0 1 1 0-4.1 2 2 0 0 1 0 4.1zm1.8 13.1H3.6V9h3.5z',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    handle: 'Trash Talk NYC',
    href: 'https://www.facebook.com/p/Trash-Talk-NYC-61589884530275/',
    path: 'M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z',
  },
  // The Trash Talk NYC podcast (captain, 2026-11-24), without the share
  // link's ?si= tracking parameter
  spotify: {
    id: 'spotify',
    label: 'Spotify',
    handle: 'Trash Talk NYC',
    href: 'https://open.spotify.com/show/796d9SSI5ISlX5IRnxsvNW',
    path: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z',
  },
  // Where the club's events are listed and RSVPs happen (captain,
  // 2026-10-15: events go to Instagram stories and Eventbrite only). Not a
  // social feed, so it stays off the footer and homepage rows. The glyph
  // is Eventbrite's lowercase "e".
  eventbrite: {
    id: 'eventbrite',
    label: 'Eventbrite',
    handle: 'trashtalknyc',
    href: 'https://trashtalknyc.eventbrite.com',
    path: 'M12 3a9 9 0 1 0 6.9 14.8l-2.3-1.9A6 6 0 0 1 6.1 13.4h14.8c.1-.5.1-.9.1-1.4a9 9 0 0 0-9-9zm-5.8 7.6a6 6 0 0 1 11.6 0z',
  },
};

export function getSocials(ids: SocialId[]): SocialChannel[] {
  return ids.map((id) => socials[id]);
}

/**
 * Long-form channels that have no sticker icon yet but still need a
 * home URL — the More Media pages link out from here.
 *
 * TODO(captain): the real Substack URL. Until then it stays
 * `placeholder: true` and More Media leaves it out (no invented posts).
 * The podcast's home is socials.spotify.
 */
export type MediaLinkId = 'substack';

export interface MediaLink {
  id: MediaLinkId;
  label: string;
  href: string;
  placeholder?: boolean;
}

export const mediaLinks: Record<MediaLinkId, MediaLink> = {
  substack: { id: 'substack', label: 'Substack', href: '#', placeholder: true },
};
