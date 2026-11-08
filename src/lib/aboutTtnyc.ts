/**
 * About (team round 3, captain 2026-11-08; named "About TTNYC" until the
 * captain renamed it the same day): the club's vision,
 * mission, and values, the first item in the About menu. It is a page of
 * its own, separate from the "Our Story" page still to come (captain:
 * "About and our story should be separate. mission on about").
 *
 * The English is the team's own words, verbatim: do not reword it. The
 * Spanish is our translation and follows whatever the English says.
 */
type Copy = { en: string; es: string };

export const ABOUT_TTNYC_PATH = '/about/ttnyc';

export const vision: Copy = {
  en: "Residents are the city's leaders in keeping NYC's public spaces clean.",
  es: 'Los residentes son los líderes de la ciudad en mantener limpios los espacios públicos de Nueva York.',
};

export const mission: Copy = {
  en: "Inspire and empower New Yorkers to take responsibility for their neighborhood's cleanliness, supported by infrastructure, policies, and city services.",
  es: 'Inspirar y empoderar a los neoyorquinos para que se hagan responsables de la limpieza de su vecindario, con el apoyo de infraestructura, políticas y servicios de la ciudad.',
};

/** In the team's order. */
export const values: Copy[] = [
  { en: 'Care', es: 'Cuidado' },
  { en: 'Humility', es: 'Humildad' },
  { en: 'Informed Activism', es: 'Activismo Informado' },
  { en: 'Grassroots Leadership', es: 'Liderazgo de Base' },
  { en: 'Problem Solving', es: 'Resolución de Problemas' },
  { en: 'Accessibility', es: 'Accesibilidad' },
];
