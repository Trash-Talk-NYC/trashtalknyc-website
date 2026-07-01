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

  const res = await fetch(
    `https://www.eventbriteapi.com/v3/organizations/${orgId}/events/?time_filter=all&order_by=start_asc&expand=venue&page_size=100`,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
  );
  if (!res.ok) {
    console.warn(`[events] Eventbrite API request failed at build time: ${res.status} ${res.statusText}`);
    return { upcoming: [], past: [] };
  }

  const data = await res.json() as { events?: unknown[] };
  const now = new Date().toISOString();
  const events = ((data.events ?? []) as EventData[]).filter(e => e.status !== 'draft');
  return {
    upcoming: events.filter(e => e.end.utc > now),
    past: events.filter(e => e.end.utc <= now),
  };
}

export async function fetchEvents(all?: boolean): Promise<EventData[]> {
  const url = all
    ? '/.netlify/functions/next-event?all=true'
    : '/.netlify/functions/next-event';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const data = await res.json() as unknown;
  if (all) {
    const { upcoming = [], past = [] } = data as { upcoming?: EventData[]; past?: EventData[] };
    return [...upcoming, ...past];
  }
  return data ? [data as EventData] : [];
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
