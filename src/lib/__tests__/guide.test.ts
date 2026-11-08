import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as guide from '../guide';

/** Every {en, es} pair anywhere in the guide's data. */
function pairs(value: unknown): { en: string; es: string }[] {
  if (Array.isArray(value)) return value.flatMap(pairs);
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const self = typeof o.en === 'string' && typeof o.es === 'string' ? [{ en: o.en, es: o.es }] : [];
    return [...self, ...Object.values(o).flatMap(pairs)];
  }
  return [];
}

describe('How to Start a Trash Club', () => {
  it('points GUIDE_PATH at an existing page', () => {
    expect(existsSync(join(process.cwd(), `src/pages${guide.GUIDE_PATH}.astro`))).toBe(true);
  });

  it('translates every line', () => {
    const all = pairs(guide);
    expect(all.length).toBeGreaterThan(50);
    for (const p of all) expect(p.es.trim(), p.en).not.toBe('');
  });

  // The guide's own words: spot-check the lines most likely to be "improved"
  it('keeps the guide verbatim', () => {
    expect(guide.intro.creed.map((c) => c.en)).toEqual(['Service must be fun.', 'Service must be accessible.', 'Service must be seen.']);
    expect(guide.whyWeClean.closing.map((c) => c.en)).toContain('It shouldn’t be our job, but it can be our joy.');
    expect(guide.preparation.steps).toHaveLength(7);
    expect(guide.cleanupDay.steps).toHaveLength(9);
    expect(guide.safety.items).toHaveLength(5);
  });
});
