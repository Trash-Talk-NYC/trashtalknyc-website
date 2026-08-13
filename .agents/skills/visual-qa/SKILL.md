---
name: visual-qa
description: How to review UI work on the trashtalknyc-website repo for visual quality before calling it done — a breakpoint matrix, a state checklist covering hover/interactive/empty/success states and the EN/ES language toggle, a table for translating subjective feedback ("feels weird", "too corporate") into actionable design language, and a closing report format that tells a human where to see the change and what to verify. Use this skill when building or reviewing any user-facing UI change on this site, when a human gives subjective visual feedback (including wording/label feedback), or before declaring any frontend work complete.
---

# Visual QA (trashtalknyc-website)

Passing tests does not imply good visual quality.
A UI change that compiles, type-checks, and passes every automated test can still be visually broken: overflowing at one width, missing a hover state, wrong in Spanish, or collapsing into an empty screen with no message.
This skill is the procedure for catching that before a human does: check the change at a fixed set of widths and states, translate any subjective feedback into concrete design dimensions, and close with a report that makes the change easy for a human to verify.

For how to run the site while doing this (which dev server, background processes, port etiquette), see the `e2e-testing` skill — this skill is about *what to look at*, that one is about *how to run it*.

## Breakpoint matrix

Verify every UI change at each of these widths, using real rendering (a browser or browser automation), not intuition about how CSS should behave:

| Width | Represents |
| --- | --- |
| 1440px | Desktop |
| 1280px | Laptop |
| 768px | Tablet |
| 375px | Mobile |

Three site-specific additions:

- The layout is fluid (`clamp()` tokens and `auto-fit`/`minmax()` grids, not stacked breakpoints), so also drag through intermediate widths rather than only sampling the four above — fluid layouts break *between* named breakpoints. Phone landscape (~844×390) is a known blind spot worth a look.
- Anything touching the nav, hero heights, or full-bleed sections: heroes use `svh` units, and `viewport-fit=cover` is deliberately absent (see the safe-area bullet in AGENTS.md — do not re-add it), so `env(safe-area-inset-*)` is always 0; check under device emulation, with a notched-device emulation if the change is chrome-adjacent.
- The header is a plain always-sticky nav on all widths — deliberately, after multiple failed positioning tricks (see the safe-area bullet in AGENTS.md); flag any reintroduction of transforms, negative offsets, or hide-on-scroll on the nav as a regression.

Do not verify only the width you developed at: most visual regressions live at the widths nobody was looking at.

## State checklist

At each width, check:

- Layout integrity — nothing overlapping, clipped, or misaligned.
- Visual hierarchy — the most important element reads as the most important; secondary content does not compete with it.
- Hover states — every interactive element visibly responds to hover.
- Interactive states — focus, active, disabled, and loading states exist and look intentional.
- Language toggle — check the change in both EN and ES. Static text swaps via `data-en`/`data-es` attributes; dynamic text (dates, tab-dependent copy) is re-rendered by the owning component on `onLanguageChange`, so toggle *after* interacting with the component, not just on page load. Spanish copy is usually longer — watch for new overflow.
- Overflow and wrapping — long text, long unbreakable strings, and large datasets wrap or truncate deliberately instead of breaking the layout.
- Spacing consistency — gaps, padding, and margins follow the fluid space tokens in `src/styles/global.css`, not ad hoc per-element values.
- Visual language — new UI reuses the site's "street poster / club zine" devices (press shadows `--press`/`--press-sm`, `.sticker` chips, `.sign-plate` titles, `.tape-seam`, `.grid-paper`) rather than introducing soft shadows or new decorative styles. Captain-approved exceptions are recorded in AGENTS.md and are not findings — the From the Founder byline portrait keeps its charcoal outline with no press shadow on purpose.
- Accessibility — contrast is sufficient, interactive elements are reachable by keyboard, and images and controls have accessible names.
- Empty states — the UI says something useful when there is no data (e.g. no upcoming events), not a blank region.
- Success and error states — the result of an action (form submit, tab switch) is visible, not inferable only from the absence of failure.

## Translating subjective feedback

Human subjective reactions are first-class product feedback, and the human is not required to use design terminology.
Never dismiss feedback for being vague; translate it into an actionable design dimension, asking one clarifying question when the mapping is genuinely ambiguous.

| Feedback | Translate into |
| --- | --- |
| "I don't like this." | Ask why once — corporate, crowded, generic, too playful — then map the answer using this table. |
| "This feels weird." | Determine which dimension is off: hierarchy, spacing, contrast, copy, affordance, density, or consistency. |
| "This feels too corporate." | Adjust tone: copy, placeholder text, imagery, and visual styling. |
| "This feels cluttered / busy." | Reduce density: fewer competing elements, more whitespace, clearer hierarchy. |
| "This looks generic / like a template." | Lean into the site's own visual language (see the state checklist) instead of defaults. |

Two rules that keep this loop productive:

- Do not require a complete design system before making iterative improvements; act on the translated feedback now.
- When feedback concerns wording — labels, buttons, tabs, headings, placeholders — treat it as audience architecture, not copyediting: identify who the language is for and what mental model it creates, then explain why the proposed wording is better. Two real examples from this project: "I don't like Acme Co." → avoid placeholder examples that imply status or exclusivity; "I don't like Work With Us." → avoid language that implies employment when the intent is collaboration.

## Closing report

A UI change is not complete until a human can easily verify it.
End every UI change with a short report answering:

1. Where to see it — the URL or route, and whether it is local only, committed, pushed, in a deploy preview, or in production.
2. What visually changed — a plain-language description of the intended difference, with screenshots when you produced them.
3. What to verify — which interactions to try (including the language toggle if the change has text) and which of the widths and states above matter most for this change.
4. What is already verified — which checks from this skill you completed, and which still need human eyes (subjective tone and taste always do).
