import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEvents, formatDate, formatTime, getMapUrls } from '../events';
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
