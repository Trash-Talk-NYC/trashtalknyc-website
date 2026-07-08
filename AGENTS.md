# Trash Talk NYC Website

## What this project is  

This is a website for Trash Talk NYC associated with @trashtalk_nyc (on Instagram, @trashtalknyc on TikTok). David Clarke is behind the account, and posts short-form videos cleaning up NYC-literally, with a grabber and trash bag and the phone strapped to his chest. 
He reached out to me, Fabi, to make the website. 

## What the website does
* Act as centralized place to find Trash Talk NYC Cleanup Events that anyone can attend
* Act as the place to find cleanup event descriptions, and any updates to specific events.
* Clearly display ways to donate and what past donations are going towards
* Clearly display Trash Talk NYC mission, objectives, and act as a canvas where we display our progress, wins, updates, and projects
* Importantly, it is the place where people sign up for a newsletter, and getting the emails of those interested is paramount.
* Also importantly, it is the place where interested creators, organizations, and companies/enterprises can contact us to collaborate.

## Current Stack

* Astro framework (static output + `@astrojs/netlify` adapter so Astro Actions run on-demand)
* Netlify hosting
* Astro Actions for both forms (validation, spam checks, Blobs rate limiting, Brevo upsert — `src/actions/`, `src/lib/server/`)
* Brevo for emailing tens of thousands of people
* Eventbrite integration 
* GoFundMe embeds

## Brevo integration — sharp edges

Full form/attribute detail lives in `docs/systems.md` (Forms section); these are the things that bite.
Operational depth — the Authorized-IPs outage story, the debugging order, and the attribute-options API workaround — lives in the `brevo-integration` skill (`.agents/skills/brevo-integration/SKILL.md`).

* **Authorized IPs must stay OFF** in Brevo's security settings.
Netlify Functions egress from dynamic AWS IPs, so any IP allowlist will intermittently block production form submissions (this caused a real incident).
* **List IDs:** 9 = signup, 10 = general contact, 11 = collab contact.
Env vars: `BREVO_LIST_ID_SIGNUP`, `CONTACT_GENERAL`, `CONTACT_COLLAB` (short names because Netlify rejected longer `BREVO_LIST_ID_`-prefixed ones), plus `BREVO_API_KEY`.
All are set identically across all Netlify deploy contexts (verified 2026-07).
* **Custom attribute map** (each must exist in the Brevo dashboard first or the upsert payload is rejected): `PHONE`, `INQUIRY_TYPE`, `WAIVER_ACCEPTED`, `MESSAGE`, `BOROUGH`, `HEAR_ABOUT_US`, `ORGANIZATION` (+ standard `FIRSTNAME`/`LASTNAME`).
Signup sends FIRSTNAME, LASTNAME, BOROUGH, PHONE, MESSAGE (experience text), HEAR_ABOUT_US, WAIVER_ACCEPTED.
Contact sends FIRSTNAME, LASTNAME, PHONE, INQUIRY_TYPE, ORGANIZATION (collab tab only), MESSAGE.
Empty-string fields are dropped before upsert so updates never blank existing values (`buildAttributes` in `src/lib/server/brevo.ts`).
* **`PHONE` is a custom text attribute, not Brevo's native SMS/phone field.**
The Brevo UI shows the native field prominently and shows custom attributes only in the contact's attribute panel (or as manually added list columns), so `PHONE`/`ORGANIZATION` can look "missing" in the UI while being present via API.
This exact misreading was reported as a production bug after the 2026-07 redesign launch; Netlify function logs (`netlify logs --source functions --function ssr`) proved every production submission had upserted successfully with all attributes.
Before debugging "missing Brevo fields", check the contact's custom attributes via API or the attribute panel, not the list view.
* **Attributes are last-write-wins.**
Full submission history is preserved as Brevo CRM notes with a queryable header (`form=… | field=… | submitted=<ISO>` then the raw content) — see `buildNoteText` in `src/lib/server/brevo.ts`.

## E2E Testing

See the `e2e-testing` skill (`.agents/skills/e2e-testing/SKILL.md`) for how to choose between `astro dev`, `npm run dev`, and `netlify dev`, and what to verify for each kind of change (UI-only, Eventbrite-rendering, signups, contact forms, Brevo). Kept out of this always-loaded file so it only enters context when actually testing something.

---

## Frontend architecture

* `src/styles/global.css` holds only true globals: design tokens (brand hues, fluid type/space scales, safe-area vars), reset, base typography, grain overlay, and cross-page utilities (`.section-title`, `.tape-seam`, `.diag-texture`).
* Everything else is component-scoped: nav/footer/social bar/lang toggle live in `src/components/` with their own `<style>` blocks. Add styles next to the component, not to global.css.
* Layout is fluid-first: `clamp()` tokens and `auto-fit`/`minmax()` grids instead of stacking breakpoints; heroes use `svh` (not `vh`); chrome pads with `env(safe-area-inset-*)` under `viewport-fit=cover`.
* The visual language is "street poster / club zine": hard offset press shadows (`--press`, `--press-sm`), tilted `.sticker` chips, `.sign-plate` street-sign titles, giant outlined Bebas background words, the `.tape-seam` caution divider, and `.grid-paper` texture on light sections. New UI should reuse these devices rather than soft shadows or new decorative styles.
* EN/ES translation is attribute-driven (`data-en`/`data-es`, state in `src/lib/language.ts`); dynamic text (dates, tab-dependent copy) is re-rendered by the owning component on `onLanguageChange`.
* iOS Safari paints its own opaque status-bar backdrop above the page while scrolling, colored by the `theme-color` meta in `BaseLayout.astro` (must stay nav charcoal `#1c1c22`).
Without it, Safari samples the cream page background and draws a light band directly above the charcoal sticky nav — page CSS (like the `nav::before` bleed that covers rubber-band/toolbar-transition gaps) can never paint over that band because it is browser chrome.
Verify chrome-adjacent changes in the iOS Simulator (`xcrun simctl openurl booted <dev-url>` + `simctl io booted screenshot`), not just desktop emulation.

## Development Philosophy

Prioritize:

1. Simplicity
2. Maintainability
3. Modular, reusable code, and avoid writing "spaghetti" code
4. Accessibility
5. Performance
6. Clear architecture
