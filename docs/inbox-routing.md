# Inbox routing for contact-page inquiries

Every Contact-page form (General, Partner, Brand Partner, Lead a Cleanup) emails the team when someone writes in.
Each category goes to its own inbox, so nothing sinks in one shared mailbox (captain, 2026-10-15 and 2026-10-19).
The addresses are the captain's of 2026-11-24.
The email subject starts with the category's tag, so each owner can filter on it.
The rest of the subject is unchanged, for example `[Podcast] New collaboration inquiry — Jane Doe · Acme Org`.

| Category | Subject tag | Inboxes | Env vars |
|---|---|---|---|
| General | `[General]` | contact@ | `CONTACT_NOTIFY_TO` |
| Brand Partner (stored as `sponsor`) | `[Brand partnership]` | partners@ | `SPONSOR_NOTIFY_TO` |
| Lead a cleanup | `[Lead a cleanup]` | events@ | `LEAD_NOTIFY_TO` |
| Partner: podcast | `[Podcast]` | podcast@ and partners@ | `PODCAST_NOTIFY_TO`, `PARTNER_CONTENT_NOTIFY_TO` |
| Partner: content collaboration, content creation, influencer, other | `[Content]` | partners@ | `PARTNER_CONTENT_NOTIFY_TO` |
| Partner: nonprofit partnership | `[Nonprofit]` | partners@ | `NONPROFIT_NOTIFY_TO` |
| Partner: corporate event | `[Content]` | partners@ and events@ | `PARTNER_CONTENT_NOTIFY_TO`, `LEAD_NOTIFY_TO` |

All addresses are @trashtalknyc.org.
Several vars hold the same inbox (partners@ sits behind three), and each address gets the email once.

## How a Partner inquiry is routed

The Partner tile asks "What kind of partnership?" and people may tick more than one kind.
The email goes once to every inbox of every kind they ticked, and the subject carries each kind's tag once, for example `[Podcast] [Content]`.
The answer list lives in `PARTNERSHIP_TYPES` in `src/lib/leadOptions.ts`, and each kind's inboxes in `PARTNERSHIP_ROUTES`.

## The podcast keyword copy

A Partner or Brand Partner message that mentions "podcast" (any case, or the Spanish "pódcast") also copies podcast@, even when nobody ticked Podcast.
The subject tag stays the same.
General messages and Lead a cleanup requests never get this copy.

## Setting the addresses

Each env var is set per Netlify deploy context (production, deploy-preview, branch-deploy), and the site reads it at runtime.
A var can hold several addresses separated by commas.
Notifications also need `CONTACT_NOTIFY_FROM` (a Brevo-verified sender) and `BREVO_API_KEY`.
Use a test inbox in the non-production contexts.

There is no fallback between inboxes.
If one of an inquiry's vars is unset, that inbox gets nothing and the site function logs `inquiry_notify_unconfigured` with the var's name; the inquiry's other inboxes still get the email.
The submission itself always succeeds and is saved in Brevo, so nothing is lost even when nobody is emailed.

## Where this lives in code

`notifyRoute` in `src/lib/server/notifyRouting.ts` maps each inquiry to its tag and env vars, and `resolveRecipients` turns those into one deduped address list.
This document is the readable copy of that table, so update both together.
`buildInquiryEmail` in `src/lib/server/brevo.ts` builds the subject.
