# Systems

This is the source of truth for all Trash Talk NYC systems.

If information is missing, add it here before building new features.

## Organization

Trash Talk NYC

Current operators:
- Fabiola
- David
- Nandi

## Website

Stack:
- Astro
- Netlify

Pages:
- Home
- Events -> (Club Events)
- About -> (The Team; From the Founder -> `/about/from-the-founder`, a first-person account of how Trash Talk NYC started, English verbatim, attributed to David via a photo byline card and the meta description composed in `src/lib/founder.ts` (captain confirmed 2026-08-13), closing with his "Sincerely, David" sign-off — see AGENTS.md, "From the Founder")
- Open Roles -> (`/recruit`; a top-level route listed under About in the nav; recruitment page, email-only intake — see AGENTS.md, "Open Roles")
- Contact
- 404 -> (Not Found; prerendered dead-end block — the split brick frame, a yellow "Dead End" sign beside the trash can illustration — bilingual, links to Home and Events)

SEO & share metadata (2026-07 overhaul):
- `src/layouts/BaseLayout.astro` owns the head: per-page title + required description feed the meta description, canonical URL, and full Open Graph/Twitter tags; the homepage adds JSON-LD Organization schema via `slot="head"`
- Crawl hygiene: `@astrojs/sitemap` (404 filtered out) + `public/robots.txt`; 404 carries noindex
- Icon/share assets in `public/` (favicon set, apple-touch-icon, og-image, logo) are generated from the hero logo by `node scripts/generate-icons.mjs` — regenerate, never hand-edit or swap in other logo variants
- Conventions and sharp edges (bare-brand homepage title, English-only meta descriptions, the deliberate `public/` exception) are documented in AGENTS.md ("SEO & share metadata")

## Events

Platform:
- Eventbrite

Current behavior:
- Build-time fetch (`fetchEventsAtBuildTime()` in `src/lib/events.ts`) pulls upcoming/past events directly from Eventbrite
- Events page consumes Eventbrite data

## Donations

Platform:
- GoFundMe
- BuyMeACoffee

Current behavior:
- GoFundMe embedded in site
- BuyMeACoffee linked on Instagram

## Forms

The forms submit through Astro Actions (`src/actions/index.ts` — `signup`, `contact`, and since the 2026-10 redesign `leadCleanup`) running as an on-demand Netlify function via `@astrojs/netlify`.
Each action validates with zod, runs spam heuristics (honeypot + timing + content patterns), rate limits per IP via Netlify Blobs, verifies a Cloudflare Turnstile token server-side (`src/lib/server/turnstile.ts`), and upserts the submitter as a Brevo contact with a raw `fetch()` call (no Brevo SDK).
Phone numbers are validated with `libphonenumber-js` on both client and server (10-digit US, or international with a + country code).
Web3Forms and `netlify/functions/submit-form.mjs` were retired in the 2026-07 redesign.

Turnstile (bot check, added 2026-07 after the security-scale audit flagged bot list-pollution):
- Widget renders on all three forms (signup, contact, Lead a Cleanup) only when `PUBLIC_TURNSTILE_SITE_KEY` is set at build time; the token lands as the `cf-turnstile-response` form field.
- The actions enforce verification only when that site key is set at runtime; production has one, so verification runs there, and any context without a site key skips it (logged as `turnstile_not_configured` on every submission).
- Once the site key is set, a missing `TURNSTILE_SECRET_KEY` fails closed (`form_env_missing`), and any verification failure rejects with the same generic message as other validation failures (`form_turnstile_rejected` in logs).
- Turnstile sits alongside the honeypot/timing heuristics, not instead of them; setting the keys in Netlify requires a redeploy because the site key bakes into the prerendered pages.

