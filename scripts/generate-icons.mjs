/*
 * Regenerates the favicon/share assets in public/ from the header's vest
 * sticker (src/assets/vest-sticker.png), the logo of the 2026-10 identity.
 * They were cut from the old vest logo until the captain saw it in an
 * iMessage link preview (2026-11-24: "when trash talk website is sent, old
 * logo is what displays").
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs (committed, so this only needs re-running when the logo changes):
 *   public/favicon.svg          — 128px raster embedded in SVG (Google reads SVG favicons)
 *   public/favicon.ico          — 16/32/48 PNG-in-ICO (48px is Google's minimum for
 *                                 showing the logo beside search results)
 *   public/apple-touch-icon.png — 180×180, flattened on beige (iOS rounds the corners
 *                                 itself; transparent corners would render black)
 *   public/og-image.png         — 1200×630 share card: the name, the club line, and
 *                                 the address on Roadtop Black, with the vest slapped
 *                                 onto a strip of the founder page's sticker bomb
 *   public/logo.png             — 512×512 square for the Organization schema
 *                                 (Google wants ≥112px and legible on white)
 *
 * The share card's text is set in the site's own faces from scripts/fonts/.
 * Colors are the design tokens in src/styles/global.css.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import opentype from 'opentype.js';
import sharp from 'sharp';

const LOGO = 'src/assets/vest-sticker.png';
const BOMB = 'src/assets/stickers/sticker-bomb-tile.webp';
const BEIGE = { r: 0xea, g: 0xe9, b: 0xda, alpha: 1 }; // --beige
const BLACK = { r: 0x1d, g: 0x1d, b: 0x23, alpha: 1 }; // --black
const FONTS = 'scripts/fonts';

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

// apple-touch-icon.png — logo inset on beige so iOS corner-rounding doesn't clip it
const touchLogo = await png(150);
await writeFile(
  'public/apple-touch-icon.png',
  await sharp({ create: { width: 180, height: 180, channels: 4, background: BEIGE } })
    .composite([{ input: touchLogo, gravity: 'center' }])
    .png()
    .toBuffer(),
);

// og-image.png — 1200×630 share card
const W = 1200;
const H = 630;
const STRIP = 440; // the sticker bomb's width on the right

/**
 * One line of text in a brand face, drawn as vector outlines so the card
 * never depends on the machine's installed fonts (sharp's own text
 * rendering goes through the OS font system, which can't see these files
 * on macOS). Scaled down if needed to fit maxWidth.
 */
async function text(str, fontfile, size, fill, maxWidth) {
  const font = await opentype.load(`${FONTS}/${fontfile}`);
  const fitted = Math.min(size, (size * maxWidth) / font.getAdvanceWidth(str, size));
  const path = font.getPath(str, 0, fitted * (font.ascender / font.unitsPerEm), fitted);
  const box = path.getBoundingBox();
  const width = Math.ceil(box.x2) + 2;
  const height = Math.ceil(fitted * ((font.ascender - font.descender) / font.unitsPerEm));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${path.toPathData(2)}" fill="${fill}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const strip = await sharp(BOMB).resize(H).extract({ left: 0, top: 0, width: STRIP, height: H }).toBuffer();

// The vest, tilted and slapped over the strip's edge with the site's hard
// translucent shadow
const vest = await sharp(LOGO)
  .resize({ height: 360 })
  .rotate(-7, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer({ resolveWithObject: true });
const vestShadow = await sharp({
  create: { width: vest.info.width, height: vest.info.height, channels: 3, background: { r: 0, g: 0, b: 0 } },
})
  .joinChannel(await sharp(vest.data).extractChannel('alpha').linear(0.45, 0).toBuffer())
  .png()
  .toBuffer();
const vestLeft = W - STRIP - Math.round(vest.info.width / 2) + 40;
const vestTop = Math.round((H - vest.info.height) / 2);

const name = await text('Trash Talk NYC', 'LondrinaSolid-Black.ttf', 118, '#EAE9DA', 560);
const line = await text("New York City's Cleanup Club", 'LondrinaSolid-Regular.ttf', 58, '#F3CF02', 560);
const site = await text('trashtalknyc.org', 'SpaceMono-Bold.ttf', 30, '#EAE9DA', 560);

await writeFile(
  'public/og-image.png',
  await sharp({ create: { width: W, height: H, channels: 4, background: BLACK } })
    .composite([
      { input: strip, left: W - STRIP, top: 0 },
      { input: name, left: 64, top: 170 },
      { input: line, left: 68, top: 318 },
      { input: site, left: 70, top: 410 },
      { input: vestShadow, left: vestLeft + 8, top: vestTop + 10 },
      { input: vest.data, left: vestLeft, top: vestTop },
    ])
    .flatten({ background: BLACK })
    // A palette keeps the card light for link-preview fetchers
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer(),
);

// logo.png — square structured-data logo
await writeFile(
  'public/logo.png',
  await sharp(LOGO).resize(512, 512).flatten({ background: BEIGE }).png({ palette: true }).toBuffer(),
);

console.log('icons written to public/');
