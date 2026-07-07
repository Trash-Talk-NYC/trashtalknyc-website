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

## E2E Testing

See the `e2e-testing` skill (`.agents/skills/e2e-testing/SKILL.md`) for how to choose between `astro dev`, `npm run dev`, and `netlify dev`, and what to verify for each kind of change (UI-only, Eventbrite-rendering, signups, contact forms, Brevo). Kept out of this always-loaded file so it only enters context when actually testing something.

---

## Frontend architecture

* `src/styles/global.css` holds only true globals: design tokens (brand hues, fluid type/space scales, safe-area vars), reset, base typography, grain overlay, and cross-page utilities (`.section-title`, `.tape-seam`, `.diag-texture`).
* Everything else is component-scoped: nav/footer/social bar/lang toggle live in `src/components/` with their own `<style>` blocks. Add styles next to the component, not to global.css.
* Layout is fluid-first: `clamp()` tokens and `auto-fit`/`minmax()` grids instead of stacking breakpoints; heroes use `svh` (not `vh`); chrome pads with `env(safe-area-inset-*)` under `viewport-fit=cover`.
* The visual language is "street poster / club zine": hard offset press shadows (`--press`, `--press-sm`), tilted `.sticker` chips, `.sign-plate` street-sign titles, giant outlined Bebas background words, the `.tape-seam` caution divider, and `.grid-paper` texture on light sections. New UI should reuse these devices rather than soft shadows or new decorative styles.
* EN/ES translation is attribute-driven (`data-en`/`data-es`, state in `src/lib/language.ts`); dynamic text (dates, tab-dependent copy) is re-rendered by the owning component on `onLanguageChange`.

## Development Philosophy

Prioritize:

1. Simplicity
2. Maintainability
3. Modular, reusable code, and avoid writing "spaghetti" code
4. Accessibility
5. Performance
6. Clear architecture