Volunteer form (newsletter):
- Home page `#signup` → Brevo list `signups_list` (`BREVO_LIST_ID_SIGNUP`)
- Fields land as Brevo contact attributes (COUNTRY, STATE_REGION, CITY, ZIP_CODE, BOROUGH, PHONE, MESSAGE, HEAR_ABOUT_US, HEAR_ABOUT_US_OTHER, WAIVER_ACCEPTED); HEAR_ABOUT_US values must match the Brevo enum exactly (the select's value attributes do). WAIVER_ACCEPTED reflects server-validated checkbox state — both the waiver and age checkboxes are required and zod-validated (`'on'` literal), not assumed just because the handler was reached. EXPERIENCE is dormant — historical only
- How-did-you-hear is required (captain, 2026-10) and the choices include "Article" and "Somewhere else"; "Somewhere else" reveals an optional free-text "Where was that?" box that lands in HEAR_ABOUT_US_OTHER. Until the two new options and the HEAR_ABOUT_US_OTHER text attribute exist in the Brevo dashboard, Brevo rejects payloads carrying them — the action retries the upsert without them and preserves the answer as a CRM note (`field=hear`), so no signup is lost to dashboard lag (`brevo_hear_attrs_rejected` in logs)
- Location is country first (captain, 2026-10-09; no borough question). United States (the default): a 5-digit ZIP, previewed on the page as "City, ST · Borough: …" and re-looked-up by the action (zippopotam.us, free/keyless) to send CITY and STATE_REGION; an NYC ZIP also sends BOROUGH (Manhattan / Brooklyn / Queens / The Bronx / Staten Island) from the ZIP-range table in `src/lib/zip.ts`. A ZIP that doesn't exist is refused; a lookup outage still lands the signup with COUNTRY, ZIP_CODE, and (for NYC) BOROUGH. Other countries: City picked from a list (Open-Meteo geocoding), optional State / province / region → STATE_REGION, optional postal code in any format → ZIP_CODE

Contact page (`/contact`, 2026-10 layout):
- Four poster tiles in the captain's order — Lead a Cleanup / Collaborate / Sponsor / General — and no form shows until a tile is picked
- Collaborate, Sponsor, and General share the message form → the `contact` action; tile choice is sent as `inquiryType` (`general` | `partnership` | `sponsor`); the org-backed tiles require `organization`; separate Brevo lists per tile (`CONTACT_GENERAL` / `CONTACT_COLLAB` / `CONTACT_SPONSOR`; short names because Netlify rejected the longer `BREVO_LIST_ID_`-prefixed ones)
- Fields land as Brevo contact attributes (FIRSTNAME, LASTNAME, EMAIL, PHONE (optional), INQUIRY_TYPE, ORGANIZATION, MESSAGE)
- Message text is stored as a Brevo contact attribute (MESSAGE, latest value only) AND as a Brevo CRM note per submission (full history, header form=…|field=…|submitted=…); the team is also notified by transactional email when the notify vars are set (see `.env.example`)

Lead a Cleanup form (the fourth tile → the `leadCleanup` action, 2026-10):
- Asks: applying on behalf of an individual or an organization; first/last name, mailing address, email, phone (all required); route type Loop or One-way with a starting address and (one-way only) an end address; preferred month (rolling, current month onward); up to 5 route photos
- Route addresses are picked from NYC Planning Labs GeoSearch suggestions client-side (keyboard-operable combobox shared with the newsletter city picker, `src/lib/combobox.ts`); the picked feature's `gid` and `lon,lat` point are submitted with its label and the action looks that exact feature up again server-side (GeoSearch's `/v2/place` rejects `nycpad` ids, so it re-runs autocomplete for the label confined to a 0.5 km circle around the point), storing its label only if the gid, label, and NYC locality all match (`src/lib/server/geosearch.ts` — fails closed in every case, including GeoSearch being unreachable, and never substitutes a different result); a rejected address comes back as a field-level error on that address field (`src/lib/addressErrors.ts` codes), which the page shows under the picker, clearing the pick unless the cause was a GeoSearch outage
- Photos are validated by content (magic bytes — SVG and non-raster rejected), re-encoded with sharp to bounded JPEGs with all metadata including GPS stripped, and stored privately in Netlify Blobs under random keys (store `lead-route-photos`, `src/lib/server/photos.ts`); the CRM note records the keys
- Routes to Brevo list `BREVO_LIST_ID_LEADS` with attributes LEAD_BEHALF, MAILING_ADDRESS, ROUTE_TYPE, ROUTE_START, ROUTE_END, PREFERRED_MONTH (+ FIRSTNAME/LASTNAME/PHONE, INQUIRY_TYPE=`lead`); the team notification email reuses the contact notification plumbing (CONTACT_NOTIFY_TO)
- "Host an Event" as a separate inquiry type was considered and deferred — Lead a Cleanup (2026-10) is the shipped descendant of that idea

