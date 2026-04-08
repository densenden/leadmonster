# Task Breakdown: Resend Email Automation

## Overview
Total Tasks: 4 task groups, 21 sub-tasks

This feature adds automated German-language transactional emails to the lead flow using the Resend SDK. After a lead is saved and Confluence-synced in `app/api/leads/route.ts`, two emails are dispatched non-blockingly: a confirmation to the prospect and an internal notification to the sales team. Email templates are fetched from the `email_sequenzen` DB table with hardcoded fallbacks. All email failures are swallowed silently so that the lead save HTTP response is never blocked.

---

## Task List

### Package Installation

#### Task Group 1: Install Resend SDK
**Dependencies:** None — can be completed before any other task group

- [x] 1.0 Install and verify the Resend npm package
  - [x] 1.1 Write 2 focused tests confirming the Resend client can be instantiated and the `resend.emails.send` interface matches the expected signature
    - Test 1: Resend client instantiates without throwing when given a valid API key string
    - Test 2: Calling `resend.emails.send` with a mock transport resolves without error and accepts `{ from, to, subject, html }` shape
    - Mock the actual HTTP call — do not make live API calls in tests
    - Use Vitest as the test framework (aligns with project tech stack)
  - [x] 1.2 Install the `resend` package
    - Run: `npm install resend`
    - Confirm the package appears in `package.json` under `dependencies` (not `devDependencies`)
    - Verify TypeScript types are bundled with the package (no separate `@types/resend` needed)
  - [x] 1.3 Add `RESEND_API_KEY` and `SALES_NOTIFICATION_EMAIL` to `.env.example`
    - Add `RESEND_API_KEY=` as a blank placeholder
    - Add `SALES_NOTIFICATION_EMAIL=` as a blank placeholder
    - Add a comment above each key explaining its purpose
    - Do not add values — secrets belong in `.env.local` only
  - [x] 1.4 Run the 2 tests written in 1.1
    - Run ONLY these 2 tests, not the full suite
    - Confirm both pass before proceeding

**Acceptance Criteria:**
- The 2 tests from 1.1 pass
- `resend` is listed in `package.json` dependencies
- `.env.example` contains both new keys with explanatory comments

---

### Library Module

#### Task Group 2: Build `lib/resend/mailer.ts`
**Dependencies:** Task Group 1 (resend package must be installed)

