/**
 * "How to Start a Trash Club" (captain, 2026-11-08: "add a guide page ...
 * based off this guide"): David Clarke's guide with Tom Aulenback of
 * Greenpoint Trash Club, from the team's Canva deck
 * (https://www.canva.com/design/DAHYwQj1mQc/qdnqOIIDoTCRgjsrhP3UPg/view;
 * transcript in firstmate/data/ttnyc-redesign-r2/r15-guide/).
 *
 * The English is the guide's own words and links, in slide order, with
 * nothing added. Only two misspellings are fixed ("transporation",
 * "First aid kid", which slide 6 itself spells "kit"); the rest stays as
 * written, including the route step's grammar. Do not reword it. The
 * Spanish is our translation and follows whatever the English says.
 *
 * Sentences with links are lists of segments (link or not), because
 * setLang swaps leaf text only: each segment is its own leaf, in the same
 * order in both languages.
 */
type Copy = { en: string; es: string };
export type Segment = Copy & { href?: string };

export const GUIDE_PATH = '/start-a-trash-club';

const TTNYC_INSTAGRAM = 'https://www.instagram.com/trashtalk_nyc/';
const GTC_INSTAGRAM = 'https://www.instagram.com/greenpointtrashclub/?hl=en';
const DSNY_VOLUNTEER = 'https://www.nyc.gov/site/dsny/resources/education/volunteer-cleanup.page';
const DSNY_SHEET = 'https://form.jotform.com/240996449198072';
const FLYER_TEMPLATE =
  'https://www.canva.com/design/DAHBxrZ7iB4/byEz_aKl7RxGxrhg5B60IQ/edit?utm_content=DAHBxrZ7iB4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton';

export const guideAuthors: Copy[] = [
  { en: 'David Clarke, Trash Talk NYC', es: 'David Clarke, Trash Talk NYC' },
  { en: 'Tom Aulenback, Greenpoint Trash Club', es: 'Tom Aulenback, Greenpoint Trash Club' },
];

/** Slide 2 */
export const intro = {
  lead: { en: 'So, you want to clean NYC?', es: 'Entonces, ¿quieres limpiar NYC?' },
  paragraphs: [
    {
      en: 'We have led dozens of cleanups across New York City: dumpsites, sidewalks, and parks.',
      es: 'Hemos dirigido decenas de limpiezas por toda la ciudad de Nueva York: vertederos, aceras y parques.',
    },
    {
      en: 'In this guide, we will teach you about NYC’s cleanup community, how to safely host your own cleanups, and how to become an activist for change in your neighborhood.',
      es: 'En esta guía te enseñaremos sobre la comunidad de limpieza de NYC, cómo organizar tus propias limpiezas de forma segura y cómo convertirte en activista por el cambio en tu vecindario.',
    },
    {
      en: 'Grassroots cleanup groups heal communities through joy, hope, and service.',
      es: 'Los grupos de limpieza de base sanan a las comunidades con alegría, esperanza y servicio.',
    },
    {
      en: 'This guide is dedicated to these groups and to our maintenance workers.',
      es: 'Esta guía está dedicada a estos grupos y a nuestros trabajadores de mantenimiento.',
    },
  ] as Copy[],
  creed: [
    { en: 'Service must be fun.', es: 'El servicio debe ser divertido.' },
    { en: 'Service must be accessible.', es: 'El servicio debe ser accesible.' },
    { en: 'Service must be seen.', es: 'El servicio debe verse.' },
  ] as Copy[],
};

export const hostHeading: Copy = { en: 'How to host a cleanup', es: 'Cómo organizar una limpieza' };

