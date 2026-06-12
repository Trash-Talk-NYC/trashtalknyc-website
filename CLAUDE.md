# Trash Talk NYC Website

## Project Overview

Trash Talk NYC is a community organization focused on:

* Organizing neighborhood cleanup events
* Recruiting volunteers
* Increasing donations
* Expanding events across all NYC boroughs
* Building partnerships with influencers, organizations, and companies
* Publishing media, impact reports, research, podcast appearances, and documentation

The website currently runs as a static site deployed on Netlify.

Current stack:

* Static HTML/CSS/JavaScript
* Netlify hosting
* Netlify Functions
* Eventbrite integration
* Web3Forms integration
* GoFundMe embeds

The long-term direction is Astro with TypeScript.

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
* Prefer named exports
* Explain architectural decisions
* Favor experiences that keep users on the site while still enabling event registration, donations, volunteering, and contact

---

## Migration Goal

Current state:

* Multiple standalone HTML pages
* Repeated navigation
* Repeated footer
* Repeated metadata
* Repeated styling patterns

Target state:

* Astro project
* Shared layouts
* Shared components
* TypeScript
* Reusable content architecture

The migration should preserve existing functionality before introducing new features.

---

## Current Pages

Public pages:

* index
* about
* events
* contact

The previous debug.html page is deprecated and should not be recreated unless explicitly requested.

---

## Netlify

Deployment platform:

* Netlify

Current usage:

* Static site hosting
* Serverless functions

Existing function:

* netlify/functions/next-event.mjs

Function purpose:

* Fetch Eventbrite events
* Return upcoming events
* Return all events when requested

Assume Netlify deployment remains the deployment target unless instructed otherwise.

---

## Integrations

### Eventbrite

Eventbrite is a core dynamic integration and must be preserved during migration.

Used for:

* Event discovery
* Upcoming event display
* Homepage "Next Event" hero content
* Event location data
* Event registration links

Current implementation uses:

* Netlify Function
* Eventbrite Organizer API

Expected behavior:

* Newly published Eventbrite events should automatically appear on the website without manual updates.
* Past events should automatically move from upcoming events to a past events section when their date has passed.
* The homepage hero should display the next upcoming event based on the soonest event date.
* Event listings should support location-aware sorting when a user provides a location.
* Events should be sortable from nearest to farthest when location data is available.
* Event pages and event cards should include links to view the location in both Apple Maps and Google Maps whenever location information exists.
* Dynamic Eventbrite widgets should be preferred when practical to reduce unnecessary redirects and keep users engaged on the website.
* Any migration or refactor must verify that these behaviors continue to function correctly.

---

### Web3Forms

Used for:

* Contact form submissions
* Volunteer form submissions

Current forms:

* General contact
* Volunteer signup

Planned forms:

* Host an event
* Partnership inquiry

Future contact architecture should support clear pathways for:

* General questions
* Volunteer interest
* Partnership inquiries
* Event collaboration requests

While minimizing friction and keeping users on-site whenever possible.

---

### GoFundMe

Used for donation collection.

Existing embed should be preserved during migration.

Any refactor involving donations should explicitly verify that donation functionality remains operational.

Future donation architecture may also include Buy Me a Coffee or similar lightweight donation platforms.

Donation opportunities should remain visible and easily accessible throughout key user journeys.

---

## Internationalization

Spanish support is a major future priority.

Architecture decisions should avoid making future translation work difficult.

When designing content structures:

* Consider localization
* Avoid hardcoded repeated text
* Prefer centralized content where reasonable

Future content architecture should support English and Spanish versions of pages, content collections, and reusable UI components.

Spanish-language support should be treated as a core product requirement rather than an afterthought.

---

## Future Features

Expected future additions:

* Impact reports
* Research deep dives
* Public statements
* Documentation
* Media appearances
* Podcast appearances
* Press coverage
* Resource library
* Organizational portfolio and archive

The future "blog" should not be treated as a traditional chronological blog.

Instead, it should function as a flexible publishing platform for:

* Quantified impact reports
* Qualitative impact stories
* Research and analysis
* Organizational updates
* Public statements
* Community documentation
* Creative and artistic storytelling
* Portfolio-style showcases of Trash Talk NYC's work

Content architecture should support multiple content types rather than assuming all published content is a standard blog post.

Higher-priority future features include:

* Supplies needed for the next event component
* Improved volunteer onboarding flows
* Partnership inquiry workflows
* Enhanced event discovery and participation experiences
* Expanded bilingual content support

Future social media expansion:

