#!/usr/bin/env node
/**
 * Generates the sticker-bombed wall behind David's letter on From the
 * Founder (captain, 2026-11-24: "a really ultra stickered background
 * layered on top of each other all the way down to the footer").
 *
 *   node scripts/generate-sticker-bomb.mjs
 *
 * The team's ten stickers (src/assets/stickers/team/) are slapped onto one
 * square tile, overlapping and rotated, with a hard offset shadow like the
 * site's other sticker drops. Every sticker is also stamped at its wrapped
 * positions, so the tile repeats with no seams and one small image covers
 * a section of any height, on any screen.
 *
 * Writes src/assets/stickers/sticker-bomb-tile.webp at 2x (TILE px for a
 * TILE/2 CSS px repeat). Generated output — rerun this, never hand-edit.
 * Deterministic: the same stickers always give the same tile.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stickerDir = join(root, 'src/assets/stickers/team');
const outPath = join(root, 'src/assets/stickers/sticker-bomb-tile.webp');

const TILE = 1200;
// Roadtop Black, the page ground, for the few gaps left between stickers
const GROUND = { r: 29, g: 29, b: 35, alpha: 1 };
const SHADOW = { dx: 6, dy: 8, alpha: 0.4 };

let seed = 24;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

const files = readdirSync(stickerDir).filter((f) => f.endsWith('.png')).sort();

// Two jittered grids, the second offset by half a cell and stuck over the
// first, so the whole tile is covered evenly with stickers slapped over
// each other (a random scatter clumps and leaves bare bands)
const placements = [];
const grid = (n, offset, minSize, spread) => {
  const cell = TILE / n;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      placements.push({
        x: (col + offset + 0.2 + rand() * 0.6) * cell,
        y: (row + offset + 0.2 + rand() * 0.6) * cell,
        size: minSize + rand() * spread,
      });
    }
  }
};
grid(5, 0, 290, 100);
grid(5, 0.5, 250, 90);

// Neighbors never get the same sticker: walk the files in a shuffled cycle
const order = [...files].sort(() => rand() - 0.5);

async function slap(file, size, angle) {
  const sticker = await sharp(join(stickerDir, file))
    .resize({ width: Math.round(size), height: Math.round(size), fit: 'inside' })
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  // The shadow is the sticker's own silhouette in translucent ink
  const alpha = await sharp(sticker.data).extractChannel('alpha').toBuffer();
  const shadow = await sharp({
    create: { width: sticker.info.width, height: sticker.info.height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .joinChannel(await sharp(alpha).linear(SHADOW.alpha, 0).toBuffer())
    .png()
    .toBuffer();
  return { sticker: sticker.data, shadow, width: sticker.info.width, height: sticker.info.height };
}

// Stamped on a 3x3 canvas (plus room for the biggest sticker) and cut from
// the middle, so a sticker crossing one edge comes back on the opposite one
const PAD = 500;
const SPAN = TILE * 3 + PAD;
const layers = [];
for (const [i, p] of placements.entries()) {
  const art = await slap(order[i % order.length], p.size, Math.round(rand() * 70 - 35));
  for (let gx = 0; gx < 3; gx++) {
    for (let gy = 0; gy < 3; gy++) {
      const left = Math.round(p.x + gx * TILE - art.width / 2 + PAD / 2);
      const top = Math.round(p.y + gy * TILE - art.height / 2 + PAD / 2);
      if (left < 0 || top < 0 || left + art.width + SHADOW.dx > SPAN || top + art.height + SHADOW.dy > SPAN) continue;
      layers.push({ input: art.shadow, left: left + SHADOW.dx, top: top + SHADOW.dy });
      layers.push({ input: art.sticker, left, top });
    }
  }
}

const canvas = await sharp({ create: { width: SPAN, height: SPAN, channels: 4, background: GROUND } })
  .composite(layers)
  .png()
  .toBuffer();

await sharp(canvas)
  .extract({ left: TILE + PAD / 2, top: TILE + PAD / 2, width: TILE, height: TILE })
  .flatten({ background: GROUND })
  .webp({ quality: 82 })
  .toFile(outPath);

console.log(`wrote ${outPath}`);
