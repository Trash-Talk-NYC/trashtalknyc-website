/**
 * The Lead a Cleanup request's choice lists (team feedback, 2026-10-15),
 * shared by the form (src/pages/contact.astro) and the leadCleanup schema
 * and action, so a value the form offers is always one the server accepts.
 * `value` is what is submitted; `en` is what the CRM note and the
 * notification email record, so the team reads plain words.
 */
type Option<V extends string> = { value: V; en: string; es: string };

export const CLEANING_NEEDS = [
  { value: 'tree-beds', en: 'Littered tree beds', es: 'Alcorques con basura' },
  { value: 'streets', en: 'Littered streets', es: 'Calles con basura' },
  { value: 'needles', en: 'Needles', es: 'Agujas' },
  { value: 'other', en: 'Other', es: 'Otro' },
] as const satisfies readonly Option<string>[];

export const SUPPORT_NEEDS = [
  { value: 'supplies', en: 'Supplies', es: 'Materiales' },
  { value: 'promotion', en: 'Promotion', es: 'Difusión' },
  { value: 'facilitation', en: 'Facilitation', es: 'Facilitación' },
  { value: 'cleanup-group', en: 'Starting a cleanup group afterwards', es: 'Formar un grupo de limpieza después' },
  { value: 'other', en: 'Other', es: 'Otro' },
] as const satisfies readonly Option<string>[];

export type CleaningNeed = (typeof CLEANING_NEEDS)[number]['value'];
export type SupportNeed = (typeof SUPPORT_NEEDS)[number]['value'];

export const CLEANING_NEED_VALUES = CLEANING_NEEDS.map((n) => n.value) as [CleaningNeed, ...CleaningNeed[]];
export const SUPPORT_NEED_VALUES = SUPPORT_NEEDS.map((n) => n.value) as [SupportNeed, ...SupportNeed[]];

/** The English label for a submitted value, for the note and email. */
export function leadOptionLabel(options: readonly Option<string>[], value: string): string {
  return options.find((o) => o.value === value)?.en ?? value;
}
