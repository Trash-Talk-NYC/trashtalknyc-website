#!/usr/bin/env node
/**
 * Generates the color mask for the planting wall's chalk photo.
 *
 *   node scripts/generate-chalk-mask.mjs [--debug <out.png>]
 *
 * The planting wall tints the chalked-sidewalk photo Post No Bills green
 * and lets the chalk show through in full color (captain, 2026-10-09:
 * the chalk pieces AND the chalk drawn on the concrete). This finds the
 * chalk by local contrast — a mark is lighter or more colorful than the
 * concrete around it — so lighting falloff across the slab doesn't leak
 * bare concrete into the mask. The hand-placed piece mask
 * (src/assets/walls/chalk-mask.svg) is merged in so every piece stays
 * whole even where it's darker than its surroundings.
 *
 * Writes src/assets/walls/chalk-mask.png: an alpha mask (opaque = keep in
 * color, transparent = tint green) at the photo's aspect ratio, so CSS
 * can frame photo and mask identically. Generated output — rerun this,
 * never hand-edit.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const photoPath = join(root, 'src/assets/walls/wall-chalk-sidewalk.jpg');
const pieceMaskPath = join(root, 'src/assets/walls/chalk-mask.svg');
const outPath = join(root, 'src/assets/walls/chalk-mask.png');

// Tuned by eye on the photo: how much lighter / more saturated than the
// local concrete a pixel must be to count as chalk
const LIGHT_DELTA = 18;
const SAT_DELTA = 0.1;
// Radius (px at full size) of the "local concrete" estimate
const LOCAL_BLUR = 40;

const { width, height } = await sharp(photoPath).metadata();

async function channels(img) {
  const { data } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const light = new Float32Array(width * height);
  const sat = new Float32Array(width * height);
  for (let p = 0, i = 0; p < light.length; p++, i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    light[p] = r * 0.299 + g * 0.587 + b * 0.114;
    sat[p] = mx ? (mx - mn) / mx : 0;
  }
  return { light, sat };
}

const here = await channels(sharp(photoPath));
const local = await channels(sharp(photoPath).blur(LOCAL_BLUR));

const mask = Buffer.alloc(width * height);
for (let p = 0; p < mask.length; p++) {
  // Colorful chalk counts only when it isn't darker than the concrete,
  // which keeps rust and grime specks (dark but saturated) out
  const lighter = here.light[p] - local.light[p];
  const chalk = lighter > LIGHT_DELTA || (here.sat[p] - local.sat[p] > SAT_DELTA && lighter > -4);
  mask[p] = chalk ? 255 : 0;
}

// Soften the edges a touch, then merge the hand-placed piece mask
const lines = await sharp(mask, { raw: { width, height, channels: 1 } }).blur(1.2).png().toBuffer();
const pieces = await sharp(pieceMaskPath, { density: 300 }).resize(width, height, { fit: 'cover' }).greyscale().png().toBuffer();
const merged = await sharp(await sharp(lines).composite([{ input: pieces, blend: 'lighten' }]).png().toBuffer())
  .extractChannel(0)
  .raw()
  .toBuffer();

// CSS masks read alpha: white pixels whose alpha is the mask, at 1600px
// wide (plenty for a soft-edged mask, a fraction of the bytes)
const rgba = Buffer.alloc(width * height * 4, 255);
for (let p = 0; p < width * height; p++) rgba[p * 4 + 3] = merged[p];
await sharp(rgba, { raw: { width, height, channels: 4 } }).resize(1600).png({ compressionLevel: 9 }).toFile(outPath);

const debugAt = process.argv.indexOf('--debug');
if (debugAt !== -1) {
  // Photo with everything outside the mask washed green, to eyeball the result
  const green = await sharp({ create: { width, height, channels: 3, background: '#4E6E65' } }).png().toBuffer();
  const alpha = await sharp(outPath).resize(width, height).extractChannel(3).toBuffer();
  const keep = await sharp(photoPath).joinChannel(alpha).png().toBuffer();
  writeFileSync(process.argv[debugAt + 1], await sharp(green).composite([{ input: keep }]).png().toBuffer());
}

console.log(`chalk-mask.png ${width}x${height}`);
