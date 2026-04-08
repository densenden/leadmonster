# Specification: Resend Email Automation

## Goal
After a lead is saved and Confluence-synced, `lib/resend/mailer.ts` sends a German-language confirmation email to the prospect and an internal notification to the sales team. Email failures are logged silently without blocking the lead save flow.

## User Stories
- As a prospect who submitted a lead form, I want to receive a German confirmation email so that I know my enquiry was received.
- As a sales team member, I want to receive an immediate notification email with all lead details and the Confluence page link so that I can follow up without opening another system.

## Specific Requirements

**`lib/resend/mailer.ts` — module structure**
- Export two async functions: `sendLeadConfirmation(lead: Lead)` and `sendSalesNotification(lead: Lead, produktName: string)`
- Instantiate the Resend SDK client once at module level using `process.env.RESEND_API_KEY`
- Both functions must be self-contained: they fetch their own template from DB and handle their own errors internally
- TypeScript strict mode; the `Lead` type is derived from the Supabase `leads` table schema
- File lives at `lib/resend/mailer.ts`, imported by `app/api/leads/route.ts` after Confluence sync completes

**Resend SDK integration**
- Use the official `resend` npm package (`import { Resend } from 'resend'`)
- Call `resend.emails.send({ from, to, subject, html })` for each email
- The `from` address must be a verified sender domain configured via an environment variable or a project-level constant — never hardcoded to a personal address
- On successful send, the function returns `true`; on any error it returns `false`

**Template source: `email_sequenzen` table**
- Fetch template with `produkt_id = lead.produkt_id` AND `trigger = 'form_submit'` AND `aktiv = true` AND `delay_hours = 0`
- Two separate query calls: one for the confirmation template (to lead), one for the notification template (to sales) — differentiate by a naming convention in `betreff` or add a `empfaenger_typ` column if needed; document the chosen approach clearly in code comments
- Use the Supabase server client (`lib/supabase/server.ts`) for all DB reads within `mailer.ts`
- If the query returns no rows, fall through to hardcoded default templates

**Fallback default templates (hardcoded)**
- Confirmation fallback subject: `"Ihre Anfrage ist bei uns eingegangen — [Produktname]"`
- Confirmation fallback body: A complete German HTML email including a thank-you message, lead's first name greeting, summary of submitted fields (Vorname, Nachname, E-Mail, Telefon, Interesse), and a closing sentence with expected response time
- Notification fallback subject: `"Neuer Lead: [Vorname] [Nachname] — [Produktname]"`
- Notification fallback body: HTML table containing all lead fields plus a direct link to the Confluence page if `confluence_page_id` is set
- Both fallback templates use inline CSS only (no external stylesheets) for maximum email client compatibility

**Confirmation email to lead**
- Recipient: `lead.email`
- Language: German throughout
- Content: personal greeting using `lead.vorname`, summary of what was submitted, statement that the team will be in touch, no pricing or binding offers
- HTML must be well-formed and readable in plain text clients

**Notification email to sales team**
- Recipient: read from `einstellungen` table using key `sales_notification_email`; fall back to `process.env.SALES_NOTIFICATION_EMAIL` if not set in DB
- Content: all lead fields as an HTML table, `intent_tag` and `zielgruppe_tag` highlighted, Confluence page URL constructed as `{confluence_base_url}/pages/{confluence_page_id}` when `confluence_page_id` is not null
- Subject includes product name and lead full name for quick triage in inbox

**`delay_hours` handling**
- Phase 1 scope: only process templates where `delay_hours = 0`; log a warning and skip any template with `delay_hours > 0`
- The `delay_hours` field is reserved for a future drip-sequence system; document this in a comment within `mailer.ts`

**Error handling — non-blocking**
- Wrap each `resend.emails.send()` call in its own `try/catch` block
- On catch: log with `console.error('[mailer] sendLeadConfirmation failed:', error)` — do not rethrow
- Both functions must always resolve (never reject) so that the lead save flow is never blocked
- The `resend_sent` flag is set to `true` only when both sends succeed; a partial failure leaves the flag as `false`

**`resend_sent` flag update**
- After both send calls succeed, update `leads` set `resend_sent = true` where `id = lead.id` using the Supabase server client
- The update is best-effort: if it fails, log the error but do not throw
- The chosen location for this update (inside `mailer.ts` or in `app/api/leads/route.ts`) must be documented in a comment

## Existing Code to Leverage

**`lib/supabase/server.ts` — Supabase server client**
- Provides an authenticated Supabase client with the service role key for server-side DB access
- Used for reading `email_sequenzen` and `einstellungen` tables, and for updating `resend_sent` on the `leads` row

**`einstellungen` table lookup pattern (established in `lib/confluence/client.ts`)**
- Query `einstellungen` by `schluessel`, read `.wert`; fall back to `process.env.*` if no row found
- Reuse this exact pattern for reading `sales_notification_email` from DB

**`app/api/leads/route.ts` — lead save and orchestration**
- This route already saves the lead to Supabase and calls the Confluence sync
- Resend email calls are added after `confluence_synced` is set to `true`; errors are swallowed internally and must not block the HTTP response

**`email_sequenzen` table schema**
- Fields: `id`, `produkt_id`, `trigger`, `betreff`, `html_body`, `delay_hours`, `aktiv`
- `betreff` is used directly as the email subject; `html_body` is used directly as the email HTML body when a DB template is found

## Out of Scope
- Drip sequences or scheduled emails (`delay_hours > 0` processing)
- Email preview or template editor in the admin UI
- Unsubscribe / opt-out links or GDPR email preference management
- Attachment support in emails
- Branded HTML email design system beyond the inline-CSS fallback
- Bounce handling or webhook processing from Resend
- Multiple notification recipients or distribution lists
- Email open/click tracking configuration
- Retry logic with exponential backoff for failed sends
