/**
 * The gallery (/more-media/gallery, captain 2026-10-15: "general gallery
 * -> by month") — the single source for its photos. Add a photo here and
 * the page files it under its month, newest month first.
 *
 * Photos are the captain's camera originals in src/assets/gallery/;
 * astro:assets re-encodes them (EXIF orientation applied, metadata
 * stripped) so only optimized webp ships. `taken` is the month from the
 * photo's own EXIF capture date. Alt text describes what is in the frame;
 * there are no invented captions.
 */
import type { ImageMetadata } from 'astro';
import treeWithShovels from '../assets/gallery/01-tree-with-shovels.jpg';
import plantUnderGrowLight from '../assets/gallery/02-plant-under-grow-light.jpg';
import labeledSeedlingCups from '../assets/gallery/03-labeled-seedling-cups.jpg';
import pegboardWorkbench from '../assets/gallery/04-pegboard-workbench.jpg';
import microscopePlantCutting from '../assets/gallery/05-microscope-plant-cutting.jpg';

type Copy = { en: string; es: string };

export interface GalleryPhoto {
  src: ImageMetadata;
  /** Capture month, YYYY-MM. */
  taken: string;
  alt: Copy;
}

export const galleryPhotos: GalleryPhoto[] = [
  {
    src: treeWithShovels,
    taken: '2026-09',
    alt: {
      en: 'A small potted tree beside two shovels and a bucket of tools, in front of a painted canvas',
      es: 'Un pequeño árbol en maceta junto a dos palas y un balde de herramientas, frente a un lienzo pintado',
    },
  },
  {
    src: plantUnderGrowLight,
    taken: '2026-09',
    alt: {
      en: 'A plant cutting in a jar of water under a grow light on a metal shelf',
      es: 'Un esqueje de planta en un frasco con agua bajo una lámpara de cultivo en un estante de metal',
    },
  },
  {
    src: labeledSeedlingCups,
    taken: '2026-09',
    alt: {
      en: 'Clear cups of soil with handwritten wooden plant labels on a shelf under a grow light',
      es: 'Vasos transparentes con tierra y etiquetas de madera escritas a mano en un estante bajo una lámpara de cultivo',
    },
  },
  {
    src: pegboardWorkbench,
    taken: '2026-09',
    alt: {
      en: 'A workbench with tools hung on a black pegboard and seed packets laid out on a green mat',
      es: 'Una mesa de trabajo con herramientas colgadas en un tablero perforado negro y sobres de semillas sobre una alfombrilla verde',
    },
  },
  {
    src: microscopePlantCutting,
    taken: '2026-09',
    alt: {
      en: 'A microscope next to a leafy plant cutting in a glass jar',
      es: 'Un microscopio junto a un esqueje de hojas en un frasco de vidrio',
    },
  },
];

export interface GalleryMonth {
  /** YYYY-MM */
  month: string;
  label: Copy;
  photos: GalleryPhoto[];
}

/** "September 2026" / "septiembre de 2026" for a YYYY-MM month. */
export function monthLabel(month: string): Copy {
  const [year, m] = month.split('-').map(Number);
  // Mid-month at noon UTC, so no timezone can tip it into another month
  const date = new Date(Date.UTC(year, m - 1, 15, 12));
  const fmt = (locale: string) => date.toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { en: fmt('en-US'), es: fmt('es-419') };
}

/** Photos grouped by capture month, newest month first; photo order kept inside a month. */
export function galleryByMonth(photos: GalleryPhoto[] = galleryPhotos): GalleryMonth[] {
  const months = new Map<string, GalleryPhoto[]>();
  for (const photo of photos) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(photo.taken)) throw new Error(`Gallery photo month must be YYYY-MM, got "${photo.taken}"`);
    months.set(photo.taken, [...(months.get(photo.taken) ?? []), photo]);
  }
  return [...months]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => ({ month, label: monthLabel(month), photos: list }));
}
