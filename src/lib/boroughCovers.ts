/**
 * Each borough's cover photo on Club Events' past-events folds, one per
 * borough (captain's picks, 2026-10-21): walls and photo-walk shots from
 * the captain's own photo drop, as web-optimized WebP in src/assets/walls/.
 * They are decoration beside the borough's name, so they carry empty alt
 * text. Events outside the five boroughs get no cover.
 */
import type { ImageMetadata } from 'astro';
import type { Borough } from './zip';
import manhattan from '../assets/walls/wall-9739.webp';
import brooklyn from '../assets/walls/wall-9730.webp';
import queens from '../assets/walls/walk-1834.webp';
import bronx from '../assets/walls/walk-1772.webp';
import statenIsland from '../assets/walls/wall-9415.webp';

export const boroughCovers: Record<Borough, ImageMetadata> = {
  Manhattan: manhattan,
  Brooklyn: brooklyn,
  Queens: queens,
  'The Bronx': bronx,
  'Staten Island': statenIsland,
};
