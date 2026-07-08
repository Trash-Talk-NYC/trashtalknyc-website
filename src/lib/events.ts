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
