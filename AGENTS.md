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

* HTML/CSS/JS & Astro
* Netlify hosting
* Netlify Functions
* Brevo for emailing tens of thousands of people
* Eventbrite integration 
* Web3Forms integration
* GoFundMe embeds

## E2E Testing

Match the dev server to what the change touches — don't reach for `netlify dev` unless a Netlify Function is actually in the loop.

**`npm run dev`** is just an alias for `astro dev` (see `package.json`) — same process, same limitations.

**`astro dev` / `npm run dev`** — Astro's dev server only. Reads `.env` via `import.meta.env`, so build-time integrations (Eventbrite, via `fetchEventsAtBuildTime()` in `src/lib/events.ts`) work fine. Has **no knowledge of `netlify/functions/`** — any fetch to `/.netlify/functions/*` 404s here, which can look like a broken form when it's actually just the wrong dev server.

**`netlify dev`** — wraps the Astro dev server *and* emulates the Functions runtime locally, so `/.netlify/functions/submit-form` actually runs `netlify/functions/submit-form.mjs`. Also applies `netlify.toml` redirects/headers, and (after `netlify link`) can pull the linked site's real env vars instead of only local `.env`.

**How to E2E:**
1. **UI-only changes** (layout, copy, styling, non-integration components): `astro dev` / `npm run dev`. Check both breakpoints (768px standard). No functions involved.
2. **UI changes rendering integration data** (event cards): still just `astro dev` / `npm run dev` — event data bypasses Functions entirely, fetched directly from Eventbrite at build/dev time. Run `npm run test` to confirm `src/lib/__tests__/events.test.ts` still passes (mapping, upcoming/past split, missing-env warnings).
3. **Anything touching a Netlify Function** (signups, contact forms, future Brevo integration): use `netlify dev` with real credentials in `.env`.
   - *Eventbrite fetch*: confirm `fetchEventsAtBuildTime()` returns real events with valid creds, and degrades gracefully (empty array + console warning, not a build failure) on a bad/missing token.
   - *Signups*: submit through `netlify/functions/submit-form.mjs` with `formType: "signup"` (`FORM_KEY_SIGNUP`), confirm a 200 and that the email lands in Web3Forms.
   - *Contact forms*: `src/pages/contact.astro` is one form with a General/Partnership toggle, both submitting through the same function (`formType: "contact"` or `"partnership"`, `FORM_KEY_CONTACT`) — test both tab states, not just one.
   - *Brevo*: not wired into a function yet. Once built: mocked-fetch unit test first for the request/error contract, then `netlify dev` against Brevo's sandbox/test list before using production keys.

---

## Development Philosophy

Prioritize:

1. Simplicity
2. Maintainability
3. Reusable components
4. Accessibility
5. Performance
6. Clear architecture
7. Keeping users engaged on-site whenever practical

Avoid:

* Premature complexity
* Unnecessary dependencies
* User accounts unless there is a strong business need
* Overengineering
* User flows that unnecessarily redirect visitors away from the website

When proposing solutions:

* Prefer Astro conventions
* Prefer composition over inheritance
* Prefer self-documenting code
* Prefer named e
