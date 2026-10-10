#!/usr/bin/env node
/**
 * Generates whole-row variants of the brick frame drawing.
 *
 *   node scripts/generate-bricks.mjs
 *
 * The official bricks drawing (src/assets/bricks-top-lav.svg, one <path>
 * per brick) frames every hero as a top half and a bottom half. A hero
 * shorter than both halves used to overlap them, and cropping at the
 * midline sliced bricks in half (captain: every brick must be whole).
 * So short heroes show only the first N rows of the top half and the
 * last N rows of the bottom half — whole bricks, never cut.
 *
 * Writes src/assets/bricks/top-<n>.svg and bottom-<n>.svg for n = 1..16,
 * plus src/lib/brick-rows.generated.ts with each variant's rendered
 * height as a fraction of its width (the hero min-height math in
 * src/lib/bricks.ts). Rows 9–16 extend the side columns for heroes taller
 * than the drawing (the Team page's continuous wall): they repeat the
 * drawing's own side rows 3–8 at its own mortar gap, so the extension is
 * indistinguishable from the original. Generated output — rerun this,
 * never hand-edit.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/assets/bricks-top-lav.svg'), 'utf8');

// The source's own frame: x range, the top half's first y, the bottom half's last y
const VIEW_X = 43.7;
const VIEW_W = 2337.3;
const TOP_Y0 = 70.5;
const BOTTOM_Y1 = 1676.9 + 796.7;
// Bricks above this y belong to the top half, below it to the bottom half
const HALF_SPLIT = 1300;
// Same breathing room the source viewBoxes leave around the bricks
const PAD = 12;
// A brick starting more than this far below its row's first brick opens a new row
const ROW_GAP = 60;

const paths = [...source.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*\/>/g)].map((m) => ({ tag: m[0], d: m[1] }));
if (paths.length !== 72) throw new Error(`Expected 72 brick paths in the source drawing, found ${paths.length}`);

/** Bounding box of a path from its end and control points (close enough for row grouping). */
function bbox(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '';
  let minY = Infinity, maxY = -Infinity;
  const add = (y) => { minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') { cx = sx; cy = sy; continue; }
    const n = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }[C];
    if (!n) throw new Error(`Unsupported path command ${cmd}`);
    const a = Array.from({ length: n }, num);
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (C === 'H') { cx = ox + a[0]; add(cy); continue; }
    if (C === 'V') { cy = oy + a[0]; add(cy); continue; }
    if (C === 'A') { cx = ox + a[5]; cy = oy + a[6]; add(cy); continue; }
    for (let k = 1; k < n; k += 2) add(oy + a[k]);
    cx = ox + a[n - 2]; cy = oy + a[n - 1];
    if (C === 'M') { sx = cx; sy = cy; cmd = rel ? 'l' : 'L'; }
  }
  return { minY, maxY };
}

const bricks = paths.map((p) => ({ ...p, ...bbox(p.d) }));

/** Groups bricks into rows, ordered outward-in (from the frame's outer edge). */
function rows(list, fromTop) {
  const sorted = [...list].sort((a, b) => (fromTop ? a.minY - b.minY : b.maxY - a.maxY));
  const out = [];
  for (const b of sorted) {
    const row = out.at(-1);
    const anchor = row && (fromTop ? row[0].minY : row[0].maxY);
    const edge = fromTop ? b.minY : b.maxY;
    if (row && Math.abs(edge - anchor) <= ROW_GAP) row.push(b);
    else out.push([b]);
  }
  return out;
}

const topRows = rows(bricks.filter((b) => b.minY < HALF_SPLIT), true);
const bottomRows = rows(bricks.filter((b) => b.minY >= HALF_SPLIT), false);
if (topRows.length !== 8 || bottomRows.length !== 8) {
  throw new Error(`Expected 8 rows per half, got ${topRows.length} top / ${bottomRows.length} bottom`);
}

const header = (y, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_X} ${y.toFixed(1)} ${VIEW_W} ${h.toFixed(1)}"><style>.cls-1{fill:#a57dd7}</style>`;

/** Median vertical gap between neighboring rows of a half, in drawing units. */
function rowGap(list, fromTop) {
  const gaps = [];
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    gaps.push(fromTop ? Math.min(...b.map((x) => x.minY)) - Math.max(...a.map((x) => x.maxY)) : Math.min(...a.map((x) => x.minY)) - Math.max(...b.map((x) => x.maxY)));
  }
  gaps.sort((x, y) => x - y);
  return gaps[Math.floor(gaps.length / 2)];
}

const GAP = Math.max(4, Math.round((rowGap(topRows, true) + rowGap(bottomRows, false)) / 2));
const MAX_ROWS = 16;

/**
 * Extends a half's 8 rows to MAX_ROWS by repeating its side rows 3–8
 * (indices 2–7) further inward, each copy moved to sit one mortar gap
 * past the previous row. Returns rows as { tags, minY, maxY }.
 */
function extend(list, fromTop) {
  const out = list.map((r) => ({ tags: r.map((b) => b.tag).join(''), minY: Math.min(...r.map((b) => b.minY)), maxY: Math.max(...r.map((b) => b.maxY)) }));
  for (let k = 0; out.length < MAX_ROWS; k++) {
    const src = out[2 + (k % 6)];
    const last = out[out.length - 1];
    const dy = fromTop ? last.maxY + GAP - src.minY : last.minY - GAP - src.maxY;
    out.push({ tags: `<g transform="translate(0 ${dy.toFixed(1)})">${src.tags}</g>`, minY: src.minY + dy, maxY: src.maxY + dy });
  }
  return out;
}

const topAll = extend(topRows, true);
const bottomAll = extend(bottomRows, false);

const outDir = join(root, 'src/assets/bricks');
mkdirSync(outDir, { recursive: true });
const ratios = { top: [], bottom: [] };

for (let n = 1; n <= MAX_ROWS; n++) {
  const top = topAll.slice(0, n);
  const topH = Math.max(...top.map((r) => r.maxY)) + PAD - TOP_Y0;
  writeFileSync(join(outDir, `top-${n}.svg`), header(TOP_Y0, topH) + top.map((r) => r.tags).join('') + '</svg>\n');
  ratios.top.push(+(topH / VIEW_W).toFixed(4));

  const bottom = bottomAll.slice(0, n);
  const bottomY0 = Math.min(...bottom.map((r) => r.minY)) - PAD;
  const bottomH = BOTTOM_Y1 - bottomY0;
  writeFileSync(join(outDir, `bottom-${n}.svg`), header(bottomY0, bottomH) + bottom.map((r) => r.tags).join('') + '</svg>\n');
  ratios.bottom.push(+(bottomH / VIEW_W).toFixed(4));
}

writeFileSync(
  join(root, 'src/lib/brick-rows.generated.ts'),
  `// Generated by scripts/generate-bricks.mjs — rerun it, never hand-edit.
// Rendered height ÷ width of each whole-row brick variant; index 0 = 1 row.
export const BRICK_ROW_RATIOS = ${JSON.stringify(ratios, null, 2).replace(/"(\w+)":/g, '$1:')} as const;
// Drawing units: the width every ratio is relative to, the blank margin
// each variant keeps past its innermost row, and the mortar gap between rows.
export const BRICK_GEOMETRY = { viewWidth: ${VIEW_W}, pad: ${PAD}, gap: ${GAP} } as const;
`,
);

console.log('gap', GAP, '\ntop', ratios.top.join(' '), '\nbottom', ratios.bottom.join(' '));
