import { BEHALF_OPTIONS, CLEANING_NEEDS, SUPPORT_NEEDS, leadOptionLabel } from '../leadOptions';
import type { LeadInput } from './schemas';

/**
 * The Lead a Cleanup request as plain lines for the Brevo CRM note and
 * the team's notification email. The choice answers are written out in
 * English words, and they live only here (not in Brevo attributes), so
 * this is the record the team reads.
 */
export function buildLeadNoteLines(
  input: Pick<LeadInput, 'behalf' | 'behalfOther' | 'cleaningNeed' | 'cleaningOther' | 'support' | 'participants' | 'preferredMonth'>,
  startLabel: string,
): string[] {
  const behalf = input.behalf
    .map((b) => (b === 'other' ? `Other: ${input.behalfOther?.trim() ?? ''}` : leadOptionLabel(BEHALF_OPTIONS, b)))
    .join(', ');
  const needs = input.cleaningNeed
    .map((n) => (n === 'other' ? `Other: ${input.cleaningOther?.trim() ?? ''}` : leadOptionLabel(CLEANING_NEEDS, n)))
    .join(', ');
  return [
    `Requesting on behalf of: ${behalf}`,
    `Starting address: ${startLabel}`,
    `What needs cleaning: ${needs}`,
    `Support needed: ${input.support.map((s) => leadOptionLabel(SUPPORT_NEEDS, s)).join(', ')}`,
    `Number of participants: ${input.participants || 'not given'}`,
    `Preferred month: ${input.preferredMonth}`,
  ];
}
