/**
 * Stickers on the Wall (/stickers-on-the-wall, captain 2026-10-21, mockup
 * W1) — the single source for the partners the page thanks. Each partner
 * is a sticker bombed on the wall, and the sticker's size goes by tier:
 * City partners large, Borough partners medium, Block partners small.
 * Peeling a sticker shows the partner's name, tier, what they did, and a
 * link to their site.
 *
 * A partner's `logo` is optional: until one exists the page prints a
 * styled text sticker from `look` (or the next default look). Logos go in
 * src/assets/partners/ and ship through astro:assets.
 *
 * Real partners only, except the sample entries below: each is marked
 * `sample: true`, uses a made-up name from the mockup and an example.com
 * link, and shows only while SHOW_SAMPLE_PARTNERS is true, with a
 * "Sample partners" mark on the wall. Turn the flag off (or delete the
 * samples) when real partners are in.
 */
import type { ImageMetadata } from 'astro';

type Copy = { en: string; es: string };

/** Shows the sample partners; set to false once real partners are in. */
export const SHOW_SAMPLE_PARTNERS = true;

export const STICKERS_PATH = '/stickers-on-the-wall';

export type PartnerTier = 'city' | 'borough' | 'block';

/** A text sticker's print: paper and ink colors, die shape, and face. */
export interface StickerLook {
  bg: string;
  fg: string;
  shape: 'circle' | 'round' | 'oval' | 'rect' | 'star';
  font: 'tab' | 'display' | 'mono' | 'hand' | 'blackletter';
}

export interface Partner {
  /** The partner's name, as they write it (not translated). */
  name: string;
  tier: PartnerTier;
  /** What they did with Trash Talk NYC. */
  blurb: Copy;
  /** Their site. */
  url: string;
  logo?: { src: ImageMetadata; alt: Copy };
  look?: StickerLook;
  /** A made-up partner that shows the layout; never a real one. */
  sample?: true;
}

export const TIER_LABEL: Record<PartnerTier, Copy> = {
  city: { en: 'City partner', es: 'Socio de la ciudad' },
  borough: { en: 'Borough partner', es: 'Socio del condado' },
  block: { en: 'Block partner', es: 'Socio de la cuadra' },
};

/** Sticker width in px per tier (the mockup's 180 / 124 / 84). */
export const TIER_SIZE: Record<PartnerTier, number> = { city: 180, borough: 124, block: 84 };

// Brand ink plus the mockup's sticker red, cycled for partners without a look
const DEFAULT_LOOKS: StickerLook[] = [
  { bg: '#F3CF02', fg: '#1D1D23', shape: 'circle', font: 'tab' },
  { bg: '#4E6E65', fg: '#F1F0E4', shape: 'round', font: 'display' },
  { bg: '#D8372B', fg: '#FFFFFF', shape: 'oval', font: 'tab' },
  { bg: '#1D1D23', fg: '#F3CF02', shape: 'rect', font: 'mono' },
  { bg: '#A57DD7', fg: '#1D1D23', shape: 'star', font: 'display' },
];

/** The partner's own look, or a default one by its place on the wall. */
export function stickerLook(partner: Partner, index: number): StickerLook {
  return partner.look ?? DEFAULT_LOOKS[index % DEFAULT_LOOKS.length];
}

export const partners: Partner[] = [
  {
    name: 'Bodega Brothers',
    tier: 'city',
    blurb: { en: 'Gave gloves and bags for every 2026 cleanup', es: 'Donó guantes y bolsas para cada limpieza de 2026' },
    url: 'https://example.com/bodega-brothers',
    look: { bg: '#F3CF02', fg: '#1D1D23', shape: 'circle', font: 'tab' },
    sample: true,
  },
  {
    name: 'Greenpoint Coffee Co.',
    tier: 'city',
    blurb: { en: 'Sponsored the tree guard build', es: 'Patrocinó la construcción de protectores de árboles' },
    url: 'https://example.com/greenpoint-coffee',
    look: { bg: '#4E6E65', fg: '#F1F0E4', shape: 'round', font: 'display' },
    sample: true,
  },
  {
    name: 'Five Boro Bikes',
    tier: 'borough',
    blurb: { en: 'Hauled supplies to Queens events', es: 'Llevó materiales a los eventos de Queens' },
    url: 'https://example.com/five-boro-bikes',
    look: { bg: '#D8372B', fg: '#FFFFFF', shape: 'oval', font: 'tab' },
    sample: true,
  },
  {
    name: 'Hudson Hardware',
    tier: 'borough',
    blurb: { en: 'Donated shovels and rakes', es: 'Donó palas y rastrillos' },
    url: 'https://example.com/hudson-hardware',
    look: { bg: '#1D1D23', fg: '#F3CF02', shape: 'rect', font: 'mono' },
    sample: true,
  },
  {
    name: 'Mott St Noodles',
    tier: 'block',
    blurb: { en: 'Fed volunteers after the Chinatown cleanup', es: 'Dio de comer a los voluntarios después de la limpieza de Chinatown' },
    url: 'https://example.com/mott-st-noodles',
    look: { bg: '#FFFFFF', fg: '#D8372B', shape: 'circle', font: 'hand' },
    sample: true,
  },
  {
    name: 'Queens Print Shop',
    tier: 'borough',
    blurb: { en: 'Printed our flyers at cost', es: 'Imprimió nuestros volantes a precio de costo' },
    url: 'https://example.com/queens-print-shop',
    look: { bg: '#A57DD7', fg: '#1D1D23', shape: 'star', font: 'display' },
    sample: true,
  },
  {
    name: 'Ridgewood Records',
    tier: 'block',
    blurb: { en: 'Hosted a block party cleanup', es: 'Organizó una limpieza con fiesta de cuadra' },
    url: 'https://example.com/ridgewood-records',
    look: { bg: '#F1F0E4', fg: '#65409A', shape: 'round', font: 'blackletter' },
    sample: true,
  },
  {
    name: 'Harlem Hoops League',
    tier: 'block',
    blurb: { en: 'Cleaned the courts with us', es: 'Limpió las canchas con nosotros' },
    url: 'https://example.com/harlem-hoops',
    look: { bg: '#F3CF02', fg: '#65409A', shape: 'oval', font: 'tab' },
    sample: true,
  },
  {
    name: 'Sunset Park Florist',
    tier: 'block',
    blurb: { en: 'Planted tree beds with us', es: 'Plantó canteros con nosotros' },
    url: 'https://example.com/sunset-park-florist',
    look: { bg: '#CFE3D8', fg: '#4E6E65', shape: 'circle', font: 'hand' },
    sample: true,
  },
  {
    name: 'Bronx Grill',
    tier: 'block',
    blurb: { en: 'Sponsored a Bronx River cleanup', es: 'Patrocinó una limpieza del río Bronx' },
    url: 'https://example.com/bronx-grill',
    look: { bg: '#D8372B', fg: '#F3CF02', shape: 'rect', font: 'tab' },
    sample: true,
  },
];

/** The partners the wall shows: real ones always, samples only while the flag is on. */
export function visiblePartners(list: Partner[] = partners, showSamples: boolean = SHOW_SAMPLE_PARTNERS): Partner[] {
  return list.filter((p) => showSamples || !p.sample);
}

/** Biggest support first, so City stickers take the first (central) spots. */
export function partnersByTier(list: Partner[]): Partner[] {
  const rank: Record<PartnerTier, number> = { city: 0, borough: 1, block: 2 };
  return [...list].sort((a, b) => rank[a.tier] - rank[b.tier]);
}
