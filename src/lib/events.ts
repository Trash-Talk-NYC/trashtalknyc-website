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
