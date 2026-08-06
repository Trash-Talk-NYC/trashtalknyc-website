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
* **List IDs:** 9 = signup, 10 = general contact, 11 = collab contact, 13 = sponsor contact.
Env vars: `BREVO_LIST_ID_SIGNUP`, `CONTACT_GENERAL`, `CONTACT_COLLAB`, `CONTACT_SPONSOR` (short names because Netlify rejected longer `BREVO_LIST_ID_`-prefixed ones), plus `BREVO_API_KEY`.
The first three are set identically across all Netlify deploy contexts (verified 2026-07); `CONTACT_SPONSOR=13` is documented in `.env.example` but **must also be set in Netlify (all deploy contexts)** — if missing, sponsor submissions fail loudly (`form_env_missing`, generic error in the UI) rather than landing in another list.
Sponsor inquiries notify `SPONSOR_NOTIFY_TO` (sponsors@trashtalknyc.org in production) instead of `CONTACT_NOTIFY_TO`, with no fallback between the two — unset means the sponsor notification is skipped (`inquiry_notify_skipped`), never misrouted.
* **Custom attribute map** (each must exist in the Brevo dashboard first or the upsert payload is rejected): `PHONE`, `INQUIRY_TYPE`, `WAIVER_ACCEPTED`, `MESSAGE`, `BOROUGH`, `HEAR_ABOUT_US`, `ORGANIZATION` (+ standard `FIRSTNAME`/`LASTNAME`).
Signup sends FIRSTNAME, LASTNAME, BOROUGH, PHONE, MESSAGE (experience text), HEAR_ABOUT_US, WAIVER_ACCEPTED.
Contact sends FIRSTNAME, LASTNAME, PHONE, INQUIRY_TYPE (`general` | `partnership` | `sponsor`), ORGANIZATION (collab + sponsor tabs), MESSAGE.
`INQUIRY_TYPE` is a plain text attribute (verified via the attributes API 2026-08), so new inquiry-type values need no Brevo dashboard work.
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

## Open Roles — top-level page at /recruit, intake EMAIL-ONLY

The recruitment page lives at **`/recruit`** (`src/pages/recruit.astro`; captain round 20 — moved from `/contact/join`, where it was "Join the Team"): a plain title ("We're looking for helping hands" — no `PageHero`, no eyebrow, no ghost word, by captain decision), the note-before-you-apply card, a "How we work" block, three roles (Social Media Manager, Content Videographer/Editor, Long-form Videographer/Editor), and a `mailto:` CTA to **team@trashtalknyc.org**. No form, no role numbering, no "Now recruiting" anywhere (phrase retired, round 20).
The round-15 verbatim opening statement ("This isn't cute. …") and the three pillars were removed in the round-20 restructure — they live in git history if the captain wants them back.
The mailto subject is the captain's line with a deliberate fill-in placeholder: `I'm [your name] and I want to join Trash Talk NYC` (role boxes append `— <Role>`); a mailto can't know the sender, so the subject asks them to say so.
English subjects are baked into the static hrefs and the language toggle swaps them client-side from `data-subject-*` attributes, because `setLang` never translates attributes.
Links to the page: the nav's About dropdown ("Open Roles"), the footer ("Open Roles"), the homepage crew callout, the About page's closing "Want to lend a hand?" CTA, the per-person `/about/{id}` pages, and the Contact page banner ("See more" → `/recruit` directly — it used to land on the About closing note instead of the roles).
The About closing section still carries the legacy `#join-the-team` anchor id so old links keep landing somewhere sensible.
The former `joinTeam` Astro Action, its schema, and the Netlify Blobs holding pen (`join-team-applications` store) were **deleted, not disabled** — if a form comes back, the validated intake pattern lives in git history (`git show 1f55978`); the Blobs store may still hold applications submitted while the form was live.

## Projects page — decoupled to `fm/projects-tree-guard`

