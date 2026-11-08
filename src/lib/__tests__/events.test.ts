import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEventsAtBuildTime, formatDate, formatTime, getMapUrls, groupPastByBorough, assignPastCovers, mapEventbriteEvent, flyerHeadline, flyerKind, flyerWhen, newestGroupIndex, sampleEvents, toEventCardProps, boroughPreviewCovers } from '../events';
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

  it('keeps the venue ZIP and the original cover image', async () => {
    mockEventbrite({
      current_future: [
        {
          ...rawEvent,
          venue: { ...rawEvent.venue, address: { ...rawEvent.venue.address, postal_code: '11215' } },
          logo: { url: 'https://img.evbuc.com/cropped.jpg', original: { url: 'https://img.evbuc.com/original.jpg' } },
        },
      ],
    });

    const { upcoming } = await fetchEventsAtBuildTime();
    expect(upcoming[0].venue?.postalCode).toBe('11215');
    expect(upcoming[0].imageUrl).toBe('https://img.evbuc.com/original.jpg');
  });

  it('has no image when Eventbrite has none', async () => {
    mockEventbrite({ current_future: [rawEvent] });

    const { upcoming } = await fetchEventsAtBuildTime();
    expect(upcoming[0].imageUrl).toBeNull();
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

// ── groupPastByBorough ──────────────────────────────────────────────────────

describe('groupPastByBorough', () => {
  const at = (id: string, zip: string | null) =>
    mapEventbriteEvent({
      id,
      name: { text: id },
      url: `https://eventbrite.com/e/${id}`,
      status: 'completed',
      start: { local: null, utc: '2026-09-01T14:00:00Z' },
      end: { local: null, utc: '2026-09-01T16:00:00Z' },
      venue: zip === null ? null : { name: 'Park', address: { postal_code: zip } },
    });

  it('groups by the venue ZIP, in borough order, outside-NYC last', () => {
    const groups = groupPastByBorough([
      at('qns', '11104'),
      at('nj', '07030'),
      at('mn1', '10032'),
      at('bk', '11211'),
      at('none', null),
      at('mn2', '10002'),
    ]);
    expect(groups.map((g) => g.borough)).toEqual(['Manhattan', 'Brooklyn', 'Queens', null]);
    expect(groups[0].events.map((e) => e.id)).toEqual(['mn1', 'mn2']);
    expect(groups[3].events.map((e) => e.id)).toEqual(['nj', 'none']);
  });

  it('reads a ZIP+4 by its first five digits', () => {
    expect(groupPastByBorough([at('bx', '10451-1234')])[0].borough).toBe('The Bronx');
  });

  it('returns no groups for no events', () => {
    expect(groupPastByBorough([])).toEqual([]);
  });
});

// ── assignPastCovers ────────────────────────────────────────────────────────

describe('assignPastCovers', () => {
  const ev = (id: string, imageUrl: string | null) => ({ id, imageUrl }) as EventData;
  const groups = [
    { borough: 'Manhattan' as const, events: [ev('a', 'shared.jpg'), ev('b', 'shared.jpg'), ev('c', 'own.jpg')] },
    { borough: 'Brooklyn' as const, events: [ev('d', 'shared.jpg'), ev('e', null)] },
  ];

  it('keeps the first use of each cover and gives repeats and coverless events the next stand-in', () => {
    const covers = assignPastCovers(groups, ['p1', 'p2', 'p3']);
    expect(covers.get('a')).toEqual({ kind: 'eventbrite', url: 'shared.jpg' });
    expect(covers.get('b')).toEqual({ kind: 'photo', photo: 'p1' });
    expect(covers.get('c')).toEqual({ kind: 'eventbrite', url: 'own.jpg' });
    expect(covers.get('d')).toEqual({ kind: 'photo', photo: 'p2' });
    expect(covers.get('e')).toEqual({ kind: 'photo', photo: 'p3' });
  });

  it('falls back to the repeated cover, or none, once the stand-ins run out', () => {
    const covers = assignPastCovers(groups, ['p1']);
    expect(covers.get('d')).toEqual({ kind: 'eventbrite', url: 'shared.jpg' });
    expect(covers.get('e')).toEqual({ kind: 'none' });
  });
});

// ── flyer card (round 10) ───────────────────────────────────────────────────

describe('flyer card helpers', () => {
  it('builds the headline from the borough, planting events included', () => {
    expect(flyerHeadline('Inwood sweep', 'Manhattan')).toEqual({ en: 'Manhattan Cleanup', es: 'Limpieza en Manhattan' });
    expect(flyerHeadline('Sunnyside tree planting', 'Queens').en).toBe('Queens Clean & Plant');
    expect(flyerHeadline('Grand Concourse', 'The Bronx')).toEqual({ en: 'Bronx Cleanup', es: 'Limpieza en el Bronx' });
  });

  it('falls back to the event name outside the boroughs', () => {
    expect(flyerHeadline('Hoboken pier day', null)).toEqual({ en: 'Hoboken pier day', es: 'Hoboken pier day' });
  });

  it('picks the glove for planting events', () => {
    expect(flyerKind('Clean & Plant')).toBe('planting');
    expect(flyerKind('Cleanup')).toBe('cleanup');
  });

  it('drops the minutes on the hour, keeps them otherwise', () => {
    expect(flyerWhen('2026-10-18T10:00:00', 'en')).toEqual({ date: 'October 18', time: 'at 10 AM' });
    expect(flyerWhen('2026-10-18T10:30:00', 'en').time).toBe('at 10:30 AM');
    expect(flyerWhen('2026-10-18T13:00:00', 'es').time.startsWith('a la ')).toBe(true);
  });

  it('places a real event by its venue ZIP and lists name then address', () => {
    const props = toEventCardProps({
      id: '1', name: 'Saturday sweep', url: 'u', status: 'live',
      start: { local: '2026-11-01T10:00:00', utc: '2026-11-01T14:00:00Z' },
      end: { local: '2026-11-01T12:00:00', utc: '2026-11-01T16:00:00Z' },
      venue: { name: 'Inwood Hill Park', address: 'Isham St, New York, NY 10034', city: 'New York', postalCode: '10034', lat: null, lng: null },
      imageUrl: null,
    });
    expect(props.headline.en).toBe('Manhattan Cleanup');
    expect(props.venueLines).toEqual(['Inwood Hill Park', 'Isham St, New York, NY 10034']);
    expect(props.sample).toBeUndefined();
  });

  it('marks every sample flyer as a sample', () => {
    expect(sampleEvents.length).toBeGreaterThan(0);
    expect(sampleEvents.every((e) => e.sample === true)).toBe(true);
  });

  it('opens the borough holding the most recent past event', () => {
    const a = { id: 'a' } as EventData;
    const b = { id: 'b' } as EventData;
    const groups = [{ borough: 'Bronx' as const, events: [b] }, { borough: 'Queens' as const, events: [a] }];
    expect(newestGroupIndex(groups as never, a)).toBe(1);
    expect(newestGroupIndex(groups as never, undefined)).toBe(-1);
  });
});

describe('boroughPreviewCovers', () => {
  const ev = (id: string, imageUrl: string | null) => ({ id, imageUrl }) as EventData;
  it('takes each cover once, skips photo-less events, and caps the strip', () => {
    const group = { borough: 'Queens' as const, events: [ev('1', 'a'), ev('2', null), ev('3', 'a'), ev('4', 'b'), ev('5', 'c')] };
    expect(boroughPreviewCovers(group, 4)).toEqual(['a', 'b', 'c']);
    expect(boroughPreviewCovers(group, 2)).toEqual(['a', 'b']);
  });
});
