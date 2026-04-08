# Specification: Lead Form & Lead Capture API

## Goal
Build a reusable `LeadForm` Client Component that collects visitor contact data and an `/api/leads` POST route that validates, persists, and tags every submission — forming the entry point for the full lead flow (Confluence, Resend).

## User Stories
- As a website visitor, I want to submit my contact details through a clear form so that an adviser can reach me about an insurance product.
- As a developer, I want to embed `LeadForm` on any public page with pre-set tags so that intent and audience context are captured without manual input.

## Specific Requirements

**`components/sections/LeadForm.tsx` — Client Component**
- Declare `'use client'` at the top; this component handles local form state and browser interactions.
- Props interface: `produktId: string`, `zielgruppeTag: string`, `intentTag: string` — all required, passed in by the embedding page.
- Fields: Vorname (text), Nachname (text), E-Mail (email, required), Telefon (tel, optional), Interesse (textarea, optional).
- Include a hidden honeypot field (`website`) that must remain empty; any value causes silent rejection on the server.
- Manage four exclusive UI states: `idle`, `loading`, `success`, `error` — driven by a single `status` state variable.
- On `success`: replace the form entirely with a German thank-you message; no page redirect or navigation change.
- On `error`: display a German inline error message below the submit button; form remains editable and resubmittable.
- Submit button shows a loading spinner and is disabled during `loading` state to prevent duplicate submissions.

**German field labels and error messages**
- Field labels: "Vorname", "Nachname", "E-Mail-Adresse", "Telefonnummer (optional)", "Ihr Interesse / Ihre Frage (optional)".
- Required field validation message: "Bitte geben Sie Ihre E-Mail-Adresse ein."
- Invalid email format message: "Bitte geben Sie eine gültige E-Mail-Adresse ein."
- Generic server error message: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
- Success message: "Vielen Dank! Wir melden uns in Kürze bei Ihnen."

**Accessibility**
- Every `<input>` and `<textarea>` must have an associated `<label>` via matching `htmlFor` / `id` attributes.
- Required fields carry `aria-required="true"` and `aria-describedby` pointing to their error message element.
- Error message elements use `role="alert"` so screen readers announce them on appearance.
- Submit button has a descriptive accessible label; spinner inside button is `aria-hidden="true"`.
- Minimum tap target size 44x44px on all interactive elements (mobile-first).

