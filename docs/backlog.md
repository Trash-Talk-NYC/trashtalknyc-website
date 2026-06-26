# Backlog

Lightweight capture of observations. Items here are not commitments —
they're things worth not losing track of. Promote to actual implementation
work when prioritized, not before.

---

## P0 Broken

*(none open — see Resolved below)*

---

## Resolved

### Eventbrite organizer link 404s — fixed
Hardcoded organizer URL on `/events`'s "no upcoming events" fallback pointed to a guessed slug that didn't resolve.
**Shipped:** `0a19e9e fix: correct broken Eventbrite link and remove unreliable borough detection`

---

## P1 Product Debt

### Footer inconsistency across pages
`events.astro` uses a custom footer (flex-column, different border treatment) via `slot="footer"`, diverging from the shared `BaseLayout` footer used everywhere else.
**Why it matters:** Visual inconsistency across pages undermines the "shared layout" goal of the Astro migration; was a deliberate-but-unreconciled choice made during Phase 4.
**Effort:** Medium

---

## P1 Product Improvements

### Volunteer hero section updates
Homepage hero/volunteer section copy and layout may need a refresh (specifics not yet scoped).
**Why it matters:** It's the first thing visitors see; flagged as wanting attention but not yet defined enough to size precisely.
**Effort:** Medium

### GoFundMe mobile visibility and placement
The hero GoFundMe embed is hidden below 1024px (`.hero-gfm { display: none; }`) — only the second, lower-page embed shows on mobile.
**Why it matters:** Donation visibility on mobile (the majority of traffic for most sites) may be suboptimal; worth a deliberate decision rather than an inherited default.
**Effort:** Small–Medium

### Overly permissive CORS header on next-event function
`netlify/functions/next-event.mjs` sends `Access-Control-Allow-Origin: '*'`, allowing any origin to call it.
**Why it matters:** Not currently exploited or causing harm — flagged by Infrastructure & Security as a pre-existing condition, not a regression — but unrestricted CORS on a function with API credentials behind it is worth tightening eventually.
**Effort:** Small

---

## P2 New Features

*(none captured tonight)*

---

## P2 Developer Experience

### GitHub Actions confidence automation
Set up foundational CI: linting, build checks, code scanning.
**Why it matters:** Currently all verification (build, tsc, fixtures) is run manually per session; CI would catch regressions automatically on every push. Was tonight's Priority 4, not reached.
**Effort:** Medium

### No test coverage on /events empty-state fallback
The "no upcoming events" fallback on `/events` (including its Eventbrite link) was never exercised by any fixture or smoke test tonight — it's how the broken organizer link went undetected until manual review.
**Why it matters:** Empty/fallback states are easy to skip in automated checks because they only appear when data is absent, but they're equally real to a live visitor — especially right now, since this is the page's actual current state.
**Effort:** Small

---

## Parking Lot (future ideas)

*(none captured tonight)*

---

## Session Handoff

*Snapshot from the session that created this backlog — kept for record, not current state. The Eventbrite link fix has since shipped (`0a19e9e`, pushed); the P0 item above is resolved. This backlog document itself is still uncommitted.*

**What was accomplished tonight:**
- Validated the Eventbrite homepage rendering path with a disposable mock fixture (event + fallback states), then deleted it — zero production residue
- Piloted the advisory role system (`docs/agents/*`, `docs/agent-protocol.md`) across multiple tasks; evaluated which roles added real value vs. which didn't
- Planned, then implemented, a General/Collaborate contact form redesign — single Web3Forms key, tabbed UI, no new inbox or vendor
- Iterated the Collaborate tab's copy through several rounds of language review (tab naming, placeholder tone, response-time accuracy) based on direct subjective feedback
- Established a human-approval-gated workflow for UI changes (local review before commit) and a Developer Experience reporting standard, now written into `docs/systems.md` and `docs/agent-protocol.md`
- Found and root-caused a live production bug (Eventbrite organizer link) during manual preview review
- Created this backlog document

**What was committed** (on `feature/astro-migration`, all pushed):
- `eb57bc0` — docs: add advisory role system and decision log
- `0d31984` — docs: document product principles and prune stale docs
- `291d41d` — feat: add General/Collaborate tabs to contact form
- (earlier in the session, also on this branch: `671b231` homepage migration, `e3c14f0` GoFundMe fix)

**What was pushed:** All of the above — `origin/feature/astro-migration` is up to date through `291d41d`.

**What still requires human review:**
- The General/Collaborate contact form on the live deploy preview (`https://deploy-preview-1--trashtalknyc.netlify.app/contact`) — copy and visual review, not yet explicitly confirmed on the deployed surface itself
- This backlog document itself — uncommitted

**Recommended next session order:**
1. Review and merge PR #1 if the contact form preview review (above) comes back clean
2. Pick up P1 Product Debt/Improvements (footer consistency, GoFundMe mobile placement, volunteer hero) — none are urgent, but they're well-defined enough to start
3. GitHub Actions CI (P2 DX) — still the lowest-risk, highest-leverage item not yet started
