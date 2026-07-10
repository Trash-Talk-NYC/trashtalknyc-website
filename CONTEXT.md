# Trash Talk NYC — Domain Glossary

## Lang
`'en' | 'es'` — the two supported language codes. A closed set; not an arbitrary string. Defaults to `'en'` for first-time visitors. Persisted in localStorage across sessions.

## EventData
Defined in `src/lib/events.ts`. The typed shape of a single event, flattened from Eventbrite's raw API response. The canonical type for passing event information between modules and components. Fetched at build time by `fetchEventsAtBuildTime()` in `src/lib/events.ts`, which calls the Eventbrite API directly.

## EventCardProps
The data shape a card component needs to render an event. Derived from `EventData` by `src/lib/events.ts`. Consumed by both `EventCard.astro` (list) and `HeroEventCard.astro` (hero).

## CountdownParts
Defined in `src/lib/countdown.ts`. `{ days: number, hours: number, minutes: number, seconds: number }` — the raw numeric parts of a countdown to an event. Display formatting (padding, labels) is the caller's responsibility. Produced by `createCountdown(isoStr, onTick)`, which returns a cleanup function to stop the interval.

## DonationTotal
`number | null` — the GoFundMe campaign's raised total in whole US dollars, or `null` meaning "unavailable right now" so callers degrade instead of failing. Produced by `fetchDonationTotal()` in `src/lib/server/gofundme.ts` (server-only: GoFundMe's gateway sends no CORS header, so browsers can never fetch it directly). Consumed at build time by the wallet page frontmatter and at runtime by the on-demand `/api/donation-total.json` route, which hands it to the page's client script as `{ amountRaised }`.
