import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Phone validation shared by the page scripts and the server schemas
 * (libphonenumber-js is isomorphic, so both sides enforce the same
 * rule): a 10-digit US number, or an international number written
 * with + and its country code — people outside the US can sign up.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Without a +, digits are read as a US national number, which is how
  // the forms present the field ("(212) 555-0100 or +44 …").
  return parsePhoneNumberFromString(trimmed, 'US')?.isValid() ?? false;
}

/** The bilingual inline error the forms show for an invalid phone. */
export const PHONE_ERROR = {
  en: 'Enter a US number like (212) 555-0100, or start with + and your country code, like +44 20 7946 0958.',
  es: 'Escribe un número de EE. UU. como (212) 555-0100, o empieza con + y tu código de país, como +44 20 7946 0958.',
};
