---
name: brevo-integration
description: Use when working with the Brevo integration on trashtalknyc-website — debugging form submissions failing in production or preview (HTTP 500, Brevo API errors), adding or editing Brevo custom attributes or multiple-choice options, changing what the signup, contact, or Lead a Cleanup forms send, reading per-submission history, changing list routing or Brevo env vars, or touching Brevo account/security settings.
---

# Brevo Integration (trashtalknyc-website)

Operational knowledge for the live Brevo integration: Astro Actions (`src/actions/index.ts`) call the Brevo Contacts API through a raw-`fetch` client (`src/lib/server/brevo.ts`), no SDK.
The one-paragraph sharp edges live in `AGENTS.md`; this skill holds the incident detail and the debugging order.
For how to exercise the forms locally, use the `e2e-testing` skill.

## Authorized IPs must stay fully OFF (2-day production outage)

Brevo's Security > Authorized IPs feature must stay fully **deactivated** — not managed as an allowlist.
Netlify Functions egress from a large, constantly-rotating pool of AWS IPs with no fixed outbound IP.
Brevo's "authorize the first request from a new IP, then add it to the list" flow means a brand-new IP fails once and is never seen again — permanent failure at scale, not intermittent flakiness.
This took down all 3 form paths in production and preview with HTTP 500 for ~2 days (2026-07-07/08); toggling the restriction fully off in the Brevo dashboard resolved all 3 immediately.

**Debugging order when Brevo calls start failing** with timing that suggests a real Brevo roundtrip (not a local/validation error):

1. Check Brevo Security > Authorized IPs is still fully off — an account security flow can re-enable it accidentally and reproduce this exact failure mode.
2. Check Netlify function logs: `netlify logs --source functions --function ssr`.
3. Only then chase attribute or code theories.

## Lists and env vars

| List ID | Purpose | Env var |
|---|---|---|
| 9 | signup (`signups_list`) | `BREVO_LIST_ID_SIGNUP` |
| 10 | general contact | `CONTACT_GENERAL` |
| 11 | collab/partnership contact | `CONTACT_COLLAB` |
| 13 | sponsor contact | `CONTACT_SPONSOR` (documented as 13 in `.env.example`; must also be set in Netlify all deploy contexts — if missing, sponsor submissions fail loudly with `form_env_missing`) |
| — | Lead a Cleanup applications (2026-10) | `BREVO_LIST_ID_LEADS` (the list must be created in Brevo and the var set per context; ID not yet recorded here — same loud `form_env_missing` failure when missing) |

The `CONTACT_*` env var names are short because Netlify rejected the longer `BREVO_LIST_ID_`-prefixed ones — keep as-is.
Do not assume the vars match across Netlify deploy contexts: a 2026-08 validation found `deploy-preview` missing the list IDs, the Turnstile secret and both notify addresses while production was complete (the earlier "identical across all contexts, verified 2026-07" claim was false; firstmate has since copied them across).
Verify per context when debugging — `form_env_missing` in the function logs is the tell.

## Custom attribute map

Every custom attribute must already exist in the Brevo dashboard or the upsert payload is rejected.
Empty-string fields are dropped before upsert (`buildAttributes`) so updates never blank existing values.
`EXPERIENCE` is dormant — kept in Brevo for historical contacts, no longer written.
`PHONE` is a custom text attribute, not Brevo's native SMS/phone field, so it (and `ORGANIZATION`) can look "missing" in the Brevo list view while being present — check the contact's attribute panel or the API, not the list view.

