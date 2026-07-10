import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVENTS_HELD_SEED,
  fetchEventsAtBuildTime,
  formatDate,
  formatTime,
  getBorough,
  getClubStats,
  getMapUrls,
  groupUpcomingByBorough,
} from '../events';
import type { EventData } from '../events';

// ── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  const iso = '2025-06-28T14:00:00Z';

  it('matches toLocaleDateString with en-US locale', () => {
    const expected = new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    expect(formatDate(iso, 'en')).toBe(expected);
  });

  it('matches toLocaleDateString with es locale', () => {
    const expected = new Date(iso).toLocaleDateString('es-419', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    expect(formatDate(iso, 'es')).toBe(expected);
  });

  it('produces different output for en vs es', () => {
    expect(formatDate(iso, 'en')).not.toBe(formatDate(iso, 'es'));
  });
});

// ── formatTime ──────────────────────────────────────────────────────────────

describe('formatTime', () => {
  const iso = '2025-06-28T14:00:00Z';

  it('matches toLocaleTimeString with en-US locale', () => {
    const expected = new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    expect(formatTime(iso, 'en')).toBe(expected);
  });

  it('matches toLocaleTimeString with es locale', () => {
    const expected = new Date(iso).toLocaleTimeString('es-419', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    expect(formatTime(iso, 'es')).toBe(expected);
  });

  it('produces different output for en vs es', () => {
    expect(formatTime(iso, 'en')).not.toBe(formatTime(iso, 'es'));
  });
});

// ── getMapUrls ──────────────────────────────────────────────────────────────

describe('getMapUrls', () => {
  it('returns null when venue is null', () => {
    const event = { venue: null } as unknown as EventData;
    expect(getMapUrls(event)).toBeNull();
  });

  it('returns null when venue has no address and no name', () => {
    const event = {
      venue: { name: null, address: null, city: null, lat: null, lng: null },
    } as unknown as EventData;
    expect(getMapUrls(event)).toBeNull();
  });

  it('returns Google Maps and Apple Maps URLs from venue address', () => {
    const event = {
      venue: { address: '123 Main St, Brooklyn', name: null, city: null, lat: null, lng: null },
    } as unknown as EventData;
    const result = getMapUrls(event);
    expect(result).not.toBeNull();
    expect(result!.google).toContain('google.com/maps');
    expect(result!.google).toContain(encodeURIComponent('123 Main St, Brooklyn'));
    expect(result!.apple).toContain('maps.apple.com');
    expect(result!.apple).toContain(encodeURIComponent('123 Main St, Brooklyn'));
  });

  it('builds query from name and city when address is null', () => {
    const event = {
      venue: { name: 'Prospect Park', address: null, city: 'Brooklyn', lat: null, lng: null },
    } as unknown as EventData;
    const result = getMapUrls(event);
    expect(result).not.toBeNull();
    const encoded = encodeURIComponent('Prospect Park, Brooklyn');
    expect(result!.google).toContain(encoded);
    expect(result!.apple).toContain(encoded);
  });

  it('uses only name when city is null and address is null', () => {
    const event = {
      venue: { name: 'Central Park', address: null, city: null, lat: null, lng: null },
    } as unknown as EventData;
    const result = getMapUrls(event);
    expect(result).not.toBeNull();
    expect(result!.google).toContain(encodeURIComponent('Central Park'));
  });
});

// ── getBorough / groupUpcomingByBorough ─────────────────────────────────────

const eventWithVenue = (venue: EventData['venue'], id = 'x'): EventData => ({
  id,
  name: 'Test',
  url: 'https://example.com',
  status: 'live',
  start: { local: null, utc: '2099-01-01T14:00:00Z' },
  end: { local: null, utc: '2099-01-01T16:00:00Z' },
  venue,
});

describe('getBorough', () => {
  it('maps Eventbrite city names to boroughs, including "New York" → Manhattan', () => {
    expect(getBorough(eventWithVenue({ name: null, address: null, city: 'New York', lat: null, lng: null }))).toBe('manhattan');
    expect(getBorough(eventWithVenue({ name: null, address: null, city: 'Brooklyn', lat: null, lng: null }))).toBe('brooklyn');
    expect(getBorough(eventWithVenue({ name: null, address: null, city: 'The Bronx', lat: null, lng: null }))).toBe('bronx');
    expect(getBorough(eventWithVenue({ name: null, address: null, city: 'Staten Island', lat: null, lng: null }))).toBe('staten-island');
  });

  it('falls back to nearest borough by coordinates when the city is a neighborhood', () => {
    // Astoria, Queens
    const ev = eventWithVenue({ name: null, address: null, city: 'Astoria', lat: 40.7644, lng: -73.9235 });
    expect(getBorough(ev)).toBe('queens');
  });

  it('attributes the Rockaway peninsula to Queens', () => {
    const ev = eventWithVenue({ name: null, address: null, city: 'Rockaway Beach', lat: 40.586, lng: -73.816 });
    expect(getBorough(ev)).toBe('queens');
  });

  it('returns null for venues outside NYC and for events without a venue', () => {
    // Jersey City
    expect(getBorough(eventWithVenue({ name: null, address: null, city: 'Jersey City', lat: 40.7178, lng: -74.0431 }))).toBeNull();
    expect(getBorough(eventWithVenue(null))).toBeNull();
  });
});

describe('groupUpcomingByBorough', () => {
  it('groups by borough preserving order and skips borough-less events', () => {
    const bk1 = eventWithVenue({ name: null, address: null, city: 'Brooklyn', lat: null, lng: null }, 'bk1');
    const mn = eventWithVenue({ name: null, address: null, city: 'New York', lat: null, lng: null }, 'mn');
    const bk2 = eventWithVenue({ name: null, address: null, city: 'Brooklyn', lat: null, lng: null }, 'bk2');
    const noVenue = eventWithVenue(null, 'nv');

    const grouped = groupUpcomingByBorough([bk1, mn, bk2, noVenue]);
    expect([...grouped.keys()]).toEqual(['brooklyn', 'manhattan']);
    expect(grouped.get('brooklyn')!.map(e => e.id)).toEqual(['bk1', 'bk2']);
  });
});

// ── getClubStats ────────────────────────────────────────────────────────────

describe('getClubStats', () => {
  const pastEndingAt = (endUtc: string): EventData => ({
    ...eventWithVenue(null, `p-${endUtc}`),
    end: { local: null, utc: endUtc },
  });

  it('adds past events ending after the seed as-of date to the seed count', () => {
    const before = pastEndingAt('2026-07-01T00:00:00Z');
    const after1 = pastEndingAt('2026-07-15T00:00:00Z');
    const after2 = pastEndingAt('2026-08-01T00:00:00Z');
    const { events } = getClubStats([before, after1, after2], new Date('2026-08-02T00:00:00Z'));
    expect(events).toBe(EVENTS_HELD_SEED.count + 2);
  });

  it('computes whole weeks since founding (2026-05-11), never zero', () => {
    expect(getClubStats([], new Date('2026-07-10T12:00:00-04:00')).weeks).toBe(9);
    expect(getClubStats([], new Date('2026-05-12T12:00:00-04:00')).weeks).toBe(1);
    expect(getClubStats([], new Date('2026-05-11T01:00:00-04:00')).weeks).toBe(1);
  });
});

// ── fetchEventsAtBuildTime ──────────────────────────────────────────────────

describe('fetchEventsAtBuildTime', () => {
  // Eventbrite's actual API shape: name is nested ({ text }), venue.address
  // is a nested object, and latitude/longitude are strings. This is what
  // fetchEventsAtBuildTime receives over the wire and must flatten into
  // EventData — regression coverage for a bug where it was cast straight
  // through unmapped, rendering "[object Object]" for name and map links.
  const rawEvent = {
    id: '123',
    name: { text: 'Prospect Park Cleanup', html: '<p>Prospect Park Cleanup</p>' },
    url: 'https://eventbrite.com/e/123',
    status: 'live',
    start: { local: '2099-06-28T10:00:00', utc: '2099-06-28T14:00:00Z' },
    end: { local: '2099-06-28T12:00:00', utc: '2099-06-28T16:00:00Z' },
    venue: {
      name: 'Prospect Park',
      address: {
        address_1: '95 Prospect Park W',
        city: 'Brooklyn',
        localized_address_display: '95 Prospect Park W, Brooklyn, NY',
      },
      latitude: '40.6602',
      longitude: '-73.9690',
    },
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('EVENTBRITE_TOKEN', 'test-token');
    vi.stubEnv('EVENTBRITE_ORGANIZER_ID', 'test-org');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const okPage = (events: unknown[], pagination?: unknown) =>
    ({ ok: true, json: async () => ({ events, pagination }) }) as Response;

  /**
   * fetchEventsAtBuildTime now issues two queries (current_future + past);
   * this routes the mock by time_filter so tests can control each side.
   */
  const mockEventbrite = (byFilter: { current_future?: unknown[]; past?: unknown[] }) => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      const filter = url.includes('time_filter=current_future') ? 'current_future' : 'past';
      return okPage(byFilter[filter] ?? []);
    });
  };

  it('flattens Eventbrite\'s nested name and venue shape into EventData', async () => {
    mockEventbrite({ current_future: [rawEvent] });

    const { upcoming } = await fetchEventsAtBuildTime();
    expect(upcoming).toHaveLength(1);
    const ev = upcoming[0];
    expect(ev.name).toBe('Prospect Park Cleanup');
    expect(ev.venue?.address).toBe('95 Prospect Park W, Brooklyn, NY');
    expect(ev.venue?.city).toBe('Brooklyn');
    expect(ev.venue?.lat).toBe(40.6602);
    expect(ev.venue?.lng).toBe(-73.969);
  });

  it('produces map URLs and card name without "[object Object]"', async () => {
    mockEventbrite({ current_future: [rawEvent] });

    const { upcoming } = await fetchEventsAtBuildTime();
    const mapUrls = getMapUrls(upcoming[0]);
    expect(mapUrls?.google).not.toContain('object%20Object');
    expect(mapUrls?.apple).not.toContain('object%20Object');
    expect(upcoming[0].name).not.toContain('[object Object]');
  });

  it('splits into upcoming and past based on end time, filters drafts', async () => {
    const pastEvent = {
      ...rawEvent,
      id: '456',
      start: { local: '2020-01-01T10:00:00', utc: '2020-01-01T14:00:00Z' },
      end: { local: '2020-01-01T12:00:00', utc: '2020-01-01T16:00:00Z' },
    };
    const draftEvent = { ...rawEvent, id: '789', status: 'draft' };
    mockEventbrite({ current_future: [rawEvent, draftEvent], past: [pastEvent] });

    const { upcoming, past } = await fetchEventsAtBuildTime();
    expect(upcoming.map(e => e.id)).toEqual(['123']);
    expect(past.map(e => e.id)).toEqual(['456']);
  });

  it('queries upcoming and past separately instead of one start_asc page', async () => {
    // Regression: a single time_filter=all&order_by=start_asc query fills
    // page 1 with the oldest events once the org passes 100 lifetime
    // events, silently dropping every upcoming event.
    mockEventbrite({ current_future: [rawEvent] });

    await fetchEventsAtBuildTime();

    const urls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(urls).toHaveLength(2);
    expect(urls.some(u => u.includes('time_filter=current_future') && u.includes('order_by=start_asc'))).toBe(true);
    expect(urls.some(u => u.includes('time_filter=past') && u.includes('order_by=start_desc'))).toBe(true);
    expect(urls.some(u => u.includes('time_filter=all'))).toBe(false);
  });

  it('follows pagination continuations so events past page 1 are kept', async () => {
    const page2Event = { ...rawEvent, id: 'page2' };
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (!url.includes('time_filter=current_future')) return okPage([]);
      if (url.includes('continuation=tok-1')) return okPage([page2Event]);
      return okPage([rawEvent], { has_more_items: true, continuation: 'tok-1' });
    });

    const { upcoming } = await fetchEventsAtBuildTime();
    expect(upcoming.map(e => e.id)).toEqual(['123', 'page2']);
  });

  it('re-classifies an in-progress event returned by the past query as upcoming', async () => {
    // Eventbrite buckets by its own current/past rule; the site's rule is
    // "not yet ended". An event that already started but has a future end
    // must land in upcoming, and appearing in both queries must not dupe it.
    const inProgress = {
      ...rawEvent,
      id: 'live-now',
      start: { local: '2020-01-01T10:00:00', utc: '2020-01-01T14:00:00Z' },
      end: { local: '2099-01-01T12:00:00', utc: '2099-01-01T16:00:00Z' },
    };
    mockEventbrite({ current_future: [inProgress], past: [inProgress] });

    const { upcoming, past } = await fetchEventsAtBuildTime();
    expect(upcoming.map(e => e.id)).toEqual(['live-now']);
    expect(past).toEqual([]);
  });

  it('orders upcoming soonest-first and past newest-first', async () => {
    const at = (id: string, startUtc: string, endUtc: string) => ({
      ...rawEvent,
      id,
      start: { local: null, utc: startUtc },
      end: { local: null, utc: endUtc },
    });
    mockEventbrite({
      current_future: [at('far', '2099-06-01T14:00:00Z', '2099-06-01T16:00:00Z'), at('soon', '2098-06-01T14:00:00Z', '2098-06-01T16:00:00Z')],
      past: [at('old', '2019-06-01T14:00:00Z', '2019-06-01T16:00:00Z'), at('recent', '2024-06-01T14:00:00Z', '2024-06-01T16:00:00Z')],
    });

    const { upcoming, past } = await fetchEventsAtBuildTime();
    expect(upcoming.map(e => e.id)).toEqual(['soon', 'far']);
    expect(past.map(e => e.id)).toEqual(['recent', 'old']);
  });

  it('returns empty arrays and warns when env vars are missing', async () => {
    vi.unstubAllEnvs();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await fetchEventsAtBuildTime();
    expect(result).toEqual({ upcoming: [], past: [] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('EVENTBRITE_TOKEN'));
    expect(fetch).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('returns empty arrays and warns when the Eventbrite API request fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await fetchEventsAtBuildTime();
    expect(result).toEqual({ upcoming: [], past: [] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('401'));

    warnSpy.mockRestore();
  });

  it('still returns upcoming events when only the past query fails', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes('time_filter=current_future')) return okPage([rawEvent]);
      return { ok: false, status: 500, statusText: 'Internal Server Error' } as Response;
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { upcoming, past } = await fetchEventsAtBuildTime();
    expect(upcoming.map(e => e.id)).toEqual(['123']);
    expect(past).toEqual([]);

    warnSpy.mockRestore();
  });
});