/** Slide 3 */
export const equipment = {
  title: { en: 'Equipment', es: 'Equipo' } as Copy,
  items: [
    { en: 'Wagon or cart', es: 'Carrito o carretilla' },
    { en: 'Garbage bags', es: 'Bolsas de basura', note: { en: 'household / contractor', es: 'de uso doméstico / de construcción' } },
    { en: 'Gloves', es: 'Guantes', note: { en: 'latex or washable', es: 'de látex o lavables' } },
    { en: 'Pickup device', es: 'Dispositivo para recoger', note: { en: 'grabber or tongs', es: 'pinza o tenazas' } },
    { en: 'Extra totes', es: 'Bolsas de tela extra' },
    { en: 'Portable speaker', es: 'Bocina portátil' },
    { en: 'Hand sanitizer', es: 'Desinfectante de manos' },
    { en: 'First aid kit', es: 'Botiquín de primeros auxilios' },
    { en: 'Sharps container', es: 'Contenedor para objetos punzantes' },
    { en: 'Safety vest', es: 'Chaleco de seguridad' },
    { en: 'Broom + dustpan', es: 'Escoba + recogedor' },
  ] as (Copy & { note?: Copy })[],
  cheap: {
    en: 'Running a trash club can be cheap with some know-how and creativity.',
    es: 'Llevar un trash club puede salir barato con algo de conocimiento y creatividad.',
  } as Copy,
  resources: [
    { en: 'You can ', es: 'Puedes ' },
    { en: 'request materials from DSNY', es: 'pedir materiales al DSNY', href: DSNY_VOLUNTEER },
    { en: ' (recurring) or ', es: ' (de forma recurrente) o a ' },
    { en: 'Greenpoint Trash Club', es: 'Greenpoint Trash Club', href: GTC_INSTAGRAM },
    {
      en: ' (first event only), request support from local politicians, start a fundraiser, contact your local trash club, or apply for the below grants:',
      es: ' (solo para el primer evento), pedir apoyo a políticos locales, iniciar una recaudación de fondos, contactar a tu trash club local o solicitar las siguientes subvenciones:',
    },
  ] as Segment[],
  grants: [
    { en: 'Sanitation Foundation Tool Grant', es: 'Sanitation Foundation Tool Grant', href: 'https://www.sanitationfoundation.org/communitystewards' },
    { en: 'NYC Green Fund Grassroots Grant', es: 'NYC Green Fund Grassroots Grant', href: 'https://cityparksfoundation.org/grants-more/' },
    { en: 'Citizens Committee for NYC Grant', es: 'Citizens Committee for NYC Grant', href: 'https://www.citizensnyc.org/clg/' },
  ] as Segment[],
};

/** Slide 4 */
export const preparation = {
  title: { en: 'Preparation', es: 'Preparación' } as Copy,
  steps: [
    [{ en: 'Choose a meetup location with public transportation nearby.', es: 'Elige un punto de encuentro con transporte público cerca.' }],
    [
      {
        en: 'Choose a simple route from your meeting point follows the trash along sidewalks, curbs, catch basins, and tree beds.',
        es: 'Elige una ruta sencilla desde tu punto de encuentro que siga la basura por aceras, bordillos, sumideros y alcorques.',
      },
    ],
    [
      { en: 'Create a digital flyer to showcase the meeting date, time, and location. Here’s a free ', es: 'Crea un volante digital con la fecha, la hora y el lugar del encuentro. ¡Aquí tienes una ' },
      { en: 'template', es: 'plantilla', href: FLYER_TEMPLATE },
      { en: ' to get you started!', es: ' gratis para empezar!' },
    ],
    [
      { en: 'Submit this ', es: 'Envía esta ' },
      { en: 'required DSNY sheet', es: 'hoja obligatoria del DSNY', href: DSNY_SHEET },
      {
        en: ' to request materials (if needed), share the route, and submit trash pickup locations.',
        es: ' para pedir materiales (si hace falta), compartir la ruta e indicar los puntos de recogida de basura.',
      },
    ],
    [
      {
        en: 'Share your digital flyer via text, WhatsApp, your social media accounts, or on a dedicated Instagram account like ',
        es: 'Comparte tu volante digital por mensaje de texto, WhatsApp, tus redes sociales o en una cuenta de Instagram dedicada como ',
      },
      { en: 'this one', es: 'esta', href: GTC_INSTAGRAM },
      { en: '.', es: '.' },
    ],
    [{ en: 'Monitor messages and comments for volunteer questions.', es: 'Revisa los mensajes y comentarios por si los voluntarios tienen preguntas.' }],
    [{ en: 'Secure and pack your supplies. You’re ready to go!', es: 'Consigue y empaca tus materiales. ¡Ya estás listo!' }],
  ] as Segment[][],
};

/** Slide 5 */
export const cleanupDay = {
  title: { en: 'Cleanup Day', es: 'El día de la limpieza' } as Copy,
  steps: [
    { en: 'Arrive 15 minutes early and start the music!', es: '¡Llega 15 minutos antes y pon la música!' },
    { en: 'Welcome volunteers as they arrive!', es: '¡Da la bienvenida a los voluntarios a medida que llegan!' },
    { en: 'Distribute grabbers, gloves, bags, etc.', es: 'Reparte pinzas, guantes, bolsas, etc.' },
    { en: 'Begin safety briefing on first aid and sharps', es: 'Empieza la charla de seguridad sobre primeros auxilios y objetos punzantes' },
    { en: 'Follow the route and keep the group supplied', es: 'Sigue la ruta y mantén al grupo abastecido' },
    { en: 'Encourage conversation, teamwork, and friendship', es: 'Fomenta la conversación, el trabajo en equipo y la amistad' },
    { en: 'Return to starting location to return materials', es: 'Vuelve al punto de partida para devolver los materiales' },
    { en: 'Distribute hand sanitizer', es: 'Reparte desinfectante de manos' },
    {
      en: 'Socialize and share photos! Consider hanging out at a local cafe afterwards.',
      es: '¡Socializa y comparte fotos! Considera pasar un rato en un café del barrio después.',
    },
  ] as Copy[],
};

