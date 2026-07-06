---
name: e2e-testing
description: How to end-to-end test changes to the trashtalknyc-website repo — choosing between `astro dev`, `npm run dev`, and `netlify dev`, and what to verify for each kind of change. Use this skill whenever a task involves testing or verifying a change to this site, including UI/layout/copy changes, event card or Eventbrite-related changes, the signup form, the general/partnership contact form, Astro Actions, Brevo, or responsive/safe-area behavior. Also use it before starting any local dev server for testing, since it covers running servers in the background and avoiding port conflicts when multiple agents may be working on this repo at once.
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
   For anything touching the nav, hero heights, or full-bleed sections, remember the site uses `viewport-fit=cover` + `env(safe-area-inset-*)` and `svh` units — device-emulation screenshots at minimum, a notched-device emulation if the change is chrome-adjacent.
2. **UI changes rendering integration data** (event cards): still just `astro dev` — event data bypasses the server entirely, fetched from Eventbrite at build/dev time. Run `npm run test` to confirm `src/lib/__tests__/events.test.ts` still passes (mapping, upcoming/past split, missing-env warnings).
3. **Form changes** (signup on `/`, general/partnership tabs on `/contact`): `astro dev` serves the actions.
   - Without Brevo env vars, a submission exercises the full client → action → validation → spam-check chain and then fails gracefully: server logs `{"evt":"form_env_missing",...}` and the UI shows the generic error with the form intact. That's the expected local result and confirms the wiring.
   - With `BREVO_API_KEY` + `BREVO_LIST_ID_SIGNUP` / `BREVO_LIST_ID_CONTACT` in `.env`, a submission upserts a real Brevo contact — use a test list, not `signups_list`, when doing this.
   - Test the contact form in **both** tab states (General and Collaborate — the latter reveals and requires `organization`).
   - Submissions faster than ~3s after page load are rejected as spam (`too_fast`) — wait a beat before programmatically submitting, or you'll test the spam path by accident.
4. **Server-logic changes** (schemas, spam heuristics, rate limiting, Brevo client in `src/lib/server/`): these are plain modules with unit tests in `src/lib/server/__tests__/` — extend those first; they run without any server.
