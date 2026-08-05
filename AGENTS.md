# Trash Talk NYC Website

## What this project is  

This is a website for Trash Talk NYC associated with @trashtalk_nyc (same handle on Instagram and TikTok). David Clarke is behind the account, and posts short-form videos cleaning up NYC-literally, with a grabber and trash bag and the phone strapped to his chest. 
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

## Turnstile bot check — pending real keys

Both forms carry a Cloudflare Turnstile widget verified server-side in the actions (`requireTurnstile` in `src/actions/index.ts`, `src/lib/server/turnstile.ts`), layered on top of — not replacing — the honeypot/timing heuristics.
**The feature is dormant until real keys exist:** with `PUBLIC_TURNSTILE_SITE_KEY` unset, no widget renders and the actions skip verification, logging `turnstile_not_configured` per submission.
**Captain action required to go live:** create a Turnstile widget for the production domain in the Cloudflare dashboard, set `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Netlify (all deploy contexts), then trigger a redeploy — the site key bakes into the prerendered pages at build time, so enforcement without a rebuild would break the forms.
Once the site key is set, a missing secret fails closed (`form_env_missing` pattern); verification failures log `form_turnstile_rejected` and show the same generic error as other validation failures.
For local dev, Cloudflare's public test keys always pass: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA` (always-fail variants: site `2x00000000000000000000AB`, secret `2x0000000000000000000000000000000AA`).
Turnstile tokens are single-use, so the page scripts call `window.turnstile.reset()` after every consumed submission attempt — keep that when touching the form submit handlers.

## Projects page — awaiting real content

`/projects` (linked from the nav's About dropdown alongside The Team) has its structure and design in place but is **intentionally pending real content**: the captain has not yet supplied Tree Guards specifics (sites, counts, timeline) or any further projects.
The "TBD" dimension labels in the tree-guard spec drawing, the dashed pending chips, and the "Coming soon" placeholder slots are deliberate — do not fill them with invented specifics; only the captain supplies real numbers, locations, dates, or partners.
The tree-guard model in `src/pages/projects.astro` is a CSS-3D scene (same perspective/preserve-3d technique as the 404 street scene) whose scroll-linked yaw is written to the `--ry` custom property by JS; **the CSS fallback value of `--ry` is the fixed three-quarter view that reduced-motion and no-JS visitors get**, and the scroll listener is gated by both `prefers-reduced-motion` and an IntersectionObserver — keep those invariants when touching it.

## E2E Testing

See the `e2e-testing` skill (`.agents/skills/e2e-testing/SKILL.md`) for how to choose between `astro dev`, `npm run dev`, and `netlify dev`, and what to verify for each kind of change (UI-only, Eventbrite-rendering, signups, contact forms, Brevo). Kept out of this always-loaded file so it only enters context when actually testing something.

## Visual QA

See the `visual-qa` skill (`.agents/skills/visual-qa/SKILL.md`) before calling any UI change done: breakpoint matrix, per-width state checklist (including the EN/ES toggle), translating subjective feedback, and the closing report format.

---

## Frontend architecture

* `src/styles/global.css` holds only true globals: design tokens (brand hues, fluid type/space scales, safe-area vars), reset, base typography, grain overlay, and cross-page utilities (`.section-title`, `.tape-seam`, `.diag-texture`).
* Everything else is component-scoped: nav/footer/social bar/lang toggle live in `src/components/` with their own `<style>` blocks. Add styles next to the component, not to global.css.
* Layout is fluid-first: `clamp()` tokens and `auto-fit`/`minmax()` grids instead of stacking breakpoints; heroes use `svh` (not `vh`); chrome pads with `env(safe-area-inset-*)` under `viewport-fit=cover`.
* The visual language is "street poster / club zine": hard offset press shadows (`--press`, `--press-sm`), tilted `.sticker` chips, `.sign-plate` street-sign titles, giant outlined Bebas background words, the `.tape-seam` caution divider, and `.grid-paper` texture on light sections. New UI should reuse these devices rather than soft shadows or new decorative styles.
* EN/ES translation is attribute-driven (`data-en`/`data-es`, state in `src/lib/language.ts`); dynamic text (dates, tab-dependent copy) is re-rendered by the owning component on `onLanguageChange`.
* Images live in `src/assets/` and render through `<Image>` from `astro:assets` — never `public/` (raw files there bypass optimization; the 529 KB logo alone would have blown the bandwidth budget at target traffic).
The adapter sets `imageCDN: false` deliberately, so optimization happens at build time via sharp into immutable `/_astro/*.webp` files — keep it that way.
Two gotchas: pass a `class` to `<Image>` and select by it (a bare `img` descendant selector in a scoped `<style>` is fragile against the component's rendered output), and `<Image>` always emits `width`/`height` attributes, so any CSS `aspect-ratio` crop needs an explicit `height: auto` or the height attribute wins (this silently broke the About polaroid once).
* The strip iOS Safari paints between the system status bar and the page is browser chrome — page CSS (like the `nav::before` bleed that covers rubber-band/toolbar-transition gaps) can never paint over it.
What colors it depends on the iOS version, and this burned us twice: iOS 15–17 use the `theme-color` meta in `BaseLayout.astro`, but iOS 26 (Liquid Glass) **ignores `theme-color` entirely** and samples the **`body` element's `background-color`** — not the `html` canvas, not the sticky nav, not pseudo-elements (verified by pixel-sampling simulator screenshots).
That's why `body` stays nav charcoal (`#1c1c22`) and the cream page background lives on `main` (see `global.css`); keep the `theme-color` meta too for older iOS.
Verify chrome-adjacent changes in the iOS Simulator (`xcrun simctl openurl booted <dev-url>` + `simctl io booted screenshot`), not just desktop emulation.
Local simulators max out at iOS 18, which still honors `theme-color`, so to emulate iOS 26 chrome behavior temporarily remove the `theme-color` meta and confirm the strip still renders charcoal from the body background alone.

## SEO & share metadata

* `BaseLayout.astro` owns the whole head: per-page `title` + required `description` props feed the `<title>`, meta description, canonical, Open Graph, and Twitter tags; pages can inject extras (like JSON-LD) via `slot="head"`.
* The homepage `<title>` and `og:title` are exactly **"Trash Talk NYC"** — a captain decision about how shared links present.
Keep descriptive copy in the meta description, never appended to the brand name.
Inner pages use the "Page — Trash Talk NYC" pattern.
* `site: 'https://trashtalknyc.org'` in `astro.config.mjs` feeds `Astro.site`; canonical/og URLs and the sitemap derive from it, so they stay production-absolute even on preview builds.
The www host 301s to the apex.
* Icon/share assets in `public/` (favicon.svg/.ico, apple-touch-icon.png, og-image.png, logo.png) are **generated, not hand-edited**: `node scripts/generate-icons.mjs` rebuilds them from `src/assets/primary-logo.png` — the captain requires the favicon to be the exact hero logo, so regenerate rather than swapping in other variants.
These are a deliberate exception to the "never `public/`" image rule: they're pre-sized, fetched by crawlers/scrapers at stable root paths, not rendered by pages.
* Meta descriptions are English-only on purpose: the ES toggle is client-side on the same URLs, so there's no separate ES document to hreflang to and EN is the indexable language.
* The 404 page carries `noindex` (via the `noindex` layout prop) and is filtered out of the sitemap in `astro.config.mjs`.

## Development Philosophy

Prioritize:

1. Simplicity
2. Maintainability
3. Modular, reusable code, and avoid writing "spaghetti" code
4. Accessibility
5. Performance
6. Clear architecture