- [x] 2.0 Implement the complete mailer module
  - [x] 2.1 Write 4 focused tests for the mailer module
    - Test 1: `sendLeadConfirmation` returns `true` when `resend.emails.send` resolves successfully (mock Resend and Supabase)
    - Test 2: `sendLeadConfirmation` returns `false` and does not throw when `resend.emails.send` rejects (non-blocking error handling)
    - Test 3: `sendSalesNotification` uses the DB `email_sequenzen` template when a matching row is found (mock Supabase to return a row)
    - Test 4: `sendSalesNotification` falls through to the hardcoded fallback template when no DB row is found (mock Supabase to return no rows)
    - Mock all external calls: Resend SDK, Supabase server client (`lib/supabase/server.ts`)
    - Do not test every inline-CSS detail of the fallback HTML — only assert subject line and recipient fields
  - [x] 2.2 Create `lib/resend/mailer.ts` and define the `Lead` type
    - Derive the `Lead` interface directly from the `leads` table schema (fields: `id`, `produkt_id`, `vorname`, `nachname`, `email`, `telefon`, `interesse`, `zielgruppe_tag`, `intent_tag`, `confluence_page_id`, `confluence_synced`, `resend_sent`, `created_at`)
    - Use TypeScript strict mode; no `any` types
    - Instantiate the Resend client once at module level: `const resend = new Resend(process.env.RESEND_API_KEY)`
    - Export only the two public async functions; keep all helpers unexported
    - Use `@/lib/supabase/server` for the Supabase import path alias
  - [x] 2.3 Implement the `email_sequenzen` template fetch helper
    - Create a private async function `fetchEmailTemplate(produktId: string, recipientType: 'confirmation' | 'notification')` 
    - Query filter: `produkt_id = produktId` AND `trigger = 'form_submit'` AND `aktiv = true` AND `delay_hours = 0`
    - Differentiate between confirmation and notification templates using a naming convention in `betreff`: confirmation templates contain the token `[BESTAETIGUNG]`; notification templates contain `[BENACHRICHTIGUNG]`
    - Document this naming convention prominently in a code comment above the function
    - Add a `console.warn` log for any rows found with `delay_hours > 0` (reserved for future drip sequences — document this in a comment)
    - Return `{ betreff: string, html_body: string } | null`
    - Use the Supabase server client from `lib/supabase/server.ts` — reuse the existing server client pattern
  - [x] 2.4 Implement `sendLeadConfirmation(lead: Lead)`
    - Call `fetchEmailTemplate(lead.produkt_id, 'confirmation')`
    - If template found: use `template.betreff` as subject, `template.html_body` as HTML body
    - If no template: use hardcoded fallback subject `"Ihre Anfrage ist bei uns eingegangen — [Produktname]"` and a complete German HTML email body
    - Fallback HTML body must include: personal greeting using `lead.vorname`, a summary table of submitted fields (`Vorname`, `Nachname`, `E-Mail`, `Telefon`, `Interesse`), a closing sentence with expected response time ("Wir melden uns innerhalb von 24 Stunden bei Ihnen.")
    - Fallback HTML must use inline CSS only — no external stylesheets or `<style>` blocks (maximum email client compatibility)
    - The `from` address must read from `process.env.RESEND_FROM_ADDRESS` — never hardcoded
    - Wrap `resend.emails.send()` in `try/catch`; on catch: `console.error('[mailer] sendLeadConfirmation failed:', error)`, return `false`; on success: return `true`
    - Function signature: `async function sendLeadConfirmation(lead: Lead): Promise<boolean>`
  - [x] 2.5 Implement `sendSalesNotification(lead: Lead, produktName: string)`
    - Fetch the sales notification recipient: query `einstellungen` by `schluessel = 'sales_notification_email'`; fall back to `process.env.SALES_NOTIFICATION_EMAIL` if no DB row found — reuse the exact same lookup pattern as `lib/confluence/client.ts`
    - Call `fetchEmailTemplate(lead.produkt_id, 'notification')`
    - If template found: use `template.betreff` as subject, `template.html_body` as HTML body
    - If no template: use hardcoded fallback subject `"Neuer Lead: [Vorname] [Nachname] — [Produktname]"` and an HTML table body
    - Fallback notification HTML body must include: all lead fields as an HTML table, `intent_tag` and `zielgruppe_tag` rendered with `font-weight: bold` inline style, and a Confluence page URL constructed as `{confluence_base_url}/pages/{confluence_page_id}` — only render the link when `lead.confluence_page_id` is not null
    - Read `confluence_base_url` from `einstellungen` table using key `confluence_base_url`; fall back to `process.env.CONFLUENCE_BASE_URL`
    - Fallback HTML must use inline CSS only
    - Wrap `resend.emails.send()` in `try/catch`; on catch: `console.error('[mailer] sendSalesNotification failed:', error)`, return `false`; on success: return `true`
    - Function signature: `async function sendSalesNotification(lead: Lead, produktName: string): Promise<boolean>`
  - [x] 2.6 Implement the `resend_sent` flag update
    - Place the flag update logic at the end of the orchestration call in `app/api/leads/route.ts` (NOT inside `mailer.ts`) — document this decision in a comment in `mailer.ts`: "resend_sent flag is updated by the caller in app/api/leads/route.ts after both send calls resolve"
    - The update runs only when both `sendLeadConfirmation` and `sendSalesNotification` return `true`
    - Update: `leads` set `resend_sent = true` where `id = lead.id` using the Supabase server client
    - Wrap the update in `try/catch`; on catch: `console.error('[mailer] Failed to update resend_sent flag:', error)`, do not throw
  - [x] 2.7 Add `RESEND_FROM_ADDRESS` to `.env.example`
    - Add the key with an explanatory comment: must be a verified sender domain on the Resend account
    - Do not add a value
  - [x] 2.8 Run the 4 tests written in 2.1
    - Run ONLY these 4 tests
    - Confirm all 4 pass before proceeding

**Acceptance Criteria:**
- All 4 tests from 2.1 pass
- `lib/resend/mailer.ts` exports exactly `sendLeadConfirmation` and `sendSalesNotification`
- Both functions always resolve (never reject) regardless of Resend SDK or DB errors
- Template fetch logic correctly differentiates confirmation vs. notification by `betreff` naming convention
- Fallback HTML templates use inline CSS only
- `RESEND_FROM_ADDRESS` added to `.env.example`

---

### API Integration

#### Task Group 3: Wire Mailer into `app/api/leads/route.ts`
**Dependencies:** Task Group 2 (mailer module must be complete)

