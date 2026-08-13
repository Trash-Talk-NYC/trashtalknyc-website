import { getTeamMember } from './team';

/**
 * From Our Founder attribution — the byline and meta description for
 * /about/from-our-founder.
 *
 * These live here rather than inline in the page so the length guard in
 * __tests__/founder.test.ts asserts the exact strings the page ships: a
 * copy of the template in the test would keep passing while the page
 * drifted, which is the failure this guard exists to prevent.
 *
 * Name and role are read from team.ts rather than written out, so a role
 * rename propagates to the byline (both languages) and to the meta
 * without the page becoming a rename touchpoint. Missing means the page
 * would silently drop the attribution the captain asked for, so fail the
 * build instead.
 */
const author = getTeamMember('david');
if (!author) {
  throw new Error("The From Our Founder byline needs the 'david' entry in src/lib/team.ts, which is missing.");
}

/** Untranslated on purpose — a proper noun, used by the byline and the sign-off. */
export const founderName = author.name;

export const founderByline = {
  en: `By ${author.name}, ${author.role.en}`,
  es: `Por ${author.name}, ${author.role.es}`,
};

/**
 * Search engines truncate meta descriptions around here, so the
 * attribution the captain restored has to fit inside this window to be
 * worth carrying at all.
 */
export const META_DESCRIPTION_LIMIT = 155;

/**
 * Must stay within META_DESCRIPTION_LIMIT WITH the attribution included
 * — enforced by __tests__/founder.test.ts, because the role it quotes
 * comes from team.ts and a rename there would otherwise lengthen this
 * silently. If a longer role title ever pushes it over, trim the lead-in
 * further — never the byline.
 */
export const founderMetaDescription = `How Trash Talk NYC began: 88 days from a $40 cleanup kit in Washington Heights to cleanups across the city. By ${author.name}, ${author.role.en}.`;
