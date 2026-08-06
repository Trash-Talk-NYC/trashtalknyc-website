---
name: brevo-integration
description: Use when working with the Brevo integration on trashtalknyc-website — debugging form submissions failing in production or preview (HTTP 500, Brevo API errors), adding or editing Brevo custom attributes or multiple-choice options, changing what the signup or contact forms send, reading per-submission history, changing list routing or Brevo env vars, or touching Brevo account/security settings.
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
| _pending_ | sponsor contact (`sponsorship_list`) | `CONTACT_SPONSOR` (var read by the action but not yet set — captain must create the list and supply the numeric ID; until then sponsor submissions fail loudly with `form_env_missing`) |

The contact env var names are short because Netlify rejected the longer `BREVO_LIST_ID_`-prefixed ones — keep as-is.
`BREVO_API_KEY` plus all three list vars are set identically across all Netlify deploy contexts (verified 2026-07).

## Custom attribute map

Every custom attribute must already exist in the Brevo dashboard or the upsert payload is rejected.
Empty-string fields are dropped before upsert (`buildAttributes`) so updates never blank existing values.
`EXPERIENCE` is dormant — kept in Brevo for historical contacts, no longer written.
`PHONE` is a custom text attribute, not Brevo's native SMS/phone field, so it (and `ORGANIZATION`) can look "missing" in the Brevo list view while being present — check the contact's attribute panel or the API, not the list view.

| Attribute | Signup sends | Contact sends |
|---|---|---|
| `FIRSTNAME` / `LASTNAME` | ✓ | ✓ |
| `PHONE` | ✓ | ✓ (optional) |
| `BOROUGH` | ✓ | — |
| `MESSAGE` | ✓ (experience text) | ✓ (message text) |
| `HEAR_ABOUT_US` | ✓ (values must match the Brevo enum exactly) | — |
| `WAIVER_ACCEPTED` | ✓ (`'true'` only when both waiver and age checkboxes validated) | — |
| `INQUIRY_TYPE` | — | ✓ (`general` \| `partnership` \| `sponsor`; plain text attribute — verified via the attributes API 2026-08, so new values need no dashboard work) |
| `ORGANIZATION` | — | ✓ (partnership + sponsor tabs, required there) |

## Submission history: CRM notes, because attributes are last-write-wins

Attributes only keep the latest value, so each submission's free-text field is also attached to the contact as a Brevo CRM note with a queryable header:
`form=<signup|contact-general|contact-collab> | field=message | submitted=<ISO>` then `—` then the raw content (`buildNoteText` in `src/lib/server/brevo.ts`).
Note creation is best-effort and never fails the submission (`tryCreateNote` — the upsert already succeeded); failures only log `brevo_note_failed`.

## Editing attribute options: use the dashboard, not the API

Brevo's "update contact attribute" API (adding options to an existing multiple-choice attribute like `HEAR_ABOUT_US`) is unreliable once the attribute has real contact data.
It fails with a generic `"cannot update options as provided key/label already exists"` error regardless of payload — full replace, delta-only, and a single brand-new nonsense value all failed identically (2026-07-07).
Don't retry with different payloads; edit the options directly in the Brevo dashboard instead (Contacts > Settings > Contact attributes).

## Form-path facts

Both forms submit through Astro Actions running as an on-demand Netlify function: zod validation → spam heuristics (honeypot + timing + content patterns) → per-IP Netlify Blobs rate limiting → Cloudflare Turnstile verification (`src/lib/server/turnstile.ts`, dormant until real keys are provisioned — see `AGENTS.md`) → Brevo upsert.
Web3Forms and `netlify/functions/submit-form.mjs` were retired in the 2026-07 redesign — any doc still referencing a Web3Forms key is stale.
Nothing emails the team on submission and there is no dedicated partnerships inbox; contact submissions land only in Brevo (list + attributes + CRM note), and a transactional-email notification is a known follow-up (`docs/systems.md`, Forms).
