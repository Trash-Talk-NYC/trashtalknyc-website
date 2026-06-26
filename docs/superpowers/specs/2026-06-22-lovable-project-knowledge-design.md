# Lovable Project Knowledge — Trash Talk NYC Visual Rebuild

Drafted 2026-06-22. This is the content to paste into Lovable's "Project Knowledge" field for the ground-up visual rebuild prototype. Lovable's own docs describe this field as context "specific to a single project, such as the application purpose, database schema, architecture decisions, or domain terminology" — this doc covers the first and last of those; there is no real database/backend for this project (see "Dynamic content" below).

This is a **prototyping-only** exercise. The Astro/Netlify codebase at the root of this repo remains the system of record. Nothing here authorizes replacing it — see [[project-roadmap-vision]] and `CLAUDE.md`'s Migration Principle. The winning visual direction from Lovable gets manually ported into Astro afterward, where it picks up islands/partial-hydration performance that a Lovable React/Vite SPA does not have.

---

## 1. Project purpose & identity

Trash Talk NYC is an **NYC Cleanup Club** — not a nonprofit, not a charity, not an organization that "runs cleanup events." Cleanup events are the primary activity today but are not the core identity; the club itself is the identity.

Long-term vision: participation in cleanup culture becomes socially normal and contagious, to the point it's unusual for a New Yorker to have *no* connection to Trash Talk NYC. Mental model: "Are you clubbing?" the way people say "Are you going to the gym?"

The hero of the brand is **the person who shows up** — not the founder. David is an important founder/organizer, but the movement should read as community-led, not founder-led.

## 2. Top priorities (success criteria)

Every page and component decision should be weighed against these, in order:

1. **Capture user emails** (volunteer signup, contact form, any future newsletter capture)
2. **Get users to sign up for cleanup events**
3. **Keep users on-site** rather than redirecting them away to external platforms
4. **Route users to our socials** (@trashtalk_nyc on Instagram, TikTok)

When a layout choice is ambiguous, default to the option that makes these actions more visible and more frequent, not the option that looks cleanest with them removed.

Note the tension between #3 and #4: social links are an intentional, deliberate exit from the site, unlike a generic external redirect. Make social routing visible and easy (nav, footer, inline callouts) without it competing with or overshadowing the on-site actions in #1 and #2 — social links support the brand's cultural-normalization goal, they aren't the primary conversion target.

## 3. Domain terminology & brand voice

- Say **"Join"** — never "Become a Member" or "Membership"
- Don't describe the organization primarily as a nonprofit
- Avoid spectator-framing language. Examples from an actual language review on this project:
  - Avoid: *"We're keeping New York clean"* — creates a spectator who thinks "they got it, I'm untethered"
  - Prefer: *"New Yorkers Take Care of New York"* / *"We're getting cleaner and cleaner"*
  - Avoid entirely: guilt-tripping copy, "Attend events," "Support us," "Watch us"
- When evaluating any copy or CTA, ask: does this make the *viewer* feel like a participant, or a spectator?
- A real piece of subjective feedback this project has used before: *"This feels too corporate"* → translates to adjusting copy/placeholder text/imagery/tone, not adding more polish. Corporate-feeling output is a miss, not a safe default.
- Instagram is always written as **@trashtalk_nyc**, never generic "Instagram." TikTok stays as "TikTok."

## 4. Visual system

**Palette — mostly locked.** Use these as the base palette:

```
--charcoal:     #1c1c22
--off-white:    #f7f4ed
--cream:        #ede9df
--yellow:       #f5d000
--yellow-dark:  #c9a900
--purple:       #6b3fa0
--purple-light: #9b5de5
--purple-pale:  #f0e8ff
--green:        #2a6b2a
--green-light:  #3d9e3d
--gray:         #7a7a8a
--warm-gray:    #b0aca2
```

Everything here is fixed **except purple** — feel free to propose alternate purples/purple ranges. Do not propose alternatives to charcoal, off-white, cream, yellow, or green.

**Typography — fully open.** Current site uses Nunito (body) + Space Mono (eyebrow/label accents), but this is not a constraint. Propose whatever serves the brand voice.

**Imagery — real photography, warm/filmic/nostalgic tone.** Direction is real photos of actual events and volunteers (not stock, not generic), aiming for a warm, slightly filmic, nostalgic feel that reads as NYC community pride. Known constraint: the only photos available today are iPhone photos — there is no professional photo library yet, so don't assume polished source material exists. Propose a treatment (grading, grain, framing) that can make iPhone photos read as intentional rather than amateur.

Illustration, iconography, and animation are **on the table**, especially motifs around litter, trash, and urban beautification — this doesn't have to be photo-only.

## 5. Pages

Page names (use exactly these, including the existing "Club Events" naming, not generic "Events"):

- **Home**
- **Club Events**
- **About**
- **Contact**

Beyond these four names and their core purpose (homepage intro + next event, event discovery, organization/community story, contact + partnership inquiry), the information architecture is open — propose new sections, page structure, or nav organization if it serves the visual direction.

## 6. Bilingual requirement (English / Spanish)

Build a **working English/Spanish toggle** in the prototype itself — this is not deferred to a later phase. Avoid baking copy into images or anything else that would prevent a string from being swapped per-language. Spanish-language support is treated as a core product requirement for this organization, not a stretch feature.

## 7. Dynamic content

**Eventbrite — live connection, decided 2026-06-22 (deviation from original static-mocks plan).** Connected using a separate Eventbrite API token scoped to a dedicated "Lovable prototype" app, not the production token used by `netlify/functions/next-event.mjs` — isolates blast radius if Lovable's credential storage is ever compromised. The token must be stored server-side (Lovable/Supabase secret + edge function), never embedded in client-side React code, matching how the production Netlify Function already keeps it off the browser.

- **Contact/volunteer forms (normally Web3Forms):** build the form UI and field set, but it does not need to submit anywhere real — static mock, no live wiring.
- **Donations (normally GoFundMe, plus Buy Me a Coffee linked from Instagram):** a donation callout block, visually represented, not a real embed or payment flow — static mock, no live wiring.

If Lovable's Supabase backend is used for anything beyond the Eventbrite proxy, keep it to throwaway/mock data — it is not where this project's real data will live.

## 8. Guardrails

- **Don't rename or reposition the brand.** "NYC Cleanup Club" identity, "Join" language, the @trashtalk_nyc handle, and the non-charity/non-spectator framing are fixed regardless of how the visuals change.
- **Don't invent or substitute integrations.** Don't propose replacing Eventbrite, Web3Forms, or GoFundMe with Lovable-native alternatives (e.g., its own booking flow, its own payment processor) — those are team decisions, not something a prototyping tool should pre-empt.

---

## Open items / not decided here

- Exact filmic/nostalgic photo treatment (grading, grain) — left for Lovable to propose and for the team to react to visually, not pre-specified.
- Whether IA changes proposed by Lovable get adopted — evaluate per-proposal, not pre-approved.

## After the prototype

Per the agreed workflow: once a visual direction is chosen in Lovable, it gets manually rebuilt into this repo's Astro codebase (`src/pages`, `src/layouts`, `src/components`), where:
- Real integrations (Eventbrite via `netlify/functions/next-event.mjs`, Web3Forms, GoFundMe) get wired in for real, not mocked
- Interactive pieces become Astro islands (`client:load`/`client:idle`/`client:visible`) rather than a fully-hydrated React tree, which is where the actual performance gain over the Lovable prototype comes from
- The bilingual toggle gets reconciled with whatever pattern is already established in `BaseLayout.astro`
