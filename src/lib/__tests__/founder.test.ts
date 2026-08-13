import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FOUNDER_PATH,
  META_DESCRIPTION_LIMIT,
  founderDisplayName,
  founderMetaDescription,
  founderName,
  founderTitle,
} from '../founder';
import { getTeamMember } from '../team';

/**
 * The From the Founder meta description and byline title quote David's
 * role from team.ts, so a role rename changes them with no signal — and
 * the captain restored that attribution deliberately, so silently
 * pushing the meta past where search engines truncate defeats the
 * point. This is the guard the "trim the lead-in, never the byline"
 * comment in founder.ts assumes.
 */
describe('From the Founder attribution', () => {
  const david = getTeamMember('david');

  it('keeps the meta description within the truncation window WITH the attribution', () => {
    expect(founderMetaDescription.length, founderMetaDescription).toBeLessThanOrEqual(META_DESCRIPTION_LIMIT);
  });

  it('carries the attribution the length guard is protecting', () => {
    expect(david).toBeDefined();
    // The meta must credit exactly what the byline card shows — a search
    // result naming a different person or title than the visible page is
    // the drift this guard exists to catch.
    expect(founderMetaDescription).toContain(`By ${founderDisplayName}, ${founderTitle.en}.`);
  });

  it('points FOUNDER_PATH at the page that actually exists', () => {
    // The nav link, the footer link, and NavBar's active-state check all
    // read this constant, so a rename that misses the page file (or vice
    // versa) breaks every link at once instead of silently.
    // Built with join() rather than new URL(): Vite rewrites dynamic
    // `new URL(..., import.meta.url)` into an asset lookup that resolves
    // to undefined here.
    const pagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'pages');
    const page = join(pagesDir, `${FOUNDER_PATH}.astro`);
    expect(existsSync(page), page).toBe(true);
  });

  it('composes the byline title from the live team role plus the Founder literal', () => {
    expect(founderTitle.en).toBe(`${david!.role.en} / Founder`);
    expect(founderTitle.es).toBe(`${david!.role.es} / Fundador`);
  });

  it('keeps the display name a page-local literal, independent of team.ts', () => {
    // "David Clarke" is deliberately NOT david.name ("David") — see the
    // founderDisplayName comment. This asserts the literal so a future
    // "fix" that points it at team.ts (renaming him on the About page)
    // fails loudly instead of passing silently.
    expect(founderDisplayName).toBe('David Clarke');
    expect(founderName).toBe(david!.name);
  });
});
