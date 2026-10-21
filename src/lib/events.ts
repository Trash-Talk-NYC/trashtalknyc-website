import type { Lang } from './language';
import { BOROUGHS, boroughForZip, type Borough } from './zip';

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
    /** The venue's ZIP, which places a past event in its borough. */
    postalCode: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  /** The event's own Eventbrite cover image, when it has one. */
  imageUrl: string | null;
};

type Copy = { en: string; es: string };

/** Which line drawing an event flyer carries: a bin, or a glove for planting. */
export type FlyerKind = 'cleanup' | 'planting';

export type EventCardProps = {
  id: string;
  name: string;
  url: string;
  startIso: string;
  endIso: string;
  location: string;
  mapUrls: { google: string; apple: string } | null;
  /** The flyer's huge headline, from the borough when the venue has one. */
  headline: Copy;
  kind: FlyerKind;
  /** The venue as the flyer prints it: name, then address. */
  venueLines: string[];
  /** A partner or host, printed as a badge sticker on the flyer. */
  host?: string;
  /** A made-up event that shows the layout; never a real one. */
  sample?: true;
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
    address?: { localized_address_display?: string | null; city?: string | null; postal_code?: string | null } | null;
    latitude?: string | null;
    longitude?: string | null;
  } | null;
  logo?: { url?: string | null; original?: { url?: string | null } | null } | null;
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
          postalCode: e.venue.address?.postal_code || null,
          lat: e.venue.latitude ? parseFloat(e.venue.latitude) : null,
          lng: e.venue.longitude ? parseFloat(e.venue.longitude) : null,
        }
      : null,
    // The original upload, not Eventbrite's cropped 2:1 rendition
    imageUrl: e.logo?.original?.url || e.logo?.url || null,
  };
}

/** A borough, or null for events held outside the five boroughs. */
export type EventPlace = Borough | null;

export interface PastEventGroup {
  borough: EventPlace;
  events: EventData[];
}

/**
 * Past events grouped by borough (captain, 2026-10-15: "by borough"), in
 * the five boroughs' usual order, then anything outside NYC or without a
 * ZIP last. The borough comes from the venue ZIP through the same NYC
 * ZIP table the signup uses. Events keep their order inside each group
 * (newest first, as fetched). Empty groups are left out.
 */
export function groupPastByBorough(events: EventData[]): PastEventGroup[] {
  const groups = new Map<EventPlace, EventData[]>([...BOROUGHS, null].map((b) => [b, []]));
  for (const ev of events) groups.get(eventBorough(ev))!.push(ev);
  return [...groups].filter(([, list]) => list.length > 0).map(([borough, list]) => ({ borough, events: list }));
}

/** The event's borough from its venue ZIP, or null outside NYC or with no ZIP. */
export function eventBorough(ev: EventData): EventPlace {
  const zip = ev.venue?.postalCode?.trim().slice(0, 5) ?? '';
  return boroughForZip(zip) ?? null;
}

/**
 * The index of the past-events group holding the most recent event, the
 * one borough the page opens (round 10: start collapsed except that one).
 * `newest` is the first event of the newest-first past list.
 */
export function newestGroupIndex(groups: PastEventGroup[], newest: EventData | undefined): number {
  if (!newest) return -1;
  return groups.findIndex((g) => g.events.some((ev) => ev.id === newest.id));
}

/** A planting event carries the glove drawing instead of the bin. */
export function flyerKind(name: string): FlyerKind {
  return /plant/i.test(name) ? 'planting' : 'cleanup';
}

/**
 * The flyer headline, modeled on the team's printed flyers ("Manhattan
 * Cleanup", "Queens Clean & Plant"): the borough plus what happens there.
 * Outside the boroughs, or with no ZIP, the event's own name.
 */
export function flyerHeadline(name: string, borough: EventPlace): Copy {
  if (!borough) return { en: name, es: name };
  const en = borough.replace(/^The /, '');
  const es = borough === 'The Bronx' ? 'el Bronx' : borough;
  return flyerKind(name) === 'planting'
    ? { en: `${en} Clean & Plant`, es: `Limpieza y siembra en ${es}` }
    : { en: `${en} Cleanup`, es: `Limpieza en ${es}` };
}