| Attribute | Signup sends | Contact sends | Lead a Cleanup sends |
|---|---|---|---|
| `FIRSTNAME` / `LASTNAME` | ✓ | ✓ | ✓ |
| `PHONE` | ✓ | ✓ (optional) | ✓ (required) |
| `COUNTRY` | ✓ always (country-first location, 2026-10-09) | — | — |
| `CITY` / `STATE_REGION` / `ZIP_CODE` | ✓ US: ZIP typed, city + full state name from the server's ZIP re-lookup; elsewhere: picked city, optional region, optional free-format postal code | — | — |
| `BOROUGH` | ✓ only for NYC ZIPs (from the ZIP-range table in `src/lib/zip.ts`, never the lookup service) | — | — |
| `MESSAGE` | ✓ (experience text) | ✓ (message text) | — |
| `HEAR_ABOUT_US` | ✓ required (values must match the Brevo enum exactly; "Article" and "Somewhere else" are pending dashboard options — the action retries the upsert without the hear attributes when Brevo rejects them and notes the answer instead, `brevo_hear_attrs_rejected`) | — | — |
| `HEAR_ABOUT_US_OTHER` | ✓ free text behind "Somewhere else" (pending dashboard creation, same fallback) | — | — |
| `WAIVER_ACCEPTED` | ✓ (`'true'` only when both waiver and age checkboxes validated) | — | — |
| `INQUIRY_TYPE` | — | ✓ (`general` \| `partnership` \| `sponsor`; plain text attribute — verified via the attributes API 2026-08, so new values need no dashboard work) | ✓ (`lead`) |
| `ORGANIZATION` | — | ✓ (partnership + sponsor tabs, required there) | — |
| `LEAD_BEHALF`, `MAILING_ADDRESS`, `ROUTE_TYPE`, `ROUTE_START`, `ROUTE_END`, `PREFERRED_MONTH` | — | — | ✓ (`ROUTE_END` one-way only; route labels are the GeoSearch-verified ones) |

The 2026-10 attributes (`COUNTRY`, `CITY`, `ZIP_CODE`, and the lead set) must be created in the Brevo dashboard before those flows can land.

## Submission history: CRM notes, because attributes are last-write-wins

Attributes only keep the latest value, so each submission's free-text field is also attached to the contact as a Brevo CRM note with a queryable header:
`form=<signup|contact-general|contact-collab|contact-sponsor|contact-lead> | field=message | submitted=<ISO>` then `—` then the raw content (`buildNoteText` in `src/lib/server/brevo.ts`).
The `contact-lead` note carries the full application, including the private Blobs keys of any route photos (store `lead-route-photos`).
Note creation is best-effort and never fails the submission (`tryCreateNote` — the upsert already succeeded); failures only log `brevo_note_failed` (plus `lead_photo_keys_unrecorded` with the keys when a lead note with photos fails, so they stay findable).

## Editing attribute options: use the dashboard, not the API

Brevo's "update contact attribute" API (adding options to an existing multiple-choice attribute like `HEAR_ABOUT_US`) is unreliable once the attribute has real contact data.
It fails with a generic `"cannot update options as provided key/label already exists"` error regardless of payload — full replace, delta-only, and a single brand-new nonsense value all failed identically (2026-07-07).
Don't retry with different payloads; edit the options directly in the Brevo dashboard instead (Contacts > Settings > Contact attributes).

## Form-path facts

All three forms (`signup`, `contact`, `leadCleanup`) submit through Astro Actions running as an on-demand Netlify function: zod validation → spam heuristics (honeypot + timing + content patterns) → per-IP Netlify Blobs rate limiting → Cloudflare Turnstile verification (`src/lib/server/turnstile.ts`, live in production — see `AGENTS.md`) → Brevo upsert.
Web3Forms and `netlify/functions/submit-form.mjs` were retired in the 2026-07 redesign — any doc still referencing a Web3Forms key is stale.
Contact-page submissions (every tile, Lead a Cleanup included) also email the team a transactional notification once `CONTACT_NOTIFY_FROM` and the recipient var are set — `CONTACT_NOTIFY_TO`, or `SPONSOR_NOTIFY_TO` for the sponsor tile with no fallback between them (`tryNotifyInquiry` in `src/actions/index.ts`; see `.env.example`); unset means `inquiry_notify_skipped`, never a misroute. Signups send no notification.
