/**
 * The team — single source for names, roles, and bios, consumed by the
 * About page. The individual /about/{person} pages were pulled from
 * this release onto fm/about-individual-pages (captain, round 23);
 * `socials`, `portrait`, and `metaDescription` are only consumed there,
 * and are kept here so the data survives until those pages return.
 * About-page-only presentation (hotspot bands, spotlight ellipses)
 * stays in about.astro, keyed by these ids.
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

/**
 * One piece of a bio paragraph. Paragraphs are usually a single plain
 * {en, es} pair, but a paragraph carrying an inline link must be split
 * into leaf segments (`parts`): setLang only swaps textContent on LEAF
 * elements with data-en/data-es, so a paragraph that contains an <a>
 * can't translate as one block — each text run and the link label get
 * their own leaf instead.
 */
export interface BioSegment {
  en: string;
  es: string;
  /** When set, this segment renders as an inline link. */
  href?: string;
}

export interface BioParagraph {
  en?: string;
  es?: string;
  /** Mixed-content form — when present, templates render these leaf
      segments and ignore en/es. */
  parts?: BioSegment[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: { en: string; es: string };
  bio: BioParagraph[];
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
    role: { en: 'Brand Management & Programs', es: 'Gestión de Marca y Programas' },
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
      'Meet Nandi, Brand Management & Programs at Trash Talk NYC, working to curb littering through convenient, engaging infrastructure and community effort.',
  },
  {
    id: 'david',
    name: 'David',
    role: { en: 'Lead Organizer', es: 'Organizador Principal' },
    // The captain's own words — VERBATIM (superseding round 28's text;
    // the "Hello!" opener stays deliberately distinct from Nandi's and
    // Fabiola's "Hi, I'm"). Only the paragraph breaks are ours.
    bio: [
      {
        en: "Hello! I'm David. Trash Talk NYC is my grassroots social media initiative to clean New York City through educational entertainment, litter infrastructure, and events.",
        es: '¡Hola! Soy David. Trash Talk NYC es mi iniciativa de base impulsada por las redes sociales para limpiar la ciudad de Nueva York a través del entretenimiento educativo, la infraestructura contra la basura y los eventos.',
      },
      {
        en: 'By growing a national and international following, I hope to clean my neighborhood and the city through fun volunteer events and community engagement. Funds for the projects come from community contributions and sponsorships.',
        es: 'Al generar una comunidad de seguidores a nivel nacional e internacional, espero limpiar mi vecindario y la ciudad a través de eventos de voluntariado divertidos y la participación comunitaria. Los fondos para los proyectos se reciben mediante aportes de la comunidad y patrocinios.',
      },
      {
        en: "This is an incredibly complex and exciting project, and I hope you'll join us to clean New York City!",
        es: '¡Este es un proyecto increíblemente complejo y emocionante, y espero que te unas a nosotros para limpiar la ciudad de Nueva York!',
      },
    ],
    socials: [
      { icon: 'instagram', label: '@trashtalk_nyc', href: 'https://www.instagram.com/trashtalk_nyc/' },
      { icon: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@trashtalk_nyc' },
      { icon: 'linkedin', label: 'LinkedIn', href: '#', placeholder: true },
    ],
    portrait: { fx: 0.472, fy: 0.36, z: 4 },
    metaDescription:
      'Meet David, organizer of Trash Talk NYC, the grassroots initiative cleaning New York City through volunteer cleanup events and educational entertainment.',
  },
  {
    id: 'fabiola',
    name: 'Fabiola',
    role: { en: 'Technology', es: 'Tecnología' },
    // The captain's own words (round 18) — VERBATIM, already through an
    // editing pass and approved. "I'm on anything Trash Talk tech" and
    // "this stuff" are deliberately casual; the em dashes are
    // intentional pacing. Only the paragraph breaks are ours. The
    // second paragraph is split into leaf segments so "please get in
    // touch" can be a real link to /contact and still translate.
    bio: [
      {
        en: "Hi, I'm Fabiola! I'm on anything Trash Talk tech — this website included. I care that this stuff actually works for everyone.",
        es: '¡Hola, soy Fabiola! Ando metida en todo lo tech de Trash Talk — este sitio incluido. Me importa que estas cosas de verdad funcionen para todos.',
      },
      {
        // Captain-written (round 27): the ellipses runs — three dots
        // then FOUR ("problem….actually") — are her deliberate informal
        // pauses; there is deliberately no closing full stop; and it is
        // first-person "reach me" now (superseding round 19's "us").
        // Keep all of it exactly. /contact IS the General-form deep
        // link: the General tab is statically `active` in
        // contact.astro's server markup (JS-free included) and nothing
        // URL-driven changes tabs.
        parts: [
          {
            en: "If you can't easily find an event, join our mailing list, or figure out how to support us, well…that's a problem….actually please reach me via ",
            es: 'Si no puedes encontrar un evento fácilmente, unirte a nuestra lista de correo o entender cómo apoyarnos, pues…eso es un problema….de hecho, mejor escríbeme por ',
          },
          {
            en: 'the contact form',
            es: 'el formulario de contacto',
            href: '/contact',
          },
        ],
      },
      {
        // Captain's rewrite (round 27): "I explore", and "a cleaner New
        // York" removed deliberately. Sole firstmate edit, flagged to
        // the captain: "to further empowering and mobilizing" →
        // "to further empower and mobilize" so "further" gets the bare
        // verbs it needs.
        en: 'Alongside supporting Nandi and David, I explore technical solutions to further empower and mobilize communities and neighborhoods.',
        es: 'Además de apoyar a Nandi y David, exploro soluciones técnicas para empoderar y movilizar aún más a las comunidades y los vecindarios.',
      },
    ],
    socials: [
      { icon: 'linkedin', label: 'LinkedIn', href: '#', placeholder: true },
      { icon: 'instagram', label: 'Instagram', href: '#', placeholder: true },
      { icon: 'imdb', label: 'IMDb', href: '#', placeholder: true },
    ],
    portrait: { fx: 0.625, fy: 0.44, z: 3.6 },
    metaDescription:
      "Meet Fabiola, Technology at Trash Talk NYC, building the club's website and tech so finding events, joining the list, and supporting the cleanups works for everyone.",
  },
];

export function getTeamMember(id: string): TeamMember | undefined {
  return team.find((p) => p.id === id);
}
