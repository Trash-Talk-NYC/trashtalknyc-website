/**
 * Rolling preferred-month options for the Lead a Cleanup form: the
 * current month plus the next few, formatted as "October 2026". The
 * stored value is always the English form (it lands in Brevo); the
 * Spanish label is display-only. Shared with the server schema so the
 * window the form offers is exactly the window the action accepts.
 */

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface MonthOption {
  /** Submitted + stored value, e.g. "October 2026". */
  value: string;
  en: string;
  es: string;
}

/** How many months the form offers (current month included). */
export const LEAD_MONTH_COUNT = 6;

export function rollingMonths(count: number = LEAD_MONTH_COUNT, from: Date = new Date()): MonthOption[] {
  const es = new Intl.DateTimeFormat('es-419', { month: 'long', year: 'numeric' });
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const value = `${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`;
    return { value, en: value, es: es.format(d) };
  });
}

/**
 * Server-side check for the submitted month. The page offers
 * LEAD_MONTH_COUNT options, but the window is validated a little wider
 * on both ends: the options are built from the browser's clock while
 * this runs on the server's (UTC on Netlify), so around a month
 * boundary the applicant's "current month" can be the server's previous
 * one — that single month back is accepted, and the future end runs to
 * 12 months so a form rendered just before a rollover still submits.
 * Anything older or unparseable is rejected.
 */
export function isValidPreferredMonth(value: string, now: Date = new Date()): boolean {
  const match = /^([A-Z][a-z]+) (20\d{2})$/.exec(value.trim());
  if (!match) return false;
  const monthIndex = MONTHS_EN.indexOf(match[1] as (typeof MONTHS_EN)[number]);
  if (monthIndex === -1) return false;
  const offset = (Number(match[2]) - now.getFullYear()) * 12 + (monthIndex - now.getMonth());
  return offset >= -1 && offset < 12;
}
