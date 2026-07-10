import type { Lang } from './language';

export type EventData = {
  id: string;
  name: string;
  url: string;
  status: string;
  start: { local: string | null; utc: string };
  end: { local: string | null; utc: string };
  venue: {
    name: string | null;
    address: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
};

export type EventCardProps = {
  id: string;
  name: string;
  url: string;
  startIso: string;
  endIso: string;
  location: string;
  mapUrls: { google: string; apple: string } | null;
};

// Shape returned by the Eventbrite API itself — distinct from EventData
// because Eventbrite nests/stringifies fields (name.text, venue.address as
// an object, latitude/longitude as strings) that EventData flattens.
type EventbriteApiEvent = {
  id: string;
  name?: { text?: string | null } | null;
  url: string;
  status: string;
  start: { local: string | null; utc: string };
  end: { local: string | null; utc: string };
  venue?: {
    name: string | null;
    address?: { localized_address_display?: string | null; city?: string | null } | null;
    latitude?: string | null;
    longitude?: string | null;
  } | null;
};

export function mapEventbriteEvent(e: EventbriteApiEvent): EventData {
  return {
    id: e.id,
    name: e.name?.text || '',
    url: e.url,
    status: e.status,
    start: e.start,
    end: e.end,
    venue: e.venue
      ? {
          name: e.venue.name,
          address: e.venue.address?.localized_address_display || null,
          city: e.venue.address?.city || null,
          lat: e.venue.latitude ? parseFloat(e.venue.latitude) : null,
          lng: e.venue.longitude ? parseFloat(e.venue.longitude) : null,
        }
      : null,
  };
}

export function toEventCardProps(ev: EventData): EventCardProps {
  const startIso = ev.start.local || ev.start.utc;
  const endIso = ev.end.local || ev.end.utc;
  const v = ev.venue;
  const location = v ? (v.name || '') + (v.city ? `, ${v.city}` : '') : '';
  return {
    id: ev.id,
    name: ev.name,
    url: ev.url,
    startIso,
    endIso,
    location,
    mapUrls: getMapUrls(ev),
  };
}

type EventbriteEventsPage = {
  events?: EventbriteApiEvent[];
  pagination?: { has_more_items?: boolean; continuation?: string | null };
};

// Bounds the continuation loop so a misbehaving API response can't hang a build.
const MAX_EVENT_PAGES = 10;

/**
 * Fetches every page of an organization events query. Returns null on a
 * failed request so callers can tell "API broke" apart from "no events".
 */
async function fetchAllEventbritePages(
  orgId: string,
  token: string,
  query: string,
): Promise<EventbriteApiEvent[] | null> {
  const events: EventbriteApiEvent[] = [];
  let continuation = '';
  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/organizations/${orgId}/events/` +
        `?${query}&expand=venue&page_size=100${continuation && `&continuation=${continuation}`}`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );
    if (!res.ok) {
      console.warn(`[events] Eventbrite API request failed at build time (${query}): ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json() as EventbriteEventsPage;
    events.push(...(data.events ?? []));
    if (!data.pagination?.has_more_items || !data.pagination.continuation) return events;
    continuation = data.pagination.continuation;
  }
  console.warn(`[events] Eventbrite returned more than ${MAX_EVENT_PAGES} pages (${query}); later events were dropped`);
  return events;
}

