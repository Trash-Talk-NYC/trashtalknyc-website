# Trash Talk NYC — Domain Glossary

## Lang
`'en' | 'es'` — the two supported language codes. A closed set; not an arbitrary string. Defaults to `'en'` for first-time visitors. Persisted in localStorage across sessions.

## EventData
Defined in `src/lib/events.ts`. The typed shape of a single event, flattened from Eventbrite's raw API response. The canonical type for passing event information between modules and components. Fetched at build time by `fetchEventsAtBuildTime()` in `src/lib/events.ts`, which calls the Eventbrite API directly.

## EventCardProps
The data shape a card component needs to render an event. Derived from `EventData` by `src/lib/events.ts`. Consumed by both `EventCard.astro` (list) and `BoroughEventCard.astro` (hero).

## BoroughId
`'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten-island'` — the five NYC boroughs as a closed set, defined in `src/lib/events.ts`. Display names (EN/ES, standalone and mid-sentence forms) live in the `BOROUGHS` metadata list. Resolved from an event's venue by `getBorough()`, which returns `null` for non-NYC venues; `null`-borough events skip the hero but stay in the full list.

## CountdownParts
Defined in `src/lib/countdown.ts`. `{ days: number, hours: number, minutes: number, seconds: number }` — the raw numeric parts of a countdown to an event. Display formatting (padding, labels) is the caller's responsibility. Produced by `createCountdown(isoStr, onTick)`, which returns a cleanup function to stop the interval.
