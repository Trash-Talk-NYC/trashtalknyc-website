import { getTeamMember } from './team';

/**
 * From the Founder attribution — the byline card, sign-off name, and
 * meta description for /about/from-the-founder.
 *
 * These live here rather than inline in the page so the guards in
 * __tests__/founder.test.ts assert the exact strings the page ships: a
 * copy of the template in the test would keep passing while the page
 * drifted, which is the failure those guards exist to prevent.
 */
const author = getTeamMember('david');
if (!author) {
  throw new Error("The From the Founder byline needs the 'david' entry in src/lib/team.ts, which is missing.");
}

/**
 * Untranslated on purpose — a proper noun, used by the "Sincerely,"
 * sign-off. Reads team.ts so the sign-off tracks the About page.
 */
export const founderName = author.name;

/**
 * The byline card's display name is a DELIBERATE page-local literal,
 * NOT team.ts's `name` (captain, 2026-08-13). team.ts has "David" —
 * first name only — because that is how the About page presents the
 * team, and "fixing" this mismatch by editing team.ts would rename him
 * on the About page too. Do not unify these.
 */
export const founderDisplayName = 'David Clarke';

/**
 * The byline card's title carries both halves (captain, 2026-08-13):
 * the role half derives from team.ts (it IS his team role, so a role
 * rename propagates), while "Founder" / "Fundador" is a deliberate
 * page-local literal — team.ts's role stays "Lead Organizer" and must
 * not grow a Founder suffix for the same About-page reason as above.
 */
export const founderTitle = {
  en: `${author.role.en} / Founder`,
  es: `${author.role.es} / Fundador`,
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
