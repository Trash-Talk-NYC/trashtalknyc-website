/**
 * Country options for the newsletter's outside-NYC flow (captain-
 * approved list from the mockups, United States first). The submitted
 * value is the English name (it lands in Brevo as COUNTRY); the
 * Spanish label is display-only. `code` is the ISO-3166 alpha-2 code
 * the city search uses to scope results; 'Other country' has none.
 */

export interface CountryOption {
  value: string;
  es: string;
  code: string | null;
}

export const US_COUNTRY = 'United States';
export const OTHER_COUNTRY = 'Other country';

export const countries: CountryOption[] = [
  { value: US_COUNTRY, es: 'Estados Unidos', code: 'US' },
  { value: 'Canada', es: 'Canadá', code: 'CA' },
  { value: 'Mexico', es: 'México', code: 'MX' },
  { value: 'Dominican Republic', es: 'República Dominicana', code: 'DO' },
  { value: 'Puerto Rico', es: 'Puerto Rico', code: 'PR' },
  { value: 'Colombia', es: 'Colombia', code: 'CO' },
  { value: 'Brazil', es: 'Brasil', code: 'BR' },
  { value: 'United Kingdom', es: 'Reino Unido', code: 'GB' },
  { value: 'Ireland', es: 'Irlanda', code: 'IE' },
  { value: 'France', es: 'Francia', code: 'FR' },
  { value: 'Germany', es: 'Alemania', code: 'DE' },
  { value: 'Spain', es: 'España', code: 'ES' },
  { value: 'Italy', es: 'Italia', code: 'IT' },
  { value: 'Netherlands', es: 'Países Bajos', code: 'NL' },
  { value: 'India', es: 'India', code: 'IN' },
  { value: 'Japan', es: 'Japón', code: 'JP' },
  { value: 'South Korea', es: 'Corea del Sur', code: 'KR' },
  { value: 'China', es: 'China', code: 'CN' },
  { value: 'Australia', es: 'Australia', code: 'AU' },
  { value: OTHER_COUNTRY, es: 'Otro país', code: null },
];

export const COUNTRY_VALUES = countries.map((c) => c.value);
