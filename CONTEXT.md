# Trash Talk NYC — Domain Glossary

## Lang
`'en' | 'es'` — the two supported language codes. A closed set; not an arbitrary string. Defaults to `'en'` for first-time visitors. Persisted in localStorage across sessions.

## EventData
Defined in `src/lib/events.ts`. The typed shape of a single event, flattened from Eventbrite's raw API response. The canonical type for passing event information between modules and components. Fetched at build time by `fetchEventsAtBuildTime()` in `src/lib/events.ts`, which calls the Eventbrite API directly.

## EventCardProps
The data shape a card component needs to render an event. Derived from `EventData` by `src/lib/events.ts`. Consumed by both `EventCard.astro` (list) and `HeroEventCard.astro` (hero).

## CountdownParts
Defined in `src/lib/countdown.ts`. `{ days: number, hours: number, minutes: number, seconds: number }` — the raw numeric parts of a countdown to an event. Display formatting (padding, labels) is the caller's responsibility. Produced by `createCountdown(isoStr, onTick)`, which returns a cleanup function to stop the interval.

## HeaderVisibility
Defined in `src/lib/headerScroll.ts`. The pure state machine behind the mobile hide-on-scroll header: `createHeaderVisibility({ threshold, topZone, startY })` returns `{ update(rawY, maxY) }`, which takes a raw scroll position (clamped to `[0, maxY]` so iOS rubber-band overscroll produces no phantom direction changes) and returns whether the header should be hidden. DOM concerns — class toggling, the open-menu and desktop-width guards, breakpoint changes — belong to `NavBar.astro`, not this module.
