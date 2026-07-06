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
- About
- Contact

## Events

Platform:
- Eventbrite

Current behavior:
- Netlify function fetches next upcoming event
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
Each action validates with zod, runs spam heuristics (honeypot + timing + content patterns), rate limits per IP via Netlify Blobs, and upserts the submitter as a Brevo contact with a raw `fetch()` call (no Brevo SDK).
Web3Forms and `netlify/functions/submit-form.mjs` were retired in the 2026-07 redesign.

Volunteer form:
- Home page `#signup` → Brevo list `signups_list` (`BREVO_LIST_ID_SIGNUP`)
- Message-style fields land as Brevo contact attributes (BOROUGH, PHONE, EXPERIENCE, HEAR_ABOUT) — these attributes must exist in Brevo before go-live

Contact form:
- Single page (`/contact`), tabbed: General / Collaborate → Brevo list via `BREVO_LIST_ID_CONTACT`
- Tab choice is sent as `inquiryType` (`general` | `partnership`); partnership requires `organization`
- Message text is stored as a Brevo contact attribute (MESSAGE) — nothing emails the team directly anymore; a transactional-email notification is a known follow-up
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

Current contact form recipients:
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
- No CRM

## Known priorities

High:
- Better email organization
- Test fixture standards

Shipped:
- Contact form redesign / partnership intake flow (single form, tabbed General/Partnerships, shared Web3Forms key)

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
- Production dependency verification: confirm external systems behave correctly (Web3Forms, Eventbrite, Google Workspace, Netlify Forms, etc.).
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
