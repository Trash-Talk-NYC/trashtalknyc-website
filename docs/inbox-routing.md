# Inbox routing for contact-page inquiries

Every Contact-page form (General, Partner, Sponsor, Lead a Cleanup) emails the team when someone writes in.
Each category goes to its own inbox, so nothing sinks in one shared mailbox (captain, 2026-10-15 and 2026-10-19).
The email subject starts with the category's tag, so each owner can filter on it.
The rest of the subject is unchanged, for example `[Podcast] New collaboration inquiry — Jane Doe · Acme Org`.

| Category | Subject tag | Owner | Env var | Address |
|---|---|---|---|---|
| Sponsorships | `[Sponsorship]` | David Hernandez | `SPONSOR_NOTIFY_TO` | TODO_EMAIL |
| Content collaborations, content creation, influencers, corporate events, other partnerships | `[Content]` | David Hernandez | `PARTNER_CONTENT_NOTIFY_TO` | TODO_EMAIL |
| Podcast | `[Podcast]` | Cooper | `PODCAST_NOTIFY_TO` | TODO_EMAIL |
| Nonprofit partnerships | `[Nonprofit]` | Nandi | `NONPROFIT_NOTIFY_TO` | TODO_EMAIL |
| Lead a cleanup | `[Lead a cleanup]` | Nandi and Arianna | `LEAD_NOTIFY_TO` | TODO_EMAIL |
| General | `[General]` | Everyone | `CONTACT_NOTIFY_TO` | TODO_EMAIL |

## How a Partner inquiry is categorized

The Partner tile asks "What kind of partnership?" and that answer picks the category.
Podcast goes to `[Podcast]`, nonprofit partnership goes to `[Nonprofit]`, and every other answer goes to `[Content]`.
The answer list lives in `PARTNERSHIP_TYPES` in `src/lib/leadOptions.ts`.

## Setting the addresses

Each env var is set per Netlify deploy context (production, deploy-preview, branch-deploy).
A var can hold several addresses separated by commas, for example two owners of the Lead a cleanup inbox.
Notifications also need `CONTACT_NOTIFY_FROM` (a Brevo-verified sender) and `BREVO_API_KEY`.
Use a test inbox in the non-production contexts.

There is no fallback between categories.
If a category's var is unset, that inquiry sends no email and the site function logs `inquiry_notify_unconfigured` with the var's name.
The submission itself still succeeds and is saved in Brevo, so nothing is lost, but nobody is emailed about it.

## Where this lives in code

`notifyRoute` in `src/lib/server/notifyRouting.ts` maps each category to its tag and env var.
This document is the readable copy of that table, so update both together.
`buildInquiryEmail` in `src/lib/server/brevo.ts` builds the subject.