## Email

Provider:
- Google Workspace

Current accounts:
- fabiola@trashtalknyc.org
- david@trashtalknyc.org
- nandi@trashtalknyc.org

Shared inboxes:
- team@trashtalknyc.org
- volunteers@ (unused)

Former contact form recipients (pre-Brevo, no longer routed automatically — see Forms above):
- fabiola@trashtalknyc.org
- david@trashtalknyc.org
- team@trashtalknyc.org

## Data

Current volunteer database:
- Brevo contact lists (form submissions upsert contacts directly; see Forms above).
- Historical signups live in the old Web3Forms-fed Google Sheet and predate Brevo.

Known pain points:
- Duplicate emails
- Manual deduplication
- No dedicated CRM/database; Brevo CRM notes now capture full per-submission history against a contact (see Forms above), but there's no querying, reporting, or workflow layer beyond Brevo's own UI

## Known priorities

High:
- Better email organization
- Test fixture standards

Shipped:
- Contact form redesign / partnership intake flow (single form, tabbed General/Collaborate)
- Signup and contact forms migrated from Netlify Function + Web3Forms to Astro Actions + Brevo (2026-07 redesign)
- Per-submission Brevo CRM note history (full history vs. the MESSAGE attribute's latest-value-only)
- Persistent, screen-reader-announced submit error (`aria-live="polite"`) on both forms, alongside the existing transient button-text swap
- Cloudflare Turnstile bot check on both forms (security audit X1); live in production — see Forms above and `AGENTS.md`, "Turnstile bot check"
- SEO & share-metadata overhaul (2026-07): complete OG/Twitter tags, favicon set + share card generated from the hero logo, JSON-LD Organization schema, sitemap + robots.txt + canonicals — see Website above

Medium:
- CRM/database
- Corporate partnerships

Low:
- Agent automation
- Daily digests

## Testing Philosophy

Every new feature must answer:

1. What behavior are we validating?
2. Is this behavior temporary or foundational?

Temporary:
- Migration checks
- Third-party integrations
- One-off fixtures

Foundational:
- Language switching
- Navigation
- Form submissions
- User retention principles
- Analytics collection

Only foundational behaviors receive permanent tests.

## Developer Experience

Visible website changes require a verification method.

Acceptable verification:

- Local URL
- Deploy preview URL
- Screenshot(s)
- Reproduction instructions

A UI task is not complete until a human can see the result.

## Product Characteristics

Trash Talk NYC is language-sensitive.

Seemingly small wording decisions are considered product decisions because they influence inclusivity, community perception, audience segmentation, and brand identity.

Subjective reactions to language are valid product inputs and should be translated into actionable design principles rather than dismissed as personal preference.

## Verification Layers

Every feature does not require every verification layer.

Claude should choose the smallest set of verification steps needed for confidence.

Possible verification layers:

- Local verification: confirm the feature works in local development.
- Deploy preview verification: confirm the feature works in a Netlify deploy preview after pushing changes.
- Production dependency verification: confirm external systems behave correctly (Brevo, Eventbrite, Google Workspace, Netlify Blobs, etc.).
- Human perception verification: ask a human to review visuals, wording, UX flow, or subjective product decisions.

For every verification layer, Claude must explain:

- why it is needed
- what evidence it provides
- whether it is required before merge, after merge, or only when the dependency is available

## Human Attention

Human involvement is valuable and should be used intentionally.

Do not create tasks simply because they could be delegated to a human.

Before assigning human work, explain:

- why the work cannot be verified automatically
- why it cannot be deferred
- what decision or evidence only a human can provide

Human review is required for subjective judgments such as:
- visual design
- wording
- brand perception
- audience fit
- final approval decisions


## Attention Allocation

Not every issue deserves equal attention.

Claude should prioritize the smallest amount of work needed to create confidence.

Do not expand checklists simply because more checks are possible.

When proposing verification, explain:

- why this deserves attention
- what risk it mitigates
- whether it is optional or required

Prefer meaningful checks over exhaustive checks.