export async function fetchEventsAtBuildTime(): Promise<{ upcoming: EventData[]; past: EventData[] }> {
  const token = import.meta.env.EVENTBRITE_TOKEN as string | undefined;
  const orgId = import.meta.env.EVENTBRITE_ORGANIZER_ID as string | undefined;
  if (!token || !orgId) {
    // Silent in the rendered page (falls back to "no upcoming events"), so
    // this is the only signal that Eventbrite env vars are missing for this
    // deploy context.
    console.warn(
      `[events] Eventbrite build-time fetch skipped — missing ${!token ? 'EVENTBRITE_TOKEN ' : ''}${!orgId ? 'EVENTBRITE_ORGANIZER_ID' : ''}`.trim(),
    );
    return { upcoming: [], past: [] };
  }

  // Two queries instead of one time_filter=all fetch: sorted start_asc, a
  // single query fills page 1 with the oldest events, so upcoming events
  // silently vanish once the org passes 100 lifetime events.
  const [upcomingRaw, pastRaw] = await Promise.all([
    fetchAllEventbritePages(orgId, token, 'time_filter=current_future&order_by=start_asc'),
    fetchAllEventbritePages(orgId, token, 'time_filter=past&order_by=start_desc'),
  ]);

  // Eventbrite's current/past split doesn't exactly match the site's rule
  // (anything not yet *ended* counts as upcoming), so re-classify by end
  // time over the merged set, deduped in case an in-progress event shows
  // up in both queries.
  const byId = new Map<string, EventData>();
  for (const e of [...(pastRaw ?? []), ...(upcomingRaw ?? [])]) {
    if (e.status === 'draft') continue;
    byId.set(e.id, mapEventbriteEvent(e));
  }
  const events = [...byId.values()];
  const now = new Date().toISOString();
  return {
    upcoming: events.filter(e => e.end.utc > now).sort((a, b) => a.start.utc.localeCompare(b.start.utc)),
    past: events.filter(e => e.end.utc <= now).sort((a, b) => b.start.utc.localeCompare(a.start.utc)),
  };
}

export function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(
    lang === 'es' ? 'es-419' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  );
}

export function formatTime(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleTimeString(
    lang === 'es' ? 'es-419' : 'en-US',
    { hour: 'numeric', minute: '2-digit', hour12: true },
  );
}

/* ── Boroughs ─────────────────────────────────────────────────────────── */

export type BoroughId = 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten-island';

export type BoroughMeta = {
  id: BoroughId;
  /** Standalone display name ("The Bronx"). */
  labelEn: string;
  labelEs: string;
  /** Mid-sentence form after "Next event in …" / "Próximo evento en …". */
  inEn: string;
  inEs: string;
};

export const BOROUGHS: readonly BoroughMeta[] = [
  { id: 'manhattan', labelEn: 'Manhattan', labelEs: 'Manhattan', inEn: 'Manhattan', inEs: 'Manhattan' },
  { id: 'brooklyn', labelEn: 'Brooklyn', labelEs: 'Brooklyn', inEn: 'Brooklyn', inEs: 'Brooklyn' },
  { id: 'queens', labelEn: 'Queens', labelEs: 'Queens', inEn: 'Queens', inEs: 'Queens' },
  { id: 'bronx', labelEn: 'The Bronx', labelEs: 'El Bronx', inEn: 'the Bronx', inEs: 'el Bronx' },
  { id: 'staten-island', labelEn: 'Staten Island', labelEs: 'Staten Island', inEn: 'Staten Island', inEs: 'Staten Island' },
] as const;

// Eventbrite venue cities observed in real club events: "New York" (any
// Manhattan neighborhood), "Brooklyn", "Queens", "The Bronx". Aliases cover
// the borough names themselves for venues entered differently.
const CITY_TO_BOROUGH: Record<string, BoroughId> = {
  'new york': 'manhattan',
  manhattan: 'manhattan',
  brooklyn: 'brooklyn',
  queens: 'queens',
  bronx: 'bronx',
  'the bronx': 'bronx',
  'staten island': 'staten-island',
};

