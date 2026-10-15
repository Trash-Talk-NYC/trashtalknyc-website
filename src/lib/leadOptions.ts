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

/**
 * Who a Lead a Cleanup request is on behalf of — check all that apply
 * (captain, 2026-10-15). "Other" asks for a short description. Brevo's
 * LEAD_BEHALF only ever gets its original two values (see
 * `leadBehalfAttribute`); the full answer lives in the CRM note.
 */
export const BEHALF_OPTIONS = [
  { value: 'individual', en: 'An individual', es: 'Una persona' },
  { value: 'nonprofit', en: 'A nonprofit', es: 'Una organización sin fines de lucro' },
  { value: 'educational', en: 'An educational institution', es: 'Una institución educativa' },
  { value: 'religious', en: 'A religious institution', es: 'Una institución religiosa' },
  { value: 'other', en: 'Other', es: 'Otro' },
] as const satisfies readonly Option<string>[];

export type Behalf = (typeof BEHALF_OPTIONS)[number]['value'];
export const BEHALF_VALUES = BEHALF_OPTIONS.map((o) => o.value) as [Behalf, ...Behalf[]];

/**
 * The value Brevo's LEAD_BEHALF attribute already holds for this answer.
 * It only ever took `individual` and `organization`, and its type can't
 * be checked from here, so anything beyond "an individual" folds into
 * `organization` rather than risk Brevo rejecting the whole request
 * (add-only).
 */
export function leadBehalfAttribute(behalf: readonly Behalf[]): 'individual' | 'organization' {
  return behalf.every((b) => b === 'individual') ? 'individual' : 'organization';
}

/**
 * The Partner tile's "What kind of partnership?" choices (captain,
 * 2026-10-15). `bucket` picks the team inbox the notification goes to
 * (src/lib/server/notifyRouting.ts).
 */
export const PARTNERSHIP_TYPES = [
  { value: 'content-collaboration', en: 'Content collaboration', es: 'Colaboración de contenido', bucket: 'content' },
  { value: 'content-creation', en: 'Content creation', es: 'Creación de contenido', bucket: 'content' },
  { value: 'influencer', en: 'Influencer', es: 'Influencer', bucket: 'content' },
  { value: 'podcast', en: 'Podcast', es: 'Pódcast', bucket: 'podcast' },
  { value: 'nonprofit', en: 'Nonprofit partnership', es: 'Alianza con una organización sin fines de lucro', bucket: 'nonprofit' },
  { value: 'corporate-event', en: 'Corporate event', es: 'Evento corporativo', bucket: 'content' },
  { value: 'other', en: 'Other', es: 'Otro', bucket: 'content' },
] as const satisfies readonly (Option<string> & { bucket: 'content' | 'podcast' | 'nonprofit' })[];

export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number]['value'];
export const PARTNERSHIP_TYPE_VALUES = PARTNERSHIP_TYPES.map((o) => o.value) as [PartnershipType, ...PartnershipType[]];
