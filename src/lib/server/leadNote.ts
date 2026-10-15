import { CLEANING_NEEDS, SUPPORT_NEEDS, leadOptionLabel } from '../leadOptions';
import type { LeadInput } from './schemas';

/**
 * The Lead a Cleanup request as plain lines for the Brevo CRM note and
 * the team's notification email. The choice answers are written out in
 * English words, and they live only here (not in Brevo attributes), so
 * this is the record the team reads.
 */
export function buildLeadNoteLines(
  input: Pick<LeadInput, 'behalf' | 'cleaningNeed' | 'support' | 'participants' | 'preferredMonth'>,
  startLabel: string,
): string[] {
  return [
    `Requesting on behalf of: ${input.behalf}`,
    `Starting address: ${startLabel}`,
    `What needs cleaning: ${leadOptionLabel(CLEANING_NEEDS, input.cleaningNeed)}`,
    `Support needed: ${input.support.map((s) => leadOptionLabel(SUPPORT_NEEDS, s)).join(', ')}`,
    `Number of participants: ${input.participants || 'not given'}`,
    `Preferred month: ${input.preferredMonth}`,
  ];
}
