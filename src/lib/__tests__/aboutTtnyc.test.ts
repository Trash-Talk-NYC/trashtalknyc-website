import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ABOUT_TTNYC_PATH, mission, values, vision } from '../aboutTtnyc';

describe('About TTNYC', () => {
  it('points ABOUT_TTNYC_PATH at an existing page', () => {
    expect(existsSync(join(process.cwd(), `src/pages${ABOUT_TTNYC_PATH}.astro`))).toBe(true);
  });

  // The team's words, verbatim (round 3, captain 2026-11-08)
  it("keeps the team's vision, mission, and values verbatim", () => {
    expect(vision.en).toBe("Residents are the city's leaders in keeping NYC's public spaces clean.");
    expect(mission.en).toBe(
      "Inspire and empower New Yorkers to take responsibility for their neighborhood's cleanliness, supported by infrastructure, policies, and city services.",
    );
    expect(values.map((v) => v.en)).toEqual(['Care', 'Humility', 'Informed Activism', 'Grassroots Leadership', 'Problem Solving', 'Accessibility']);
  });

  it('translates every line', () => {
    for (const c of [vision, mission, ...values]) expect(c.es.trim()).not.toBe('');
  });
});
