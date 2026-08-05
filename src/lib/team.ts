/**
 * The team, shared by the About page and the individual /about/{person}
 * pages so bios, roles, and social links have exactly one source.
 * About-page-only presentation (hotspot bands, spotlight ellipses) stays
 * in about.astro, keyed by these ids.
 *
 * All user-visible strings carry en/es pairs — the site's language
 * toggle swaps them via data-en/data-es in the templates.
 */

export type SocialIcon = 'instagram' | 'tiktok' | 'linkedin' | 'imdb';

export interface TeamSocial {
  icon: SocialIcon;
  label: string;
  href: string;
  /** True while the captain hasn't supplied the real URL yet. */
  placeholder?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: { en: string; es: string };
  bio: { en: string; es: string }[];
  socials: TeamSocial[];
  /**
   * Portrait crop of the shared group photo for the person's own page
   * (no individual photos exist yet — the captain may supply some
   * later). fx/fy = the point of the full frame (as fractions) to
   * centre the portrait on; z = zoom factor relative to the frame
   * width.
   */
  portrait: { fx: number; fy: number; z: number };
  /** English-only on purpose — meta descriptions don't translate (see AGENTS.md, SEO section). */
  metaDescription: string;
}

// TODO(captain): real LinkedIn/Instagram/IMDb URLs for the placeholder
// slots below — swap href '#' for the profile URL and drop
// `placeholder: true`. Labels deliberately carry no handles: we don't
// invent them.
export const team: TeamMember[] = [
  {
    id: 'nandi',
    name: 'Nandi',
    role: { en: 'Team Member', es: 'Miembro del equipo' },
    // INTERIM bio awaiting the captain's real text: role-grounded copy
    // only — what a crew member does at Trash Talk — asserting no
    // personal facts. Swap in the captain's copy 1:1 when it lands.
    bio: [
      {
        en: 'Nandi is one third of the Trash Talk NYC crew — out at the cleanups with a grabber and a hi-vis vest, helping turn a messy block into a clean one.',
        es: 'Nandi es un tercio del equipo de Trash Talk NYC — presente en las limpiezas con pinza y chaleco reflectante, ayudando a convertir una cuadra sucia en una limpia.',
      },
      {
        en: "Come to an event and she'll get you sorted with gear and a stretch of street. Her full bio lands here soon.",
        es: 'Ven a un evento y te equipará con lo necesario y un tramo de calle. Su biografía completa llegará aquí pronto.',
      },
    ],
    socials: [
      { icon: 'linkedin', label: 'LinkedIn', href: '#', placeholder: true },
      { icon: 'instagram', label: 'Instagram', href: '#', placeholder: true },
    ],
    portrait: { fx: 0.295, fy: 0.38, z: 3.6 },
    metaDescription:
      "Meet Nandi of the Trash Talk NYC crew — out at the club's volunteer cleanup events helping keep New York City's streets clean, block by block.",
  },
  {
    id: 'david',
    name: 'David',
    role: { en: 'Organizer', es: 'Organizador' },
    bio: [
      {
        en: 'Trash Talk is my grassroots social media initiative to clean New York through educational entertainment.',
        es: 'Trash Talk es mi iniciativa de base impulsada por las redes sociales para limpiar Nueva York a través del entretenimiento educativo.',
      },
      {
        en: 'By growing a national and international following, I hope to clean my neighborhood and the city through fun volunteer events and community engagement. Funds for the projects come from donations and sponsorships.',
        es: 'Al generar una comunidad de seguidores a nivel nacional e internacional, espero limpiar mi vecindario y la ciudad a través de eventos de voluntariado divertidos y la participación comunitaria. Los fondos para los proyectos se reciben mediante donaciones y patrocinios.',
      },
      {
        en: "This is an incredibly complex and exciting project, and I hope you'll join us to clean New York!",
        es: '¡Este es un proyecto increíblemente complejo y emocionante, y espero que te unas a nosotros para limpiar Nueva York!',
      },
    ],
    socials: [
      { icon: 'instagram', label: '@trashtalk_nyc', href: 'https://www.instagram.com/trashtalk_nyc/' },
      { icon: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@trashtalk_nyc' },
      { icon: 'linkedin', label: 'LinkedIn', href: '#', placeholder: true },
    ],
    portrait: { fx: 0.472, fy: 0.36, z: 4 },
    metaDescription:
      'Meet David, organizer of Trash Talk NYC — the grassroots initiative cleaning New York City through volunteer cleanup events and educational entertainment.',
  },
  {
    id: 'fabiola',
    name: 'Fabiola',
    role: { en: 'Team Member', es: 'Miembro del equipo' },
    // INTERIM bio awaiting the captain's real text — same rule as
    // Nandi's above: role-grounded, no invented personal facts.
    bio: [
      {
        en: "Fabiola is part of the crew keeping Trash Talk NYC moving — showing up for the cleanups and for the community that's grown around them.",
        es: 'Fabiola es parte del equipo que mantiene a Trash Talk NYC en marcha — presente en las limpiezas y en la comunidad que ha crecido a su alrededor.',
      },
      {
        en: "Find her at the next event and she'll point you to a bag, a grabber, and a block that needs you. Her full bio lands here soon.",
        es: 'Búscala en el próximo evento y te señalará una bolsa, una pinza y una cuadra que te necesita. Su biografía completa llegará aquí pronto.',
      },
    ],
    socials: [
      { icon: 'linkedin', label: 'LinkedIn', href: '#', placeholder: true },
      { icon: 'instagram', label: 'Instagram', href: '#', placeholder: true },
      { icon: 'imdb', label: 'IMDb', href: '#', placeholder: true },
    ],
    portrait: { fx: 0.625, fy: 0.44, z: 3.6 },
    metaDescription:
      "Meet Fabiola of the Trash Talk NYC crew — part of the team cleaning New York block by block; join her at the club's next volunteer cleanup event.",
  },
];

export function getTeamMember(id: string): TeamMember | undefined {
  return team.find((p) => p.id === id);
}
