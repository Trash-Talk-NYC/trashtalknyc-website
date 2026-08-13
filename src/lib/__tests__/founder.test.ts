import { describe, expect, it } from 'vitest';
import { META_DESCRIPTION_LIMIT, founderByline, founderMetaDescription, founderName } from '../founder';
import { getTeamMember } from '../team';

/**
 * The From Our Founder meta description quotes David's role from
 * team.ts, so a role rename lengthens it with no signal — and the
 * captain restored that byline deliberately, so silently pushing it past
 * where search engines truncate defeats the point. This is the guard the
 * "trim the lead-in, never the byline" comment in founder.ts assumes.
 */
describe('From Our Founder attribution', () => {
  const david = getTeamMember('david');

  it('keeps the meta description within the truncation window WITH the attribution', () => {
    expect(founderMetaDescription.length, founderMetaDescription).toBeLessThanOrEqual(META_DESCRIPTION_LIMIT);
  });

  it('carries the attribution the length guard is protecting', () => {
    expect(david).toBeDefined();
    expect(founderMetaDescription).toContain(`By ${david!.name}, ${david!.role.en}.`);
  });

  it('bylines both languages from the live team entry', () => {
    expect(founderName).toBe(david!.name);
    expect(founderByline.en).toBe(`By ${david!.name}, ${david!.role.en}`);
    expect(founderByline.es).toBe(`Por ${david!.name}, ${david!.role.es}`);
  });
});
