import type { ImageMetadata } from 'astro';
import adriansBags from '../assets/stickers/team/adrians-bags.png';
import baconEggCleanup from '../assets/stickers/team/bacon-egg-cleanup.png';
import birdMascot from '../assets/stickers/team/bird-mascot.png';
import cleaningGreeningNyc from '../assets/stickers/team/cleaning-greening-nyc.png';
import compost from '../assets/stickers/team/compost.png';
import grabber from '../assets/stickers/team/grabber.png';
import mouse from '../assets/stickers/team/mouse.png';
import thankSanitation from '../assets/stickers/team/thank-sanitation.png';
import trashBag from '../assets/stickers/team/trash-bag.png';
import treeGuard from '../assets/stickers/team/tree-guard.png';

/**
 * The team's own stickers (captain, 2026-11-19), which replaced the vest,
 * wordmark, and printed brand stickers everywhere the site used one as
 * decoration. The header and footer logos, the hero's wordmark, and The
 * Wall's partner stickers are not decoration and are not here.
 *
 * Each file is the team's transparent PNG trimmed and cut down to 480px on
 * its long side (2x the biggest spot it fills), with its own cream die-cut
 * edge, so pages only add a drop shadow. Purely decorative: always alt="".
 */
export const TEAM_STICKERS = {
  'adrians-bags': adriansBags,
  'bacon-egg-cleanup': baconEggCleanup,
  'bird-mascot': birdMascot,
  'cleaning-greening-nyc': cleaningGreeningNyc,
  compost,
  grabber,
  mouse,
  'thank-sanitation': thankSanitation,
  'trash-bag': trashBag,
  'tree-guard': treeGuard,
} satisfies Record<string, ImageMetadata>;

export type TeamStickerId = keyof typeof TEAM_STICKERS;

/**
 * Which sticker fills each decoration spot, by page. Spot IDs are stable
 * so the captain can say "put the mouse in TM1" and it's a one-line change
 * here; they ride on each sticker as `data-sticker-spot` (invisible) so the
 * walkthrough can label them. No page shows the same sticker twice
 * (`teamStickers.test.ts`).
 */
export const STICKER_SPOTS = {
  // Homepage: H1–H9 the hero's sticker bomb (H1–H5 also on phones), HM1
  // the sticker pinning the Instagram reel's card
  home: {
    H1: 'grabber',
    H2: 'trash-bag',
    H3: 'cleaning-greening-nyc',
    H4: 'bird-mascot',
    H5: 'thank-sanitation',
    H6: 'adrians-bags',
    H7: 'tree-guard',
    H8: 'bacon-egg-cleanup',
    H9: 'compost',
    HM1: 'mouse',
  },
  // The Team (/about): the group photo's corner
  team: { TM1: 'bird-mascot' },
  // More Media: the YouTube flyer's corner
  moreMedia: { MM1: 'thank-sanitation' },
  // More Media › YouTube: the video's corner
  youtube: { YT1: 'bacon-egg-cleanup' },
} as const satisfies Record<string, Record<string, TeamStickerId>>;

type Spots = typeof STICKER_SPOTS;
export type StickerPage = keyof Spots;

export interface PlacedSticker {
  spot: string;
  src: ImageMetadata;
}

export function spotSticker<P extends StickerPage>(page: P, spot: keyof Spots[P] & string): PlacedSticker {
  const id = (STICKER_SPOTS[page] as Record<string, TeamStickerId>)[spot];
  if (!id) throw new Error(`No sticker is assigned to spot ${spot} on ${page} (src/lib/teamStickers.ts)`);
  return { spot, src: TEAM_STICKERS[id] };
}

/**
 * Club Events has a sticker per flyer, and how many flyers there are comes
 * from Eventbrite, so its spots are numbered in page order instead: the
 * upcoming flyers take EV1, EV2, … and any past event with no photo at all
 * takes EP1, EP2, … from where the flyers left off. Every sticker is used
 * once before any repeats.
 */
export const EVENTS_STICKER_ORDER: readonly TeamStickerId[] = [
  'grabber',
  'tree-guard',
  'trash-bag',
  'adrians-bags',
  'compost',
  'mouse',
  'thank-sanitation',
  'cleaning-greening-nyc',
  'bacon-egg-cleanup',
  'bird-mascot',
];

export function eventsSticker(prefix: 'EV' | 'EP', index: number, offset = 0): PlacedSticker {
  const id = EVENTS_STICKER_ORDER[(offset + index) % EVENTS_STICKER_ORDER.length];
  return { spot: `${prefix}${index + 1}`, src: TEAM_STICKERS[id] };
}

/**
 * The sticker-bombed strip along the top of each upcoming event ticket on
 * desktop (the captain's S3a, 2026-11-24; phones keep the single corner
 * sticker). It starts with the card's own sticker (the same one its
 * phone corner shows), then the next ones in EVENTS_STICKER_ORDER, so a
 * card never repeats one. Neighboring cards start one along, so their
 * strips differ; with ten stickers, cards can share some. Spot IDs are
 * EV1.1, EV1.2, … under the card's own EVn.
 */
export function eventsStickerStrip(index: number, count = 7): PlacedSticker[] {
  if (count > EVENTS_STICKER_ORDER.length) {
    throw new Error(`A sticker strip can hold at most ${EVENTS_STICKER_ORDER.length} stickers without repeating one`);
  }
  return Array.from({ length: count }, (_, k) => ({
    spot: `EV${index + 1}.${k + 1}`,
    src: TEAM_STICKERS[EVENTS_STICKER_ORDER[(index + k) % EVENTS_STICKER_ORDER.length]],
  }));
}
