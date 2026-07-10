/*
 * Regenerates the favicon/share assets in public/ from the hero logo
 * (src/assets/primary-logo.png — the captain wants the icons to be exactly
 * the image the homepage hero renders, not a separate logo variant).
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs (committed, so this only needs re-running when the logo changes):
 *   public/favicon.svg          — 128px raster embedded in SVG (Google reads SVG favicons)
 *   public/favicon.ico          — 16/32/48 PNG-in-ICO (48px is Google's minimum for
 *                                 showing the logo beside search results)
 *   public/apple-touch-icon.png — 180×180, flattened on cream (iOS rounds the corners
 *                                 itself; transparent corners would render black)
 *   public/og-image.png         — 1200×630 share card: logo centered on cream
 *   public/logo.png             — 512×512 square for the Organization schema
 *                                 (Google wants ≥112px and legible on white)
 *
 * Colors come from the design tokens in src/styles/global.css.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const LOGO = 'src/assets/primary-logo.png';
const CREAM = { r: 0xed, g: 0xe9, b: 0xdf, alpha: 1 }; // --cream

const png = (size, opts = {}) =>
  sharp(LOGO).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, ...opts }).png().toBuffer();

/** Pack PNG buffers into an ICO container (PNG-in-ICO, supported everywhere modern). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + 16 * entries.length;
  const dirs = [];
  for (const { size, buf } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size === 256 ? 0 : size, 0); // width
    dir.writeUInt8(size === 256 ? 0 : size, 1); // height
    dir.writeUInt8(0, 2); // palette colors
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // color planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(buf.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += buf.length;
    dirs.push(dir);
  }
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.buf)]);
}

await mkdir('public', { recursive: true });

// favicon.ico — 16/32/48
const icoEntries = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, buf: await png(size) })),
);
await writeFile('public/favicon.ico', buildIco(icoEntries));

// favicon.svg — raster logo embedded as data URI (the logo has no vector source)
const svgInner = (await png(128)).toString('base64');
await writeFile(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${svgInner}"/></svg>\n`,
);

// apple-touch-icon.png — logo inset on cream so iOS corner-rounding doesn't clip it
const touchLogo = await png(150);
await writeFile(
  'public/apple-touch-icon.png',
  await sharp({ create: { width: 180, height: 180, channels: 4, background: CREAM } })
    .composite([{ input: touchLogo, gravity: 'center' }])
    .png()
    .toBuffer(),
);

// og-image.png — 1200×630 share card, logo centered on cream
const ogLogo = await png(520);
await writeFile(
  'public/og-image.png',
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: CREAM } })
    .composite([{ input: ogLogo, gravity: 'center' }])
    .flatten({ background: CREAM })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer(),
);

// logo.png — square structured-data logo
await writeFile(
  'public/logo.png',
  await sharp(LOGO).resize(512, 512).flatten({ background: CREAM }).png({ palette: true }).toBuffer(),
);

console.log('icons written to public/');