- [x] 3.0 Integrate email dispatch into the lead API route
  - [x] 3.1 Write 2 focused tests for the lead API route email integration
    - Test 1: `POST /api/leads` completes with HTTP 200 even when `sendLeadConfirmation` throws internally (verify non-blocking behavior by mocking mailer to reject)
    - Test 2: `resend_sent` is set to `true` in Supabase when both mailer functions return `true` (mock mailer to return `true`, assert Supabase update call)
    - Mock the entire `lib/resend/mailer` module — do not test the mailer internals here
    - Mock Supabase calls and the Confluence sync
  - [x] 3.2 Import and call mailer functions in `app/api/leads/route.ts`
    - Add import: `import { sendLeadConfirmation, sendSalesNotification } from '@/lib/resend/mailer'`
    - Position the email calls after the Confluence sync block (`confluence_synced = true` is set)
    - Call both functions in parallel using `Promise.all([sendLeadConfirmation(lead), sendSalesNotification(lead, produktName)])` to minimize total latency
    - Destructure results: `const [confirmationSent, notificationSent] = await Promise.all([...])`
    - Add a comment explaining that errors are swallowed inside each mailer function and cannot surface here
  - [x] 3.3 Add the `resend_sent` flag update to the route
    - After `Promise.all` resolves, check `confirmationSent && notificationSent`
    - If both are `true`: update `leads` set `resend_sent = true` where `id = savedLead.id` using the Supabase server client
    - Wrap in `try/catch`; on catch: `console.error('[api/leads] Failed to update resend_sent flag:', error)`, continue without rethrowing
    - The HTTP response must already be formed before this block executes — or ensure the response is not delayed by this update (use `void` fire-and-forget only if the route architecture allows; prefer `await` with internal error handling)
  - [x] 3.4 Run the 2 tests written in 3.1
    - Run ONLY these 2 tests
    - Confirm both pass before proceeding

**Acceptance Criteria:**
- Both tests from 3.1 pass
- The lead API route returns HTTP 200 regardless of email send success or failure
- Both mailer functions are called with correct arguments after Confluence sync
- `resend_sent` flag is updated in Supabase only when both sends succeed
- No unhandled promise rejections introduced

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review all tests written in Task Groups 1-3
    - Review the 2 tests from Task Group 1 (Resend SDK instantiation)
    - Review the 4 tests from Task Group 2 (mailer module behavior)
    - Review the 2 tests from Task Group 3 (API route integration)
    - Total existing tests: 8 tests across all groups
  - [x] 4.2 Identify critical gaps for this feature only
    - Focus exclusively on the email automation feature (mailer module + API route integration)
    - Do NOT assess general application test coverage
    - Prioritize end-to-end integration points over unit-level gaps
    - Key gap candidates to evaluate:
      - The `einstellungen` DB lookup for `sales_notification_email` with a fallback to `process.env`
      - The Confluence URL construction in the notification fallback template when `confluence_page_id` is null vs. set
      - The `fetchEmailTemplate` function skipping `delay_hours > 0` rows with a `console.warn`
  - [x] 4.3 Write up to 4 additional targeted tests if gaps are confirmed
    - Maximum 4 new tests — do not write exhaustive coverage
    - Skip edge cases that are not business-critical (e.g., malformed HTML in DB template, network timeouts)
    - Each test must have a clear name explaining what is tested and the expected outcome
    - Mock all external dependencies (Resend SDK, Supabase, `process.env`)
  - [x] 4.4 Run all feature-specific tests
    - Run ONLY the tests related to this spec: tests from Task Groups 1-3 plus any added in 4.3
    - Expected total: 8-12 tests
    - Do NOT run the full application test suite
    - All tests must pass before this task group is marked complete

**Acceptance Criteria:**
- All feature-specific tests pass (8-12 tests total)
- Critical email automation workflows are covered: non-blocking failure, template fallback, flag update
- No more than 4 additional tests added in this group
- Test coverage focused exclusively on this spec's feature scope

---

## Execution Order

Recommended implementation sequence based on dependencies:

1. **Task Group 1 — Package Installation** (no dependencies)
   Install `resend`, add env keys to `.env.example`, verify SDK interface

2. **Task Group 2 — `lib/resend/mailer.ts`** (requires Task Group 1)
   Build the full mailer module: template fetch, confirmation send, notification send, fallback templates

3. **Task Group 3 — API Route Integration** (requires Task Group 2)
   Wire both mailer calls into `app/api/leads/route.ts`, add `resend_sent` flag update

4. **Task Group 4 — Test Review and Gap Analysis** (requires Task Groups 1-3)
   Review all 8 existing tests, identify and fill up to 4 critical gaps, run full feature test suite

---

## Key Design Decisions (Reference)

These decisions are captured here to guide implementation and must be documented in code comments as specified:

| Decision | Choice | Location to document |
|---|---|---|
| Template differentiation | `betreff` contains `[BESTAETIGUNG]` or `[BENACHRICHTIGUNG]` token | Comment above `fetchEmailTemplate` in `mailer.ts` |
| `resend_sent` flag update location | In `app/api/leads/route.ts` caller, not inside `mailer.ts` | Comment in `mailer.ts` and in the route |
| `delay_hours > 0` handling | Skip with `console.warn`; reserved for future drip sequences | Comment in `fetchEmailTemplate` |
| Sales notification recipient lookup | `einstellungen` table first, then `process.env.SALES_NOTIFICATION_EMAIL` | Comment in `sendSalesNotification` referencing the `lib/confluence/client.ts` pattern |
| Email parallelism | `Promise.all` for both sends to minimize latency | Comment in `app/api/leads/route.ts` |
| From address | `process.env.RESEND_FROM_ADDRESS` — never hardcoded | Comment in `sendLeadConfirmation` |