* Social links should be designed to scale as posting workflows become more efficient.
* Additional social platforms may be added over time.
* Social architecture should support future growth without requiring major redesigns.

Future livestreaming support:

* The website should eventually support a centrally located "Current Livestream" experience.
* Livestream content should coexist with visible calls-to-action for:

  * Donations
  * Event registration
  * Volunteer signup
  * Contact and partnership inquiries
* Livestream experiences should prioritize keeping users engaged on the website.

Potential future additions:

* Search
* Embeddings
* AI-assisted content discovery

User accounts are not currently planned.

Do not introduce authentication systems without a clear business requirement.

---

## User Experience Principles

The website should prioritize keeping visitors engaged on-site whenever practical.

When evaluating features, consider:

* Can the user complete the task without leaving the website?
* Can important actions remain visible while consuming content?
* Can event registration, volunteering, donations, and contact remain within easy reach?

Priority actions should remain highly discoverable:

* Donate
* Volunteer
* Register for events
* Contact Trash Talk NYC
* Partnership inquiries

The website should reduce unnecessary navigation friction while maintaining accessibility and clarity.

---

## Required Process For Significant Changes

Before implementing major architectural changes:

1. Explain the proposed approach
2. Explain why it is appropriate
3. Identify risks
4. Identify migration impact

For migrations and major features:

1. Explain the testing strategy before implementation.
2. Identify regression risks.
3. Define what "done" means.
4. Explain how functionality will be verified after deployment.

---

## Testing Requirements

Testing is not optional.

For every meaningful change:

### Functional Testing

Verify:

* Navigation works
* Internal links work
* Forms submit successfully
* Eventbrite data loads
* Netlify functions work
* Donation embeds load
* Homepage next-event display works
* Upcoming events display correctly
* Past events display correctly
* Event registration links work
* Apple Maps links work
* Google Maps links work
* Location-based sorting works when applicable
* Supplies-needed components display correctly when implemented
* Livestream components display correctly when implemented

### Regression Testing

Verify that existing functionality still works after the change.

Special attention should be given to:

* Eventbrite integration
* Web3Forms submissions
* Donation functionality
* Navigation
* Responsive layouts
* User retention and on-site engagement flows

### Responsive Testing

Verify:

* Mobile
* Tablet
* Desktop

### Accessibility Review

Check:

* Semantic HTML
* Keyboard navigation
* Form labels
* Alt text
* Accessible link text
* Color contrast

### Performance Review

Watch for:

* Unnecessary JavaScript
* Large assets
* Duplicate code

### Definition of Done

A significant feature is not complete until:

* Functionality works as intended
* TypeScript passes
* Build succeeds
* Manual testing is completed
* Relevant automated tests are updated or added
* Mobile responsiveness is verified
* Accessibility considerations are reviewed
* Netlify deployment is verified
* Existing functionality remains operational

---

## Astro Migration Rules

Prefer:

* src/layouts
* src/components
* src/pages

Create reusable components for:

* Navigation
* Footer
* Hero sections
* Event cards
* Event lists
* Repeated content blocks
* Supplies-needed displays
* Donation callouts
* Livestream modules
* Social link groups

Use TypeScript.

Avoid client-side JavaScript unless necessary.

Leverage Astro islands only when interactivity is needed.

Preserve existing integrations before introducing new architecture.

Design content collections with future support for:

* Impact reports
* Research publications
* Public statements
* Media appearances
* Documentation
* Portfolio-style content

Do not assume all published content belongs in a traditional blog structure.

Design reusable components with future bilingual support in mind.

---

## Branch Naming

Use:

feature/

Examples:

feature/astro-migration

feature/contact-form

feature/spanish-translation

feature/partnership-form

feature/media-library

Bug fixes:

fix/

Examples:

fix/mobile-nav

fix/eventbrite-fetch

Documentation:

docs/

Examples:

docs/architecture

docs/content-guide

---

## Pull Requests

Every PR should explain:

* What changed
* Why it changed
* Risks
* Testing performed

Include verification commands when appropriate.

For significant changes, include:

* Manual testing steps
* Automated testing performed
* Deployment verification steps

---

## When Assisting

Act like a senior engineer helping evolve this project into a maintainable long-term platform.

Favor durable architecture over quick hacks.

Prioritize maintainability, testing, accessibility, future localization support, and strong user engagement.

When proposing changes:

* Explain tradeoffs
* Explain testing requirements
* Explain migration risks
* Consider how the change affects user retention and on-site engagement
* Ask questions before introducing complexity

When uncertain, ask questions before introducing complexity.
