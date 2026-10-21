/**
 * Street photos from the captain's 10.14 photo walk, used as stand-in
 * pictures on past-event cards whose Eventbrite cover another card already
 * shows (captain, 2026-10-21: "diversify images"). None of them is in the
 * Gallery, so no picture repeats across the site.
 *
 * Web-optimized WebP derivatives (1200px long edge, metadata stripped);
 * the originals stay out of the repo. No people, plates, phone numbers,
 * or house numbers. They are decoration beside the event's name, so the
 * cards give them empty alt text.
 *
 * peeling-wall.webp is not in this pool: it is the homepage poster band's
 * own wall (round 9, F4a), and no photo repeats across sections.
 */
import type { ImageMetadata } from 'astro';
import greyDoorTags from '../assets/street/grey-door-tags.webp';
import leafOnAsphalt from '../assets/street/leaf-on-asphalt.webp';
import canLidDiamonds from '../assets/street/can-lid-diamonds.webp';
import yellowDoorTag from '../assets/street/yellow-door-tag.webp';
import pandaMural from '../assets/street/panda-mural.webp';
import graffitiAlley from '../assets/street/graffiti-alley.webp';
import stayAlertStencil from '../assets/street/stay-alert-stencil.webp';
import peelingPaintRose from '../assets/street/peeling-paint-rose.webp';
import greenCharacter from '../assets/street/green-character.webp';
import pinkCyclops from '../assets/street/pink-cyclops.webp';
import chalkCloud from '../assets/street/chalk-cloud.webp';
import wiresAndStickers from '../assets/street/wires-and-stickers.webp';
import streetSignMural from '../assets/street/street-sign-mural.webp';
import yellowWildstyle from '../assets/street/yellow-wildstyle.webp';
import parkStairs from '../assets/street/park-stairs.webp';

// Ordered so neighboring cards differ in color and subject
export const streetPhotos: readonly ImageMetadata[] = [
  pandaMural,
  greyDoorTags,
  yellowWildstyle,
  graffitiAlley,
  pinkCyclops,
  canLidDiamonds,
  stayAlertStencil,
  leafOnAsphalt,
  greenCharacter,
  wiresAndStickers,
  yellowDoorTag,
  streetSignMural,
  chalkCloud,
  peelingPaintRose,
  parkStairs,
];