The Projects page (`/projects`, with its CSS-3D tree-guard model and intentionally-pending placeholder content) was **removed from the release at the captain's request** and lives in full on the `fm/projects-tree-guard` branch — continue Projects work there, not here.
The nav's About dropdown ships with two items: **The Team** (`/about`) and **Open Roles** (`/recruit` — the recruitment page; both live on this consolidated branch).
"Open Roles" is the captain's chosen label (round 20; ES `Puestos Abiertos`): it must **never be relabelled "Join"** (the nav CTA already uses Join for the mailing list) and "Work With Us" was rejected as confusable with Contact.
`/recruit` highlights the **About** parent (top-level route, so Contact can't double-light); Projects rejoins the dropdown when `fm/projects-tree-guard` lands.
Do not link to `/projects` from anything on this branch — the route does not exist here and it is filtered from nothing (it simply isn't built), so a link would 404.

## E2E Testing

See the `e2e-testing` skill (`.agents/skills/e2e-testing/SKILL.md`) for how to choose between `astro dev`, `npm run dev`, and `netlify dev`, and what to verify for each kind of change (UI-only, Eventbrite-rendering, signups, contact forms, Brevo). Kept out of this always-loaded file so it only enters context when actually testing something.

## Visual QA

See the `visual-qa` skill (`.agents/skills/visual-qa/SKILL.md`) before calling any UI change done: breakpoint matrix, per-width state checklist (including the EN/ES toggle), translating subjective feedback, and the closing report format.

---

## Frontend architecture

* `src/styles/global.css` holds only true globals: design tokens (brand hues, fluid type/space scales, safe-area vars), reset, base typography, grain overlay, and cross-page utilities (`.section-title`, `.tape-seam`, `.diag-texture`).
* Everything else is component-scoped: nav/footer/social bar/lang toggle live in `src/components/` with their own `<style>` blocks. Add styles next to the component, not to global.css.
* Layout is fluid-first: `clamp()` tokens and `auto-fit`/`minmax()` grids instead of stacking breakpoints; heroes use `svh` (not `vh`); components pad with `max(<design spacing>, env(safe-area-inset-*))` — the env() values are all 0 now that `viewport-fit=cover` is gone (see the safe-area bullet below), but the `max()` pattern keeps every layout correct under either viewport mode, so keep using it for new chrome-adjacent UI.
* The visual language is "street poster / club zine": hard offset press shadows (`--press`, `--press-sm`), tilted `.sticker` chips, `.sign-plate` street-sign titles, giant outlined Bebas background words, the `.tape-seam` caution divider, and `.grid-paper` texture on light sections. New UI should reuse these devices rather than soft shadows or new decorative styles.
* EN/ES translation is attribute-driven (`data-en`/`data-es`, state in `src/lib/language.ts`); dynamic text (dates, tab-dependent copy) is re-rendered by the owning component on `onLanguageChange`.
* Images live in `src/assets/` and render through `<Image>` from `astro:assets` — never `public/` (raw files there bypass optimization; the 529 KB logo alone would have blown the bandwidth budget at target traffic).
The adapter sets `imageCDN: false` deliberately, so optimization happens at build time via sharp into immutable `/_astro/*.webp` files — keep it that way.
Two gotchas: pass a `class` to `<Image>` and select by it (a bare `img` descendant selector in a scoped `<style>` is fragile against the component's rendered output), and `<Image>` always emits `width`/`height` attributes, so any CSS `aspect-ratio` crop needs an explicit `height: auto` or the height attribute wins (this silently broke the About polaroid once).
* `setLang` in `src/lib/language.ts` swaps `textContent` only, and only on leaf elements carrying `data-en`/`data-es` — it never translates attributes.
So an `aria-label` stays English after a toggle; give controls a bilingual accessible name with a visually-hidden `<span data-en data-es>` inside instead (see the photo hotspots in `about.astro`).
* `<Image>` with `widths` but no `width` emits a fallback `src` at the source file's native resolution — the 5820px About group photo produced a 4.8 MB webp that way.
Always pass `width={<largest srcset width>}` alongside `widths` to cap the fallback.
* Team identity (names, roles, bios, social-link slots, portrait crops, meta descriptions) lives in `src/lib/team.ts`, shared by the About page and the per-person `/about/{id}` pages (`src/pages/about/[person].astro`) — edit it once, both surfaces update.
Nandi's and Fabiola's bios there are INTERIM role-grounded copy (no invented personal facts) and several social slots are `href="#"` placeholders awaiting the captain's URLs — flagged with TODO comments in the file.
* The About team section (`about.astro`) keeps only photo-frame presentation: a `geometry` map of hotspot bands, face-chip anchors, and spotlight ellipses, all expressed as percentages of the photo frame.
The hero renders a fixed build-time vertical crop of the group shot (the `CROP` constant; y-coordinates remap through `py()`) — never a viewport-dependent `object-fit`, which would silently misalign every hotspot and spotlight.
On mobile the photo plate pins (sticky) while the bios scroll past, the spotlight follows whichever bio owns the viewport (nobody owns it until the reader actually scrolls — the photo rests fully lit at page open), and the bio band pages with CSS scroll-snap whose snap positions are deliberately kept equal to `scrollToEntry`'s JS offset — change one and you must change the other or tap-to-scroll gets re-snapped elsewhere.
* **The header is a plain always-sticky nav on all widths; `viewport-fit=cover` is deliberately absent; and no `position: fixed` full-viewport layer may ever sit above the nav. Read this bullet's history before touching any of that.**
The captain's device (iOS 26) showed a persistent gap between the header and the status bar with page content visible in it; six successive CSS theories "fixed" it, passed every emulator and ≤iOS 18 simulator, and failed on-device.
The real cause was finally isolated with a standalone on-device test bench (`header-astro-demo-z4`, 2026-08, bisected on the captain's iPhone): **the grain texture as a full-viewport `position: fixed` layer at `z-index: 9999` above the sticky nav makes iOS 26 Safari misplace the header on scroll-direction changes.**
The device-confirmed fix ships in `global.css`: the grain is a document overlay instead — `position: relative` on `body`, `position: absolute` on `body::after` — visually identical because the grain is uniform noise.
The separate rubber-band overscroll reveal is handled by explicitly painting **both** `html` and `body` charcoal (also device-confirmed); earlier claims that iOS 26 "ignores theme-color and samples the body specifically, verified by pixel-sampling" came from iOS 18 simulator experiments and are unverified on iOS 26 — keep both surfaces matched, keep the cream page background on `main`, and keep the `theme-color` meta for iOS 15–17.
Refuted along the way, do not resurrect: chrome-color fixes (PRs #18, #22, #25), `nav::before` bleeds, negative-margin covers, hide-on-scroll, per-frame JS re-pinning (visibly glitches on-device), and the theory that Apple forums threads 800798/801028 describe a top-edge clipping mechanism (both are bottom-edge reports; the best-matching documented bug is WebKit 297779).
One known symptom remains and is tracked separately in the header-astro-demo task: after keyboard use the header can shift up and cover content — very likely the documented iOS 26 stale-viewport bug (WebKit 297779 / Apple thread 800125). Do NOT attempt CSS or JS fixes for it here.
`cover` stays out because nothing needs to draw under the status bar: without it, iOS letterboxes the band itself, painted from the charcoal `html`/`body`; the nav's safe-area padding was removed outright, so reintroducing `cover` requires revisiting the nav (`NavBar.astro`) as well as the `max()` fallbacks elsewhere. All `env(safe-area-inset-*)` resolve to 0 with `cover` gone.
Six rounds were lost because each inherited the previous round's written-down guess as established fact — never record a chrome theory as verified without real-device evidence.
Chrome-adjacent changes can be sanity-checked in the iOS Simulator (`xcrun simctl openurl booted <dev-url>` + `simctl io booted screenshot`), but simulators max out at iOS 18 and passed every failed theory above — the captain's iOS 26 phone is the only acceptance gate.

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
