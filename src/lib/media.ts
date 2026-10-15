/**
 * More Media — the one place that defines the section's routes and
 * the copy shared between the overview page, its three subpages, the
 * nav dropdown, and the footer, so a rename or a new channel lands
 * everywhere at once.
 *
 * Channel URLs are NOT here: they live in socials.ts beside the other
 * placeholder links, so filling one in is a one-line change there.
 */
import { mediaLinks, socials } from './socials';

type Copy = { en: string; es: string };

export const MORE_MEDIA_PATH = '/more-media';

export type MediaSectionId = 'youtube' | 'podcast' | 'substack';

export interface MediaSection {
  id: MediaSectionId;
  /** Subpage route under MORE_MEDIA_PATH. */
  path: string;
  /** Brand name — identical in EN and ES on purpose. */
  label: string;
  blurb: Copy;
  /** One-word call to action on the overview poster (captain, 2026-10-09). */
  action: Copy;
  /** Off-site channel home; null while the captain hasn't supplied it. */
  channelHref: string | null;
  /**
   * True while the channel isn't ready: it is hidden from the nav, the
   * footer, and the More Media pages, and its route redirects to the
   * overview (captain, 2026-10-15: "Take off substack and podcast until
   * ready"). To launch one, flip this, add its page back (git history has
   * the old coming-soon pages), and drop its redirect in astro.config.mjs.
   */
  comingSoon: boolean;
}

const hrefOrNull = (link: { href: string; placeholder?: boolean }) => (link.placeholder ? null : link.href);

export const mediaSections: MediaSection[] = [
  {
    id: 'youtube',
    path: `${MORE_MEDIA_PATH}/youtube`,
    label: 'YouTube',
    blurb: {
      en: 'Longer videos from the cleanups, the crew, and everything around them.',
      es: 'Videos más largos de las limpiezas, el equipo y todo lo que pasa alrededor.',
    },
    action: { en: 'Watch', es: 'Ver' },
    channelHref: hrefOrNull(socials.youtube),
    comingSoon: false,
  },
  {
    id: 'podcast',
    path: `${MORE_MEDIA_PATH}/podcast`,
    label: 'Podcast',
    blurb: {
      en: 'Conversations about trash, our city, and the people trying to fix it.',
      es: 'Conversaciones sobre la basura, nuestra ciudad y la gente que intenta arreglarla.',
    },
    action: { en: 'Listen', es: 'Escuchar' },
    channelHref: hrefOrNull(mediaLinks.podcast),
    comingSoon: true,
  },
  {
    id: 'substack',
    path: `${MORE_MEDIA_PATH}/substack`,
    label: 'Substack',
    blurb: {
      en: 'Written stories, inside information, and articles from Trash Talk NYC.',
      es: 'Historias escritas, información de adentro y artículos de Trash Talk NYC.',
    },
    action: { en: 'Read', es: 'Leer' },
    channelHref: hrefOrNull(mediaLinks.substack),
    comingSoon: true,
  },
];

/** The channels people can actually visit today. */
export const liveMediaSections = mediaSections.filter((s) => !s.comingSoon);

export function getMediaSection(id: MediaSectionId): MediaSection {
  const section = mediaSections.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown More Media section "${id}"`);
  return section;
}

/**
 * The Gallery (captain, 2026-10-15: "general gallery -> by month"), which
 * replaced the Photo Albums pages — a More Media page that is not a
 * channel, so it sits outside mediaSections but joins the nav and the
 * subpage switcher. Photos live in src/lib/gallery.ts.
 */
export const GALLERY = {
  path: `${MORE_MEDIA_PATH}/gallery`,
  label: { en: 'Gallery', es: 'Galería' },
} as const;

/** The captain's line for the More Media hero (2026-10-09). */
export const moreMediaTagline: Copy = {
  en: 'Hear us talk trash across several platforms.',
  es: 'Escúchanos hablar de basura en varias plataformas.',
};

/**
 * The video the captain asked to embed on the YouTube subpage
 * (https://youtu.be/YZcCXZNZsCM). The caption paraphrases the video's
 * own YouTube title so the site keeps saying "Trash Talk NYC".
 */
export const featuredVideo = {
  id: 'YZcCXZNZsCM',
  caption: {
    en: 'Come visit Trash Talk NYC headquarters!',
    es: '¡Ven a visitar la sede de Trash Talk NYC!',
  } satisfies Copy,
  /** The player's accessible name (its iframe title). */
  title: {
    en: 'YouTube video: Come visit Trash Talk NYC headquarters!',
    es: 'Video de YouTube: ¡Ven a visitar la sede de Trash Talk NYC!',
  } satisfies Copy,
};

/** Privacy-enhanced embed host: no tracking cookies until playback. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}
