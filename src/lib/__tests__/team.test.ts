import { describe, expect, it } from 'vitest';
import { team } from '../team';

/**
 * These guard the invariants that copy edits keep breaking by hand:
 * a bilingual pair going half-updated, and a metaDescription left
 * quoting a role the captain has since renamed (exactly what the
 * "Brand Management & Programming" → "Brand Management & Programs"
 * change had to fix in two places at once).
 */
describe('team data', () => {
  it('gives every member both language variants of their role', () => {
    for (const member of team) {
      expect(member.role.en.trim(), `${member.id} EN role`).not.toBe('');
      expect(member.role.es.trim(), `${member.id} ES role`).not.toBe('');
    }
  });

  it('gives every bio paragraph both language variants', () => {
    for (const member of team) {
      expect(member.bio.length, `${member.id} bio paragraphs`).toBeGreaterThan(0);

      for (const [index, paragraph] of member.bio.entries()) {
        // Mixed-content paragraphs carry their strings on `parts` leaves
        // instead of on the paragraph itself.
        const segments = paragraph.parts ?? [{ en: paragraph.en, es: paragraph.es }];

        for (const segment of segments) {
          expect(segment.en?.trim(), `${member.id} bio[${index}] EN`).toBeTruthy();
          expect(segment.es?.trim(), `${member.id} bio[${index}] ES`).toBeTruthy();
        }
      }
    }
  });

  // Nandi's and Fabiola's metaDescriptions name their role verbatim
  // ("Meet <name>, <role> at Trash Talk NYC, …"), so a rename has to land
  // in two places for each of them — as it did on the Programming →
  // Programs rename. David's paraphrases the title ("organizer of Trash
  // Talk NYC") instead, so it survives a rename and is not guarded here.
  it.each(['nandi', 'fabiola'])(
    "keeps %s's metaDescription quoting their current English role",
    (id) => {
      const member = team.find((entry) => entry.id === id);

      expect(member).toBeDefined();
      expect(member!.metaDescription).toContain(member!.role.en);
    },
  );
});