/** The flyer's date block: "October 18" over "at 10 AM", minutes only when not on the hour. */
export function flyerWhen(iso: string, lang: Lang): { date: string; time: string } {
  const locale = lang === 'es' ? 'es-419' : 'en-US';
  const d = new Date(iso);
  const date = d.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
  const clock = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/:00(?=\D)/, '');
  const at = lang === 'es' ? (d.getHours() % 12 === 1 ? 'a la' : 'a las') : 'at';
  return { date, time: `${at} ${clock}` };
}

/**
 * Shows the sample flyers on Club Events while there are no real upcoming
 * events (round 10, captain 2026-10-21: "we can put a dummy one or two
 * there"). Real Eventbrite events always win. Set to false to show the
 * empty list instead.
 */
export const SHOW_SAMPLE_EVENTS = true;

// Modeled on the team's printed Manhattan Cleanup and Queens Clean & Plant
// flyers. They link nowhere and carry a "Sample" mark.
export const sampleEvents: EventCardProps[] = [
  {
    id: 'sample-manhattan',
    name: 'Manhattan Cleanup',
    url: '',
    startIso: '2026-10-18T10:00:00',
    endIso: '2026-10-18T12:00:00',
    location: 'Inwood Hill Park',
    mapUrls: null,
    headline: { en: 'Manhattan Cleanup', es: 'Limpieza en Manhattan' },
    kind: 'cleanup',
    venueLines: ['Inwood Hill Park'],
    sample: true,
  },
  {
    id: 'sample-queens',
    name: 'Queens Clean & Plant',
    url: '',
    startIso: '2026-10-10T10:00:00',
    endIso: '2026-10-10T12:00:00',
    location: '42-14 Greenpoint Ave, Sunnyside',
    mapUrls: null,
    headline: { en: 'Queens Clean & Plant', es: 'Limpieza y siembra en Queens' },
    kind: 'planting',
    venueLines: ['42-14 Greenpoint Ave', 'Sunnyside'],
    sample: true,
  },
];

/** What a past event's card shows: its own cover, a stand-in photo, or nothing. */
export type PastCover<P> =
  | { kind: 'eventbrite'; url: string }
  | { kind: 'photo'; photo: P }
  | { kind: 'none' };

/**
 * Picks each past card's picture so no picture repeats (captain,
 * 2026-10-21: "diversify images"). Many Eventbrite events reuse one
 * cover, so in display order the first event keeps a cover and later
 * repeats (and events with no cover) take the next unused stand-in
 * photo. Once the stand-ins run out, a repeat keeps its own cover:
 * a repeated picture beats a blank card.
 */
export function assignPastCovers<P>(groups: PastEventGroup[], photos: readonly P[]): Map<string, PastCover<P>> {
  const covers = new Map<string, PastCover<P>>();
  const seen = new Set<string>();
  let next = 0;
  for (const ev of groups.flatMap((g) => g.events)) {
    const url = ev.imageUrl;
    if (url && !seen.has(url)) {
      seen.add(url);
      covers.set(ev.id, { kind: 'eventbrite', url });
    } else if (next < photos.length) {
      covers.set(ev.id, { kind: 'photo', photo: photos[next++] });
    } else {
      covers.set(ev.id, url ? { kind: 'eventbrite', url } : { kind: 'none' });
    }
  }
  return covers;
}

export function toEventCardProps(ev: EventData): EventCardProps {
  const startIso = ev.start.local || ev.start.utc;
  const endIso = ev.end.local || ev.end.utc;
  const v = ev.venue;
  const location = v ? (v.name || '') + (v.city ? `, ${v.city}` : '') : '';
  const venueLines = [v?.name, v?.address].filter((line, i, all): line is string => !!line && all.indexOf(line) === i);
  return {
    id: ev.id,
    name: ev.name,
    url: ev.url,
    startIso,
    endIso,
    location,
    mapUrls: getMapUrls(ev),
    headline: flyerHeadline(ev.name, eventBorough(ev)),
    kind: flyerKind(ev.name),
    venueLines,
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
