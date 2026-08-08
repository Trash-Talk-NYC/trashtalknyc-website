import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Bilingual completeness gate (round 29).
 *
 * language.test.ts proves the SWITCHER works; nothing there proves a
 * given piece of copy actually has a Spanish version — English-only
 * copy passes every mechanism test and silently ships English to
 * Spanish readers. This suite closes that gap permanently: every
 * element in the BUILT output carrying one language of a translatable
 * attribute pair must carry a non-empty other half.
 *
 * It runs against dist/ (not source) so copy generated through any
 * component or page is covered. If dist/ is absent it builds it; if
 * dist/ exists it is validated AS-IS, so after editing copy, rebuild
 * before trusting a local pass (CI and fresh clones always build).
 *
 * data-es identical to data-en is CORRECT for brand names and handles
 * (Trash Talk NYC, TikTok, @trashtalk_nyc…) — the check is presence and
 * non-emptiness, never difference.
 */

// Vitest runs from the repo root (same place astro build writes dist/)
const DIST = join(process.cwd(), 'dist');

/** The attribute families the site treats as translation pairs. */
const PAIRS: ReadonlyArray<readonly [en: string, es: string]> = [
  ['data-en', 'data-es'],
  // setLang never touches attributes, so these are swapped by page
  // scripts — but the copy still has to exist in both languages.
  ['data-placeholder-en', 'data-placeholder-es'],
  ['data-subject-en', 'data-subject-es'],
];

interface Gap {
  page: string;
  element: string;
  missing: string;
  presentText: string;
}

function collectHtmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Build artifacts, not pages
      return entry.name === '_astro' ? [] : collectHtmlFiles(full);
    }
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

/** A short, recognisable description of the offending element. */
function describeElement(el: Element): string {
  const id = el.id ? `#${el.id}` : '';
  const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/)[0]}` : '';
  return `<${el.tagName.toLowerCase()}${id}${cls}>`;
}

export function findGaps(html: string, page: string): Gap[] {
  // A <template>'s content is inert: unlike DOMParser's full document,
  // happy-dom won't try to fetch the page's stylesheets/fonts/scripts.
  // html/head/body wrappers are dropped but every content element (and
  // its data-* attributes) survives, which is all this check needs.
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const gaps: Gap[] = [];
  for (const [enAttr, esAttr] of PAIRS) {
    tpl.content.querySelectorAll(`[${enAttr}], [${esAttr}]`).forEach((el) => {
      const en = el.getAttribute(enAttr);
      const es = el.getAttribute(esAttr);
      if (en === null || en.trim() === '') {
        gaps.push({ page, element: describeElement(el), missing: enAttr, presentText: (es ?? '').slice(0, 80) });
      }
      if (es === null || es.trim() === '') {
        gaps.push({ page, element: describeElement(el), missing: esAttr, presentText: (en ?? '').slice(0, 80) });
      }
    });
  }
  return gaps;
}

describe('bilingual completeness of the built site', () => {
  beforeAll(() => {
    if (!existsSync(join(DIST, 'index.html'))) {
      // Fresh checkout / CI: produce the thing under test.
      execSync('npx astro build', { stdio: 'inherit', timeout: 240_000 });
    }
  }, 300_000);

  it('every translatable attribute pair is complete on every page', () => {
    const files = collectHtmlFiles(DIST);
    expect(files.length).toBeGreaterThan(0);

    const gaps = files.flatMap((file) => findGaps(readFileSync(file, 'utf8'), relative(DIST, file)));

    // On failure vitest prints each gap: the page, the element, which
    // attribute is missing, and the text that exists in the other
    // language — enough to fix it without re-deriving anything.
    expect(gaps).toEqual([]);
  });

  // The checker itself must be able to fail — a gate that cannot fire
  // is worse than no gate. These pin its failure behavior.
  it('flags a data-en element whose data-es is absent', () => {
    const gaps = findGaps('<p data-en="English only">English only</p>', 'canary');
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ page: 'canary', missing: 'data-es', presentText: 'English only' });
  });

  it('flags an empty-string translation as missing', () => {
    expect(findGaps('<p data-en="Hi" data-es="">Hi</p>', 'canary')).toHaveLength(1);
    expect(findGaps('<p data-en="Hi" data-es="   ">Hi</p>', 'canary')).toHaveLength(1);
  });

  it('flags the reverse direction (data-es without data-en)', () => {
    const gaps = findGaps('<p data-es="Solo español">Solo español</p>', 'canary');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].missing).toBe('data-en');
  });

  it('accepts identical text in both languages (brand names, handles)', () => {
    expect(findGaps('<span data-en="TikTok" data-es="TikTok">TikTok</span>', 'canary')).toEqual([]);
  });

  it('covers the placeholder and mailto-subject pairs too', () => {
    expect(findGaps('<textarea data-placeholder-en="e.g. …"></textarea>', 'canary')).toHaveLength(1);
    expect(findGaps('<a data-subject-en="Joining"></a>', 'canary')).toHaveLength(1);
  });
});
