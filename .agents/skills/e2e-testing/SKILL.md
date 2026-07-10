---
name: e2e-testing
description: How to end-to-end test changes to the trashtalknyc-website repo — choosing between `astro dev`, `npm run dev`, and `netlify dev`, and what to verify for each kind of change. Use this skill whenever a task involves testing or verifying a change to this site, including UI/layout/copy changes, event card or Eventbrite-related changes, the signup form, the general/partnership contact form, Astro Actions, Brevo, head/SEO metadata (titles, descriptions, OG tags, sitemap, icons), or responsive/safe-area behavior. Also use it before starting any local dev server for testing, since it covers running servers in the background and avoiding port conflicts when multiple agents may be working on this repo at once.
---

# E2E Testing (trashtalknyc-website)

Match the dev server to what the change touches.
Since the Astro Actions migration, `astro dev` covers almost everything — forms included.

## The three commands

**`npm run dev`** is just an alias for `astro dev` (see `package.json`) — same process, same limitations.

**`astro dev` / `npm run dev`** — Astro's dev server.
Reads `.env` via `import.meta.env`, so build-time integrations (Eventbrite, via `fetchEventsAtBuildTime()` in `src/lib/events.ts`) work fine.
Also serves **Astro Actions** (`src/actions/index.ts`) — both forms submit through actions, so form flows are testable here without Netlify tooling.
The one thing it can't emulate is Netlify Blobs: the per-IP rate limiter (`src/lib/server/rate-limit.ts`) fails open with a `rate_limit_unavailable` log line locally, which is expected.

**`netlify dev`** — wraps the Astro dev server in Netlify's runtime emulation.
Only needed when verifying Netlify-runtime specifics: Blobs-backed rate limiting, `netlify.toml` behavior, or (after `netlify link`) the linked site's real env vars instead of local `.env`.

## Running the dev server

Start whichever server you need **in the background**, not in the foreground — a blocking foreground process leaves the session unable to do anything else while it waits, and this repo is often worked on by more than one agent/session at once, so a blocking server in one session is easy to mistake for a hang in another.

Before starting one, check whether a server is already running on the port you'd use rather than assuming the port is free:
- `astro dev` defaults to port `4321`
- `netlify dev` defaults to port `8888`

If the default port is taken, that's very likely another agent's or your own earlier session's server already up and usable — don't kill it to reclaim the port.
Either reuse it (if it's serving the same repo/branch you need) or start yours on a different port (`astro dev --port <n>` / `netlify dev --port <n>`).

## How to E2E

1. **UI-only changes** (layout, copy, styling, non-integration components): `astro dev` / `npm run dev`.
   The layout is fluid (`clamp()`-based tokens in `src/styles/global.css`), so check a spread of widths, not just one breakpoint: small mobile portrait (~375px), phone landscape (~844×390), tablet (~768px), and desktop (~1440px).
   For anything touching the nav, hero heights, or full-bleed sections, remember the site uses `viewport-fit=cover` + `env(safe-area-inset-*)` and `svh` units — device-emulation screenshots at minimum; if the change is chrome-adjacent (status bar, home indicator, sticky nav), verify in the iOS Simulator (`xcrun simctl openurl booted <dev-url>` + `simctl io booted screenshot`) at both scroll-top and mid-scroll, not just desktop emulation.
   For in-page anchor links (`#deep-clean`, `#signup`), confirm the target lands clear of the sticky nav — `scroll-padding-top` on the `html` rule in `global.css` (derived from `--nav-h`) handles this, so a regression there usually means that token drifted from the nav's real height.
2. **UI changes rendering integration data** (event cards): still just `astro dev` — event data bypasses the server entirely, fetched from Eventbrite at build/dev time. Run `npm run test` to confirm `src/lib/__tests__/events.test.ts` still passes (mapping, upcoming/past split, missing-env warnings).
3. **Form changes** (signup on `/`, general/partnership tabs on `/contact`): `astro dev` serves the actions.
   - Without Brevo env vars, a submission exercises the full client → action → validation → spam-check chain and then fails gracefully: server logs `{"evt":"form_env_missing",...}` and the UI shows the generic error with the form intact. That's the expected local result and confirms the wiring.
   - Turnstile is dormant without `PUBLIC_TURNSTILE_SITE_KEY` in `.env` — no widget renders and the action logs `turnstile_not_configured`, so the two points above hold either way. To exercise the widget itself, set `PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` and `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (Cloudflare's always-pass test keys); swap in the always-fail variants (`2x00000000000000000000AB` / `2x0000000000000000000000000000000AA`) to confirm a rejected token surfaces `form_turnstile_rejected` and the generic form error. Turnstile tokens are single-use, so confirm `window.turnstile.reset()` runs after a failed attempt before retrying.
   - On failure, the error is announced twice: a transient ~3.5s button-text swap, and a persistent message in an `aria-live="polite"` `.form-error` element next to the submit button (`submitErrorText()` in `src/lib/language.ts`). Verify the persistent message survives after the button reverts, clears on resubmit, and re-renders in the new language on a language toggle.
   - With `BREVO_API_KEY` + `BREVO_LIST_ID_SIGNUP` / `CONTACT_GENERAL` / `CONTACT_COLLAB` in `.env`, a submission upserts a real Brevo contact — use a test list, not `signups_list`, when doing this.
   - Test the contact form in **both** tab states (General and Collaborate — the latter reveals and requires `organization`).
   - Submissions faster than ~3s after page load are rejected as spam (`too_fast`) — wait a beat before programmatically submitting, or you'll test the spam path by accident.
   - After a successful submission, switch tabs and confirm the form reappears (not the stale success view) — `restoreFormAfterSuccess()` in `contact.astro` handles this.
4. **Server-logic changes** (schemas, spam heuristics, rate limiting, Turnstile verification, Brevo client in `src/lib/server/`): these are plain modules with unit tests in `src/lib/server/__tests__/` — extend those first; they run without any server.
5. **Head-metadata / SEO changes** (titles, meta descriptions, OG/Twitter tags, canonical, JSON-LD — `src/layouts/BaseLayout.astro` and page frontmatter): `astro dev` renders the full head, so `curl -s <dev-url> | grep -iE 'og:|twitter:|canonical|description|ld\+json'` (or view-source) covers tag checks.
   Keep the homepage `<title>`/`og:title` exactly "Trash Talk NYC" — a captain decision (see AGENTS.md, "SEO & share metadata").
   The sitemap is build-only: `@astrojs/sitemap` writes `sitemap-index.xml` during `astro build` (check `dist/`), so a 404 for it on the dev server is expected, not a regression.
   Icon/share assets in `public/` are generated, never hand-edited — after a logo change run `node scripts/generate-icons.mjs` and confirm `/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, `/og-image.png`, and `/logo.png` all resolve on the built site.
