import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEvents, fetchEventsAtBuildTime, formatDate, formatTime, getMapUrls } from '../events';
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

// ── fetchEvents ─────────────────────────────────────────────────────────────

describe('fetchEvents', () => {
  const mockEvent: EventData = {
    id: '123',
    name: 'Test Cleanup',
    url: 'https://eventbrite.com/e/123',
    status: 'live',
    start: { local: '2025-06-28T10:00:00', utc: '2025-06-28T14:00:00Z' },
    end: { local: '2025-06-28T12:00:00', utc: '2025-06-28T16:00:00Z' },
    venue: { name: 'Central Park', address: 'Central Park, New York', city: 'New York', lat: 40.7851, lng: -73.9683 },
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the next event as a single-item array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEvent,
    } as Response);

    const result = await fetchEvents();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('123');
  });

  it('returns empty array when next event is null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    } as Response);

    const result = await fetchEvents();
    expect(result).toHaveLength(0);
  });

  it('returns upcoming and past events combined when all=true', async () => {
    const pastEvent = { ...mockEvent, id: '456', name: 'Past Event' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ upcoming: [mockEvent], past: [pastEvent] }),
    } as Response);

    const result = await fetchEvents(true);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toContain('123');
    expect(result.map((e) => e.id)).toContain('456');
  });

  it('calls the all-events URL when all=true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ upcoming: [], past: [] }),
    } as Response);

    await fetchEvents(true);
    expect(fetch).toHaveBeenCalledWith('/.netlify/functions/next-event?all=true');
  });

  it('calls the next-event URL when all is omitted', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    } as Response);

    await fetchEvents();
    expect(fetch).toHaveBeenCalledWith('/.netlify/functions/next-event');
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchEvents()).rejects.toThrow('fetch failed: 500');
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

  it('flattens Eventbrite\'s nested name and venue shape into EventData', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [rawEvent] }),
    } as Response);

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
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [rawEvent] }),
    } as Response);

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
      end: { local: '2020-01-01T12:00:00', utc: '2020-01-01T16:00:00Z' },
    };
    const draftEvent = { ...rawEvent, id: '789', status: 'draft' };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [rawEvent, pastEvent, draftEvent] }),
    } as Response);

    const { upcoming, past } = await fetchEventsAtBuildTime();
    expect(upcoming.map(e => e.id)).toEqual(['123']);
    expect(past.map(e => e.id)).toEqual(['456']);
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
    vi.mocked(fetch).mockResolvedValueOnce({
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
});
