/**
 * Photo albums — the single source for the Photo Albums list
 * (/more-media/photo-albums) and each album's photo-book page
 * (/more-media/photo-albums/<slug>). Add an album here and both pick it up.
 *
 * Photos are the captain's camera originals in src/assets/albums/<album>/;
 * astro:assets re-encodes them (EXIF orientation applied, metadata
 * stripped) so only optimized webp ships. Alt text describes what is in the
 * frame; there are no invented captions. An album with no photos yet shows
 * "coming soon" and gets no page.
 */
import type { ImageMetadata } from 'astro';
import { PHOTO_ALBUMS } from './media';
import treeWithShovels from '../assets/albums/album-1/01-tree-with-shovels.jpg';
import plantUnderGrowLight from '../assets/albums/album-1/02-plant-under-grow-light.jpg';
import labeledSeedlingCups from '../assets/albums/album-1/03-labeled-seedling-cups.jpg';
import pegboardWorkbench from '../assets/albums/album-1/04-pegboard-workbench.jpg';
import microscopePlantCutting from '../assets/albums/album-1/05-microscope-plant-cutting.jpg';

type Copy = { en: string; es: string };

export interface AlbumPhoto {
  src: ImageMetadata;
  alt: Copy;
}

export interface Album {
  slug: string;
  number: Copy;
  name: Copy;
  photos: AlbumPhoto[];
}

export const albums: Album[] = [
  {
    slug: 'the-lab',
    number: { en: 'Album 1', es: 'Álbum 1' },
    name: { en: 'The Lab', es: 'El Laboratorio' },
    photos: [
      {
        src: treeWithShovels,
        alt: {
          en: 'A small potted tree beside two shovels and a bucket of tools, in front of a painted canvas',
          es: 'Un pequeño árbol en maceta junto a dos palas y un balde de herramientas, frente a un lienzo pintado',
        },
      },
      {
        src: plantUnderGrowLight,
        alt: {
          en: 'A plant cutting in a jar of water under a grow light on a metal shelf',
          es: 'Un esqueje de planta en un frasco con agua bajo una lámpara de cultivo en un estante de metal',
        },
      },
      {
        src: labeledSeedlingCups,
        alt: {
          en: 'Clear cups of soil with handwritten wooden plant labels on a shelf under a grow light',
          es: 'Vasos transparentes con tierra y etiquetas de madera escritas a mano en un estante bajo una lámpara de cultivo',
        },
      },
      {
        src: pegboardWorkbench,
        alt: {
          en: 'A workbench with tools hung on a black pegboard and seed packets laid out on a green mat',
          es: 'Una mesa de trabajo con herramientas colgadas en un tablero perforado negro y sobres de semillas sobre una alfombrilla verde',
        },
      },
      {
        src: microscopePlantCutting,
        alt: {
          en: 'A microscope next to a leafy plant cutting in a glass jar',
          es: 'Un microscopio junto a un esqueje de hojas en un frasco de vidrio',
        },
      },
    ],
  },
  {
    slug: 'the-block-party',
    number: { en: 'Album 2', es: 'Álbum 2' },
    name: { en: 'The Block Party', es: 'La Fiesta de la Cuadra' },
    photos: [],
  },
];

export const albumPath = (album: Album) => `${PHOTO_ALBUMS.path}/${album.slug}`;

/** "5 photos" / "Coming soon", in both languages. */
export function albumCountLabel(album: Album): Copy {
  const n = album.photos.length;
  if (n === 0) return { en: 'Coming soon', es: 'Muy pronto' };
  return n === 1 ? { en: '1 photo', es: '1 foto' } : { en: `${n} photos`, es: `${n} fotos` };
}
