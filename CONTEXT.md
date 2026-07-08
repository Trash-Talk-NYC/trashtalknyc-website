# Trash Talk NYC — Domain Glossary

## Lang
`'en' | 'es'` — the two supported language codes. A closed set; not an arbitrary string. Defaults to `'en'` for first-time visitors. Persisted in localStorage across sessions.

## EventData
Defined in `src/lib/events.ts`. The typed shape of a single event, flattened from Eventbrite's raw API response. The canonical type for passing event information between modules and components. Fetched at build time by `fetchEventsAtBuildTime()` in `src/lib/events.ts`, which calls the Eventbrite API directly.

## EventCardProps
The data shape a card component needs to render an event. Derived from `EventData` by `src/lib/events.ts`. Consumed by both `EventCard.astro` (list) and `HeroEventCard.astro` (hero).

## CountdownParts
Defined in `src/lib/countdown.ts`. `{ days: number, hours: number, minutes: number, seconds: number }` — the raw numeric parts of a countdown to an event. Display formatting (padding, labels) is the caller's responsibility. Produced by `createCountdown(isoStr, onTick)`, which returns a cleanup function to stop the interval.

## GuardedSite
Defined in `src/lib/clean-zone.ts`. The typed shape of one tree bed block the tree guard initiative has renovated ("guarded") — address, borough/neighborhood, lat/lng, bilingual display date and description, and an optional `nycTreeIds` cross-reference into NYC Parks' Forestry Tree Points dataset (display-only, never required). Trash Talk NYC's own curated list (`guardedSites`), not a city import; rendered on `/clean-zone` by `CleanZoneMap.astro` (Leaflet map) and the page's field-log cards.
