---
name: e2e-testing
description: How to end-to-end test changes to the trashtalknyc-website repo — choosing between `astro dev`, `npm run dev`, and `netlify dev`, and what to verify for each kind of change. Use this skill whenever a task involves testing or verifying a change to this site, including UI/layout/copy changes, event card or Eventbrite-related changes, the signup form, the general/partnership contact form, Web3Forms, Brevo, or anything in `netlify/functions/`. Also use it before starting any local dev server for testing, since it covers running servers in the background and avoiding port conflicts when multiple agents may be working on this repo at once.
---

# E2E Testing (trashtalknyc-website)

Match the dev server to what the change touches — don't reach for `netlify dev` unless a Netlify Function is actually in the loop.

## The three commands

**`npm run dev`** is just an alias for `astro dev` (see `package.json`) — same process, same limitations.

**`astro dev` / `npm run dev`** — Astro's dev server only. Reads `.env` via `import.meta.env`, so build-time integrations (Eventbrite, via `fetchEventsAtBuildTime()` in `src/lib/events.ts`) work fine. Has **no knowledge of `netlify/functions/`** — any fetch to `/.netlify/functions/*` 404s here, which can look like a broken form when it's actually just the wrong dev server.

**`netlify dev`** — wraps the Astro dev server *and* emulates the Functions runtime locally, so `/.netlify/functions/submit-form` actually runs `netlify/functions/submit-form.mjs`. Also applies `netlify.toml` redirects/headers, and (after `netlify link`) can pull the linked site's real env vars instead of only local `.env`.

## Running the dev server

Start whichever server you need **in the background**, not in the foreground — a blocking foreground process leaves the session unable to do anything else while it waits, and this repo is often worked on by more than one agent/session at once, so a blocking server in one session is easy to mistake for a hang in another.

Before starting one, check whether a server is already running on the port you'd use rather than assuming the port is free:
- `astro dev` defaults to port `4321`
- `netlify dev` defaults to port `8888`

If the default port is taken, that's very likely another agent's or your own earlier session's server already up and usable — don't kill it to reclaim the port. Either reuse it (if it's serving the same repo/branch you need) or start yours on a different port (`astro dev --port <n>` / `netlify dev --port <n>`).

## How to E2E

1. **UI-only changes** (layout, copy, styling, non-integration components): `astro dev` / `npm run dev`. Check both breakpoints (768px standard). No functions involved.
2. **UI changes rendering integration data** (event cards): still just `astro dev` / `npm run dev` — event data bypasses Functions entirely, fetched directly from Eventbrite at build/dev time. Run `npm run test` to confirm `src/lib/__tests__/events.test.ts` still passes (mapping, upcoming/past split, missing-env warnings).
3. **Anything touching a Netlify Function** (signups, contact forms, future Brevo integration): use `netlify dev` with real credentials in `.env`.
   - *Eventbrite fetch*: confirm `fetchEventsAtBuildTime()` returns real events with valid creds, and degrades gracefully (empty array + console warning, not a build failure) on a bad/missing token.
   - *Signups*: submit through `netlify/functions/submit-form.mjs` with `formType: "signup"` (`FORM_KEY_SIGNUP`), confirm a 200 and that the email lands in Web3Forms.
   - *Contact forms*: `src/pages/contact.astro` is one form with a General/Partnership toggle, both submitting through the same function (`formType: "contact"` or `"partnership"`, `FORM_KEY_CONTACT`) — test both tab states, not just one.
   - *Brevo*: not wired into a function yet. Once built: mocked-fetch unit test first for the request/error contract, then `netlify dev` against Brevo's sandbox/test list before using production keys.
