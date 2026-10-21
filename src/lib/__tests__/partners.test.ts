import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WALL_PATH, TIER_LABEL, partners, partnersByTier, stickerLook, visiblePartners, type Partner } from '../partners';

const partner = (name: string, tier: Partner['tier'], sample?: true): Partner => ({
  name,
  tier,
  blurb: { en: name, es: name },
  url: 'https://example.com',
  ...(sample ? { sample } : {}),
});

describe('visiblePartners', () => {
  it('shows samples only while the flag is on, and real partners always', () => {
    const real = partner('real', 'block');
    const sample = partner('sample', 'city', true);
    expect(visiblePartners([real, sample], true)).toEqual([real, sample]);
    expect(visiblePartners([real, sample], false)).toEqual([real]);
  });

  it('keeps every shipped sample on a reserved example domain, so none can pass for a real partner', () => {
    for (const p of partners.filter((p) => p.sample)) expect(new URL(p.url).hostname).toBe('example.com');
  });
});

describe('partnersByTier', () => {
  it('puts City, then Borough, then Block, keeping order within a tier', () => {
    const sorted = partnersByTier([partner('a', 'block'), partner('b', 'city'), partner('c', 'borough'), partner('d', 'city')]);
    expect(sorted.map((p) => p.name)).toEqual(['b', 'd', 'c', 'a']);
  });
});

describe('partner data', () => {
  it('gives every partner both blurb languages and a full URL', () => {
    for (const p of partners) {
      expect(p.blurb.en.trim()).not.toBe('');
      expect(p.blurb.es.trim()).not.toBe('');
      expect(p.url).toMatch(/^https?:\/\//);
    }
  });

  it('labels every tier in both languages', () => {
    for (const label of Object.values(TIER_LABEL)) expect(label.es).not.toBe(label.en);
  });

  it('falls back to a default sticker look when a partner has none', () => {
    expect(stickerLook(partner('x', 'block'), 0).bg).toMatch(/^#/);
  });

  it('points WALL_PATH at an existing page', () => {
    expect(existsSync(join(process.cwd(), `src/pages${WALL_PATH}.astro`))).toBe(true);
  });
});