/** Slide 6 */
export const safety = {
  title: { en: 'Safety', es: 'Seguridad' } as Copy,
  items: [
    {
      en: 'For the safety of volunteers and sanitation workers, dispose of sharp objects in a dedicated sharps container. Use your grabber or dustpan, not your hands!',
      es: 'Por la seguridad de los voluntarios y de los trabajadores de sanidad, desecha los objetos punzantes en un contenedor para objetos punzantes. ¡Usa tu pinza o tu recogedor, no las manos!',
    },
    {
      en: 'Provide masks for dusty areas, dump sites, and other areas high in particulate matter.',
      es: 'Ofrece mascarillas para zonas con polvo, vertederos y otras zonas con muchas partículas en el aire.',
    },
    {
      en: 'Be mindful of traffic when clearing roadways or sidewalks, especially with volunteers under the age of 18.',
      es: 'Ten cuidado con el tráfico al limpiar calzadas o aceras, sobre todo con voluntarios menores de 18 años.',
    },
    {
      en: 'Distribute hand sanitizer during and after the cleanup for volunteer health.',
      es: 'Reparte desinfectante de manos durante y después de la limpieza por la salud de los voluntarios.',
    },
    {
      en: 'Always bring a first aid kit, drinking water, and an assigned leader for health emergencies.',
      es: 'Lleva siempre un botiquín de primeros auxilios, agua potable y un líder asignado para emergencias de salud.',
    },
  ] as Copy[],
};

/** Slide 7, David's own account */
export const whyWeClean = {
  title: { en: 'Why we clean', es: 'Por qué limpiamos' } as Copy,
  paragraphs: [
    [
      {
        en: 'I live in Washington Heights, and I noticed my block was constantly filled with litter. I started picking it up, and it made a difference. On May 11th, I posted my first cleanup video on ',
        es: 'Vivo en Washington Heights y noté que mi cuadra siempre estaba llena de basura. Empecé a recogerla y eso marcó la diferencia. El 11 de mayo publiqué mi primer video de limpieza en ',
      },
      { en: 'Instagram', es: 'Instagram', href: TTNYC_INSTAGRAM },
      {
        en: '. When people started reaching out to clean up together, I accidentally started my own trash club.',
        es: '. Cuando la gente empezó a escribirme para limpiar juntos, sin querer fundé mi propio trash club.',
      },
    ],
    [
      {
        en: 'Over the past 171 Days, I have hosted 25 cleanups in 25 different locations with 25 sets of volunteers. I have learned from janitors, commissioners, Parks employees, and grassroots activists.',
        es: 'En los últimos 171 días he organizado 25 limpiezas en 25 lugares distintos con 25 grupos de voluntarios. He aprendido de conserjes, comisionados, empleados de Parques y activistas de base.',
      },
    ],
    [
      {
        en: 'Trash clubs are a powerful tool for uniting a community behind the hope for a better future, starting with today. We do not have to live on dirty streets.',
        es: 'Los trash clubs son una herramienta poderosa para unir a una comunidad en torno a la esperanza de un futuro mejor, empezando hoy. No tenemos por qué vivir en calles sucias.',
      },
    ],
    [
      {
        en: 'Property owners are legally required to keep their sidewalks clean, but this system fails in neighborhoods that do not have supplemental support. Cleanup groups offer communities the chance to maintain their sidewalks affordably and socially.',
        es: 'Los propietarios están obligados por ley a mantener limpias sus aceras, pero este sistema falla en los vecindarios que no tienen apoyo adicional. Los grupos de limpieza ofrecen a las comunidades la oportunidad de mantener sus aceras de forma asequible y en compañía.',
      },
    ],
  ] as Segment[][],
  closing: [
    { en: 'Get out there. Start cleaning. Have fun.', es: 'Sal a la calle. Empieza a limpiar. Diviértete.' },
    { en: 'It shouldn’t be our job, but it can be our joy.', es: 'No debería ser nuestro trabajo, pero puede ser nuestra alegría.' },
    { en: 'Let’s Clean NYC, Together.', es: 'Limpiemos NYC, juntos.' },
  ] as Copy[],
  signature: [
    { en: 'David Clarke, ', es: 'David Clarke, ' },
    { en: 'Trash Talk NYC', es: 'Trash Talk NYC', href: '/' },
  ] as Segment[],
};
