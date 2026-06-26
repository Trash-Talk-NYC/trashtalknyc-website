# Trash Talk NYC — Domain Glossary

## Lang
`'en' | 'es'` — the two supported language codes. A closed set; not an arbitrary string. Defaults to `'en'` for first-time visitors. Persisted in localStorage across sessions.

## EventData
Defined in `src/lib/events.ts`. The typed shape of a single event as returned by the Netlify function (`netlify/functions/next-event.mjs`). The canonical type for passing event information between modules and components. Use `fetchEvents()` from `src/lib/events.ts` to fetch it.

## EventCardProps
The data shape a card component needs to render an event. Derived from `EventData` by `src/lib/events.ts`. Consumed by both `EventCard.astro` (list) and `HeroEventCard.astro` (hero).

## CountdownParts
Defined in `src/lib/countdown.ts`. `{ days: number, hours: number, minutes: number, seconds: number }` — the raw numeric parts of a countdown to an event. Display formatting (padding, labels) is the caller's responsibility. Produced by `createCountdown(isoStr, onTick)`, which returns a cleanup function to stop the interval.
