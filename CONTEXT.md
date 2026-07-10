# Trash Talk NYC — Domain Glossary

## Lang
`'en' | 'es'` — the two supported language codes. A closed set; not an arbitrary string. Defaults to `'en'` for first-time visitors. Persisted in localStorage across sessions.

## EventData
Defined in `src/lib/events.ts`. The typed shape of a single event, flattened from Eventbrite's raw API response. The canonical type for passing event information between modules and components. Fetched at build time by `fetchEventsAtBuildTime()` in `src/lib/events.ts`, which calls the Eventbrite API directly.

## EventCardProps
The data shape a card component needs to render an event. Derived from `EventData` by `src/lib/events.ts`. Consumed by both `EventCard.astro` (list) and `HeroEventCard.astro` (hero).

## CountdownParts
Defined in `src/lib/countdown.ts`. `{ days: number, hours: number, minutes: number, seconds: number }` — the raw numeric parts of a countdown to an event. Display formatting (padding, labels) is the caller's responsibility. Produced by `createCountdown(isoStr, onTick)`, which returns a cleanup function to stop the interval.

## CleanZone
Defined in `src/lib/clean-zone.ts`.
A named zone of the Clean Zone: a cluster of nearby tree beds the tree guard initiative has renovated ("guarded") — stable id, bilingual name/date/description, neighborhood/borough, an optional hand-traced `outline`, and its member `beds` (`TreeBed[]`).
Trash Talk NYC's own curated list (`cleanZones`), not a city import; growing it is a data-only append (a bed into an existing zone's `beds`, or a whole new zone).
Rendered on `/clean-zone` by `CleanZoneMap.astro` (Leaflet map), where the zone's shaded area is the primary visual — a circle computed from its beds (`zoneCircle`: centroid + spread, block-scale minimum) unless an `outline` is provided — and by the page's zone log cards, which focus the map via the `clean-zone:focus` CustomEvent.

## TreeBed
Defined in `src/lib/clean-zone.ts`.
One renovated tree bed inside a `CleanZone` — stable id, street address (same in EN/ES), lat/lng, and an optional `nycTreeIds` cross-reference into NYC Parks' Forestry Tree Points dataset (display-only, never required).
Drawn as a small secondary dot inside its zone's shading, detailed on demand by a language-neutral mini popup.