// Reference points for the lat/lng fallback when the venue city is a
// neighborhood name Eventbrite didn't normalize (e.g. "Astoria"). Several
// points per borough because single centroids misclassify the edges (western
// Queens sits nearer Manhattan's centroid than Queens'). The `null` points
// are across-the-Hudson NJ anchors so a Jersey City venue beats every NYC
// point and resolves to "no borough" instead of Manhattan.
const BOROUGH_REF_POINTS: readonly { lat: number; lng: number; id: BoroughId | null }[] = [
  { lat: 40.7061, lng: -74.0086, id: 'manhattan' },      // Financial District
  { lat: 40.7549, lng: -73.984, id: 'manhattan' },       // Midtown
  { lat: 40.8116, lng: -73.9465, id: 'manhattan' },      // Harlem
  { lat: 40.867, lng: -73.9212, id: 'manhattan' },       // Inwood
  { lat: 40.6928, lng: -73.9903, id: 'brooklyn' },       // Downtown Brooklyn
  { lat: 40.7143, lng: -73.9435, id: 'brooklyn' },       // Williamsburg
  { lat: 40.645, lng: -73.945, id: 'brooklyn' },         // Flatbush
  { lat: 40.578, lng: -73.959, id: 'brooklyn' },         // Coney Island
  { lat: 40.7644, lng: -73.9235, id: 'queens' },         // Astoria
  { lat: 40.7447, lng: -73.9485, id: 'queens' },         // Long Island City
  { lat: 40.7, lng: -73.906, id: 'queens' },             // Ridgewood
  { lat: 40.7282, lng: -73.7949, id: 'queens' },         // Central Queens
  { lat: 40.6913, lng: -73.8057, id: 'queens' },         // Jamaica
  { lat: 40.586, lng: -73.816, id: 'queens' },           // Rockaway Beach
  { lat: 40.8175, lng: -73.9203, id: 'bronx' },          // Mott Haven
  { lat: 40.8448, lng: -73.8648, id: 'bronx' },          // Central Bronx
  { lat: 40.8862, lng: -73.9105, id: 'bronx' },          // Riverdale
  { lat: 40.6437, lng: -74.0765, id: 'staten-island' },  // St. George
  { lat: 40.5795, lng: -74.1502, id: 'staten-island' },  // Central SI
  { lat: 40.5254, lng: -74.2118, id: 'staten-island' },  // South Shore
  { lat: 40.7178, lng: -74.0431, id: null },             // Jersey City, NJ
  { lat: 40.744, lng: -74.0324, id: null },              // Hoboken, NJ
  { lat: 40.6687, lng: -74.1143, id: null },             // Bayonne, NJ
];

export function getBorough(event: EventData): BoroughId | null {
  const v = event.venue;
  if (!v) return null;
  const byCity = v.city && CITY_TO_BOROUGH[v.city.trim().toLowerCase()];
  if (byCity) return byCity;
  if (v.lat == null || v.lng == null) return null;
  let best: BoroughId | null = null;
  let bestDist = Infinity;
  for (const p of BOROUGH_REF_POINTS) {
    const d = (v.lat - p.lat) ** 2 + (v.lng - p.lng) ** 2;
    if (d < bestDist) { bestDist = d; best = p.id; }
  }
  // Farther than 0.1° (≈7 mi north–south, ≈5 mi east–west at NYC's
  // latitude) from every reference point means "not NYC".
  return bestDist <= 0.1 ** 2 ? best : null;
}

/** Groups upcoming events by borough, preserving soonest-first order. */
export function groupUpcomingByBorough(upcoming: EventData[]): Map<BoroughId, EventData[]> {
  const byBorough = new Map<BoroughId, EventData[]>();
  for (const ev of upcoming) {
    const b = getBorough(ev);
    if (!b) continue;
    const list = byBorough.get(b) ?? [];
    list.push(ev);
    byBorough.set(b, list);
  }
  return byBorough;
}

/* ── Club stats ("X events in Y weeks") ───────────────────────────────── */

/** First club cleanup — the "Y weeks" clock starts here. Never hand-update. */
export const CLUB_FOUNDED_ISO = '2026-05-11';

/**
 * SEED for the total-events counter: past club events hand-counted on
 * Eventbrite as of `asOfIso`. Past events that END after `asOfIso` are added
 * automatically at build time, so this pair only ever changes if the
 * Eventbrite history itself is corrected — not as new events happen.
 */
export const EVENTS_HELD_SEED = { count: 17, asOfIso: '2026-07-10T00:00:00Z' };

export function getClubStats(past: EventData[], now: Date = new Date()): { events: number; weeks: number } {
  const events = EVENTS_HELD_SEED.count + past.filter(e => e.end.utc > EVENTS_HELD_SEED.asOfIso).length;
  const msSinceFounding = now.getTime() - new Date(`${CLUB_FOUNDED_ISO}T00:00:00-04:00`).getTime();
  const weeks = Math.max(1, Math.ceil(msSinceFounding / (7 * 864e5)));
  return { events, weeks };
}

export function getMapUrls(event: EventData): { google: string; apple: string } | null {
  const v = event.venue;
  if (!v) return null;
  const q = v.address ?? ((v.name ?? '') + (v.city ? `, ${v.city}` : ''));
  if (!q) return null;
  const enc = encodeURIComponent(q);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${enc}`,
    apple: `https://maps.apple.com/?q=${enc}`,
  };
}
