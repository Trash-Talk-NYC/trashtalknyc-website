/**
 * The gallery (/more-media/gallery, captain 2026-10-15: "general gallery
 * -> by month") — the single source for its photos. Add a photo here and
 * the page files it under its month, newest month first.
 *
 * Photos are the captain's in src/assets/gallery/: the September camera
 * originals, and web-optimized WebP derivatives of the 10.14 photo walk
 * (2000px long edge, metadata stripped; the originals stay out of the
 * repo). astro:assets re-encodes all of them so only optimized webp ships. `taken` is the month from the
 * photo's own EXIF capture date. Alt text describes what is in the frame;
 * there are no invented captions.
 */
import type { ImageMetadata } from 'astro';
import treeWithShovels from '../assets/gallery/01-tree-with-shovels.jpg';
import plantUnderGrowLight from '../assets/gallery/02-plant-under-grow-light.jpg';
import labeledSeedlingCups from '../assets/gallery/03-labeled-seedling-cups.jpg';
import pegboardWorkbench from '../assets/gallery/04-pegboard-workbench.jpg';
import microscopePlantCutting from '../assets/gallery/05-microscope-plant-cutting.jpg';
import canLidWall from '../assets/gallery/06-can-lid-wall.webp';
import dropGarbageSign from '../assets/gallery/07-drop-garbage-sign.webp';
import stickerTrashCan from '../assets/gallery/08-sticker-trash-can.webp';
import bridgeMural from '../assets/gallery/09-bridge-mural.webp';
import dreamMural from '../assets/gallery/10-dream-mural.webp';
import knicksMural from '../assets/gallery/11-knicks-mural.webp';

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
  // The 10.14 photo walk (captain's photos, 2026-10-14)
  {
    src: canLidWall,
    taken: '2026-10',
    alt: {
      en: 'A wall art piece of flattened silver and teal can lids bolted in diagonal rows',
      es: 'Una obra mural de tapas de lata aplastadas, plateadas y turquesa, atornilladas en filas diagonales',
    },
  },
  {
    src: dropGarbageSign,
    taken: '2026-10',
    alt: {
      en: 'A red sign in English and Chinese reading "Drop Garbage Location Here at Hallway" over a dark doorway',
      es: 'Un letrero rojo en inglés y chino que dice "Drop Garbage Location Here at Hallway" sobre una entrada oscura',
    },
  },
  {
    src: stickerTrashCan,
    taken: '2026-10',
    alt: {
      en: 'A street trash can covered in stickers in front of a teal graffiti wall',
      es: 'Un bote de basura de la calle cubierto de calcomanías frente a una pared de grafiti turquesa',
    },
  },
  {
    src: bridgeMural,
    taken: '2026-10',
    alt: {
      en: 'A purple and pink mural of the Brooklyn Bridge on a white wall covered in tags',
      es: 'Un mural morado y rosa del puente de Brooklyn en una pared blanca llena de firmas',
    },
  },
  {
    src: dreamMural,
    taken: '2026-10',
    alt: {
      en: 'A mural of a sleepy cartoon creature in sunglasses and a striped sweater under the words "It was all a dream"',
      es: 'Un mural de una criatura de caricatura dormilona con lentes de sol y suéter de rayas bajo las palabras "It was all a dream"',
    },
  },
  {
    src: knicksMural,
    taken: '2026-10',
    alt: {
      en: 'An orange and navy "New York Knicks" graffiti mural on a wooden wall',
      es: 'Un mural de grafiti naranja y azul marino de los "New York Knicks" en una pared de madera',
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
/** A month's own page (captain, 2026-10-21: one page per month, "because some could get pretty full"). */
export function galleryMonthPath(month: string): string {
  return `/more-media/gallery/${month}`;
}

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