**Visual design aligned to design tokens**
- Form container: white background (`colors.background.page`), subtle shadow (`shadows.default`), zero border-radius (matching `borders.radius: 0px` from `tokens.json`).
- Primary submit button: `colors.primary.hex` (#abd5f4) background, dark text, full-width on mobile.
- Input focus ring uses `colors.link.base` (#36afeb) to stay on-brand.
- Typography: Nunito Sans body weight 300 for labels, Roboto bold for section heading above the form.
- Section padding follows token spacing: `spacing.block` (40px) vertical padding on the form wrapper.

**`/api/leads` POST route**
- Path: `app/api/leads/route.ts` — Next.js App Router Route Handler.
- Accepts `Content-Type: application/json`; parse body with `request.json()`.
- Validate with a Zod schema: `email` (required, valid email format), `vorname` / `nachname` / `telefon` / `interesse` (optional strings, trimmed, max lengths enforced), `produktId` / `zielgruppeTag` / `intentTag` (required strings).
- Return HTTP 422 with a structured error body on Zod failure; return HTTP 201 with `{ data: { id } }` on success.
- Use the Supabase **server client** (service role) from `lib/supabase/server.ts` for the DB insert — never the anon client.

**Supabase `leads` table insert**
- Map validated fields directly: `produkt_id`, `vorname`, `nachname`, `email`, `telefon`, `interesse`, `zielgruppe_tag`, `intent_tag`.
- `confluence_synced` and `resend_sent` default to `false` in the DB schema — do not set them here.
- On DB error, log the error server-side and return HTTP 500 with a generic German-safe error message.

**Honeypot bot prevention**
- The `website` field is included in the Zod schema as an optional string.
- If `website` is non-empty, return HTTP 200 with a fake success body (silent rejection) — do not write to DB.
- Field is visually hidden via CSS (`position: absolute; left: -9999px`) — not `display: none` or `aria-hidden` so bots still fill it.

**Rate limiting — IP-based**
- Track submission counts in a module-level `Map<string, { count: number; resetAt: number }>` (in-memory, per serverless instance).
- Allow a maximum of 3 submissions per IP address per 60-minute window.
- Extract IP from `x-forwarded-for` header (first value) or `request.headers.get('x-real-ip')` as fallback.
- On limit exceeded, return HTTP 429 with message `{ error: { code: "RATE_LIMIT_EXCEEDED", message: "Zu viele Anfragen. Bitte warten Sie eine Stunde." } }`.
- Rate limit check runs before Zod validation and DB insert.

**CSRF consideration**
- The route is a public POST endpoint (no auth session); rely on the `Content-Type: application/json` requirement combined with Vercel's CORS defaults to block simple-form cross-origin abuse.
- Include `X-Requested-With: XMLHttpRequest` header check on the server as an additional lightweight CSRF signal; reject requests missing it with HTTP 403.
- Document this decision as a comment in the route file for future upgrade path to token-based CSRF if needed.

**Response format**
- Success `201`: `{ "data": { "id": "<uuid>" } }` — matching the project-wide API response standard.
- Validation error `422`: `{ "data": null, "error": { "code": "VALIDATION_ERROR", "details": [...] } }`.
- Rate limit `429`: `{ "data": null, "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "..." } }`.
- Server error `500`: `{ "data": null, "error": { "code": "SERVER_ERROR", "message": "..." } }`.

## Existing Code to Leverage

**`lib/supabase/server.ts` — Supabase service role client**
- Planned in the project architecture as the server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY`.
- Import and call this client in `/api/leads/route.ts` to perform the `leads` table insert with elevated permissions.
- Never use the browser anon client (`lib/supabase/client.ts`) in an API route.

**`leads` table schema from CLAUDE.md**
- All columns are already defined: `id`, `produkt_id`, `vorname`, `nachname`, `email`, `telefon`, `interesse`, `zielgruppe_tag`, `intent_tag`, `confluence_synced`, `resend_sent`, `created_at`.
- The insert in `/api/leads` must map to these exact column names (snake_case).
- `confluence_page_id`, `confluence_synced`, `resend_sent` are left at their DB defaults — downstream jobs handle them.

**`design-tokens/tokens.json` — color, spacing, typography tokens**
- Primary color `#abd5f4`, secondary/accent `#ff9651`, link color `#36afeb` drive button and focus ring colors.
- Spacing values (`block: 40px`, `grid: 30px`) define form padding and field gap.
- Border radius `0px` applies to inputs and the form container (flat, sharp edges throughout).
- Font stack: Nunito Sans (body, weight 300/400) and Roboto (headings, weight 700) must be loaded in the root layout.

**`sterbegeld24plus-recreation/styles.css` — reference design**
- Navy/gold premium style shows the target aesthetic: white card on light background, strong CTA button contrast.
- The CSS variable `--radius: 12px` in the recreation file conflicts with `tokens.json` `0px` — follow `tokens.json` as the source of truth.
- Shadow style (`0 10px 15px -3px rgba(0,0,0,0.1)`) from the recreation can be used as the form card shadow.

## Out of Scope
- Confluence page creation — handled by a separate spec (`2026-04-06-confluence-crm-integration`).
- Resend email sending — handled by a separate spec (`2026-04-06-resend-email-automation`).
- Admin lead overview display — handled by `2026-04-06-admin-lead-overview`.
- File uploads or attachments in the lead form.
- Multi-step or wizard-style form layout.
- CAPTCHA or third-party bot verification services.
- Persistent rate limiting via Redis or database (in-memory only for this spec).
- Authentication or session requirements for form submission.
- Lead editing or deletion via API.
- Email validation via external deliverability API (format check only).
