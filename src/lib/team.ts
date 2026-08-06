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
    role: { en: 'Brand Management & Programming', es: 'Gestión de Marca y Programación' },
    // Nandi's own words, passed on by the captain (round 16) — VERBATIM.
    // Do not edit wording, punctuation, or order; only the paragraph
    // breaks are ours. "Events & Infrastructure Pilot Programs" reads as
    // a proper programme name, so the Spanish keeps it in English with a
    // gloss in parentheses rather than guessing an official translation.
    bio: [
      {
        en: "Hi, I'm Nandi! I handle all things brand and support David on Events & Infrastructure Pilot Programs. I'm most passionate about curbing littering behaviors through convenient and engaging infrastructure.",
        es: '¡Hola, soy Nandi! Me encargo de todo lo relacionado con la marca y apoyo a David en los Events & Infrastructure Pilot Programs (programas piloto de eventos e infraestructura). Lo que más me apasiona es frenar el hábito de tirar basura mediante infraestructura práctica y atractiva.',
      },
      {
        en: 'Beyond litter reduction, I like to spend my time engaging in youth mentorship, community gardening, and photographing our beautiful green spaces.',
        es: 'Más allá de la reducción de basura, me gusta dedicar mi tiempo a la mentoría de jóvenes, la jardinería comunitaria y a fotografiar nuestros hermosos espacios verdes.',
      },
      {
        en: "The power to change this city lies within each of us. It's when we come together that it expresses itself. Let's get to work!",
        es: 'El poder de cambiar esta ciudad vive en cada uno de nosotros. Es cuando nos unimos que se expresa. ¡Manos a la obra!',
      },
    ],
    socials: [
      { icon: 'linkedin', label: 'LinkedIn', href: '#', placeholder: true },
      { icon: 'instagram', label: 'Instagram', href: '#', placeholder: true },
    ],
    portrait: { fx: 0.295, fy: 0.38, z: 3.6 },
    metaDescription:
      'Meet Nandi — Brand Management & Programming at Trash Talk NYC, working to curb littering through convenient, engaging infrastructure and community effort.',
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
