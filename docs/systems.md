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
- 404 -> (Not Found; prerendered pure-CSS 3D street scene, bilingual, links to Home and Events)

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

Both forms submit through Astro Actions (`src/actions/index.ts`) running as an on-demand Netlify function via `@astrojs/netlify`.
Each action validates with zod, runs spam heuristics (honeypot + timing + content patterns), rate limits per IP via Netlify Blobs, verifies a Cloudflare Turnstile token server-side (`src/lib/server/turnstile.ts`), and upserts the submitter as a Brevo contact with a raw `fetch()` call (no Brevo SDK).
Web3Forms and `netlify/functions/submit-form.mjs` were retired in the 2026-07 redesign.

Turnstile (bot check, added 2026-07 after the security-scale audit flagged bot list-pollution):
- Widget renders on both forms only when `PUBLIC_TURNSTILE_SITE_KEY` is set at build time; the token lands as the `cf-turnstile-response` form field.
- The actions enforce verification only when that site key is set at runtime, so the feature is dormant until the keys are provisioned (logged as `turnstile_not_configured` on every submission meanwhile).
- Once the site key is set, a missing `TURNSTILE_SECRET_KEY` fails closed (`form_env_missing`), and any verification failure rejects with the same generic message as other validation failures (`form_turnstile_rejected` in logs).
- Turnstile sits alongside the honeypot/timing heuristics, not instead of them; setting the keys in Netlify requires a redeploy because the site key bakes into the prerendered pages.

Volunteer form:
- Home page `#signup` → Brevo list `signups_list` (`BREVO_LIST_ID_SIGNUP`)
- Fields land as Brevo contact attributes (BOROUGH, PHONE, MESSAGE, HEAR_ABOUT_US, WAIVER_ACCEPTED); HEAR_ABOUT_US values must match the Brevo enum exactly (the select's value attributes do). WAIVER_ACCEPTED reflects server-validated checkbox state — both the waiver and age checkboxes are required and zod-validated (`'on'` literal), not assumed just because the handler was reached. EXPERIENCE is dormant — historical only

Contact form:
- Single page (`/contact`), tabbed: General / Collaborate → separate Brevo lists per tab (`CONTACT_GENERAL` / `CONTACT_COLLAB`; short names because Netlify rejected the longer `BREVO_LIST_ID_`-prefixed ones)
- Tab choice is sent as `inquiryType` (`general` | `partnership`); partnership requires `organization`
- Fields land as Brevo contact attributes (FIRSTNAME, LASTNAME, EMAIL, PHONE (optional), INQUIRY_TYPE, ORGANIZATION, MESSAGE)
- Message text is stored as a Brevo contact attribute (MESSAGE, latest value only) AND as a Brevo CRM note per submission (full history, header form=…|field=…|submitted=…); nothing emails the team directly anymore; a transactional-email notification is a known follow-up
- "Host an Event" as a third inquiry type was considered and deferred — not built

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
- Cloudflare Turnstile bot check on both forms (security audit X1); dormant until the captain provisions real keys — see Forms above
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
