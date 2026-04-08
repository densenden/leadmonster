# Task Breakdown: Lead Form & Lead Capture API

## Overview
Total Tasks: 4 task groups, 26 sub-tasks

## Task List

---

### API Layer

#### Task Group 1: `/api/leads` POST Route
**Dependencies:** None — the API route has no frontend dependency and can be built and tested in isolation first.

- [x] 1.0 Complete the `/api/leads` POST route
  - [x] 1.1 Write 2–5 focused tests for the API route
    - Test 1: Valid payload returns HTTP 201 with `{ data: { id } }` envelope
    - Test 2: Missing required `email` field returns HTTP 422 with `VALIDATION_ERROR` code
    - Test 3: Non-empty `website` honeypot field returns HTTP 200 with fake success body and does NOT write to the DB
    - Test 4: Third submission from the same IP within 60 minutes returns HTTP 429 with `RATE_LIMIT_EXCEEDED` code
    - Test 5: Request missing `X-Requested-With` header returns HTTP 403
    - Mock the Supabase server client so no real DB calls are made during tests
    - Use Vitest; keep each test under 50ms
  - [x] 1.2 Create `app/api/leads/route.ts` with the `POST` export
    - Export only `POST`; any other method returns 405 implicitly via Next.js
    - Parse body with `request.json()`; accept `Content-Type: application/json` only
    - Add a JSDoc comment at the top of the file documenting the CSRF approach (lightweight `X-Requested-With` check + JSON-only content-type; note upgrade path to token-based CSRF)
  - [x] 1.3 Implement the `X-Requested-With` CSRF header check
    - Read `X-Requested-With` from `request.headers`
    - If missing or not equal to `XMLHttpRequest`, return `NextResponse.json` with HTTP 403 immediately
    - This check runs first, before rate limiting and validation
  - [x] 1.4 Implement IP-based rate limiting
    - Declare a module-level `Map<string, { count: number; resetAt: number }>` named `rateLimitStore`
    - Extract IP: `x-forwarded-for` first value, fallback to `x-real-ip`; use `'unknown'` if neither is present
    - Allow maximum 3 submissions per IP per 60-minute window (3600 seconds)
    - Expired windows reset the counter automatically on the next request from that IP
    - On limit exceeded return HTTP 429: `{ data: null, error: { code: "RATE_LIMIT_EXCEEDED", message: "Zu viele Anfragen. Bitte warten Sie eine Stunde." } }`
    - Rate limit check runs after the CSRF check but before Zod validation
  - [x] 1.5 Define and apply the Zod validation schema
    - Required fields: `email` (z.string().email()), `produktId` (z.string().min(1)), `zielgruppeTag` (z.string().min(1)), `intentTag` (z.string().min(1))
    - Optional fields with trim + max length: `vorname` (max 100), `nachname` (max 100), `telefon` (max 30), `interesse` (max 1000)
    - Honeypot: `website` (z.string().optional()) — no max length needed; any non-empty value triggers silent rejection
    - On Zod parse failure return HTTP 422: `{ data: null, error: { code: "VALIDATION_ERROR", details: [...] } }` where `details` maps `ZodError.issues` to `{ field, message }` pairs
  - [x] 1.6 Implement the honeypot silent rejection
    - After Zod parse succeeds, check if `website` is a non-empty string
    - If so, return HTTP 200 with `{ data: { id: "bot" } }` — do not insert into DB and do not log
    - This runs before the DB insert
  - [x] 1.7 Implement the Supabase insert
    - Import the server client from `lib/supabase/server.ts` (service role, never the anon client)
    - Insert into `leads` table with snake_case column names: `produkt_id`, `vorname`, `nachname`, `email`, `telefon`, `interesse`, `zielgruppe_tag`, `intent_tag`
    - Do not set `confluence_synced`, `resend_sent`, or `confluence_page_id` — leave at DB defaults
    - Select `id` from the insert result: `.insert({...}).select('id').single()`
    - On DB error: log the Supabase error with `console.error` server-side and return HTTP 500: `{ data: null, error: { code: "SERVER_ERROR", message: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut." } }`
    - On success return HTTP 201: `{ data: { id: result.id } }`
  - [x] 1.8 Ensure API route tests pass
    - Run ONLY the tests written in 1.1
    - All 5 tests must be green before moving on
    - Do NOT run the full test suite

**Acceptance Criteria:**
- All 5 tests from 1.1 pass
- CSRF check rejects requests without `X-Requested-With: XMLHttpRequest` with HTTP 403
- Rate limiter returns HTTP 429 after 3 submissions within 60 minutes from the same IP
- Zod validation returns HTTP 422 with field-level details on invalid input
- Honeypot-filled submissions return HTTP 200 without a DB write
- Valid submissions insert into `leads` with correct column mapping and return `{ data: { id } }` HTTP 201
- DB errors return HTTP 500 with a German-safe generic message; raw error never exposed to client
- Response envelopes match the spec exactly for all status codes

---

### Frontend Component

#### Task Group 2: `LeadForm.tsx` Client Component — Structure and State
**Dependencies:** Task Group 1 (API contract is defined and tested before the form is built against it)

- [x] 2.0 Complete the LeadForm component structure and state management
  - [x] 2.1 Write 2–4 focused tests for the LeadForm component
    - Test 1: Component renders all five visible fields plus the submit button with correct German labels
    - Test 2: Submitting with an empty email field displays the German required-field error message without making a fetch call
    - Test 3: A successful API response (mocked) replaces the form with the German thank-you message
    - Test 4: A failed API response (mocked) displays the German generic error message and keeps the form visible and editable
    - Use Vitest + React Testing Library; mock `fetch` globally in the test file
  - [x] 2.2 Scaffold `components/sections/LeadForm.tsx` with `'use client'` and props interface
    - Add `'use client'` as the first line
    - Define `LeadFormProps` interface: `produktId: string`, `zielgruppeTag: string`, `intentTag: string` — all required
    - Export the component as a named export; no default export
    - Add a JSDoc comment describing the component's purpose and expected props
  - [x] 2.3 Implement the four-state status machine
    - Declare `status` with `useState<'idle' | 'loading' | 'success' | 'error'>('idle')`
    - All conditional rendering (spinner, success block, error message, disabled state) derives exclusively from this single `status` variable — no secondary boolean flags
    - On `success`: render a `<div>` replacement block containing the thank-you message; the `<form>` element must not be present in the DOM
    - On `error`: keep the `<form>` in the DOM; render the German error message below the submit button inside a `<p role="alert">` element
  - [x] 2.4 Build the form field markup with controlled inputs
    - Use `useState` for each field value: `vorname`, `nachname`, `email`, `telefon`, `interesse`
    - Each field: `<label htmlFor="...">` + `<input id="...">` or `<textarea id="...">` — IDs must match `htmlFor` exactly
    - Field order: Vorname, Nachname, E-Mail-Adresse, Telefonnummer (optional), Ihr Interesse / Ihre Frage (optional)
    - Email input: `type="email"`, `required`, `aria-required="true"`, `aria-describedby="email-error"`
    - Telefon and Interesse: marked as optional in the label text; no `required` or `aria-required`
    - Email error element: `<p id="email-error" role="alert">` — always present in DOM but empty string when no error, to avoid layout shift; populated with the German message on client-side validation failure
    - Honeypot field: `<input type="text" name="website" tabIndex={-1} autoComplete="off" />` wrapped in a `<div>` styled with `position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden` — use a `style` prop, not Tailwind, to ensure the style is never purged
  - [x] 2.5 Implement the submit handler
    - Run client-side email presence check first; if empty, set a local `emailError` state and return early without fetch
    - Run client-side email format check (simple regex `/.+@.+\..+/`); if invalid, set `emailError` and return early
    - On passing client validation: set `status` to `'loading'`
    - Call `fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({...}) })`
    - Include all field values plus `produktId`, `zielgruppeTag`, `intentTag` from props in the request body
    - On `response.ok` (201): set `status` to `'success'`
    - On any non-ok response or thrown error: set `status` to `'error'`
  - [x] 2.6 Build the submit button with loading state
    - Button is `type="submit"`, full-width on mobile (`w-full`)
    - While `status === 'loading'`: disable the button (`disabled`), show an inline SVG spinner with `aria-hidden="true"`, button text changes to "Wird gesendet…"
    - While not loading: button text is "Jetzt Angebot anfordern"
    - Button has a visible accessible label at all times; the spinner does not replace the text — both are present and the spinner is hidden from assistive technology
  - [x] 2.7 Ensure LeadForm structure and state tests pass
    - Run ONLY the 4 tests written in 2.1
    - All 4 tests must be green before moving to Task Group 3
    - Do NOT run the full test suite

**Acceptance Criteria:**
- All 4 tests from 2.1 pass
- `'use client'` is the first line of the file
- All three props (`produktId`, `zielgruppeTag`, `intentTag`) are required and typed
- Status machine has exactly four states; no secondary boolean flags control rendering
- Success state removes the `<form>` from the DOM entirely
- Error state keeps the form editable; error message uses `role="alert"`
- Honeypot field is present in DOM and positioned off-screen via inline style (not Tailwind purge-risk)
- Submit button is disabled and shows accessible spinner during `loading` state
- `X-Requested-With: XMLHttpRequest` header is sent with every fetch call

---

### Frontend Styling

#### Task Group 3: LeadForm Visual Design and Accessibility Polish
**Dependencies:** Task Group 2 (component structure must exist before styles are applied)

- [x] 3.0 Complete LeadForm visual design and accessibility implementation
  - [x] 3.1 Write 2–3 focused tests for visual and accessibility concerns
    - Test 1: All `<input>` and `<textarea>` elements have a corresponding `<label>` with matching `htmlFor`/`id`
    - Test 2: Submit button minimum rendered height is at least 44px (tap target size)
    - Test 3: Email field carries `aria-required="true"` and `aria-describedby="email-error"`
    - Use Vitest + React Testing Library; query by role and attribute
  - [x] 3.2 Apply design-token-aligned Tailwind classes to the form container
    - Form wrapper: white background, shadow (`shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]`), `rounded-none` (0px border radius from `tokens.json`), vertical padding `py-[40px]` (matches `spacing.block: 40px`)
    - Inner field gap: `gap-[30px]` (matches `spacing.grid: 30px`) using a flex column layout
    - Section heading above the form: Roboto bold (apply `font-['Roboto'] font-bold` or the Tailwind alias configured in `tailwind.config.js`)
  - [x] 3.3 Style all input and textarea fields
    - Base classes: `w-full border border-gray-300 rounded-none px-3 py-2 text-sm font-light` (Nunito Sans weight 300 for labels and input text)
    - Focus ring: `focus:outline-none focus:ring-2 focus:ring-[#36afeb]` (link color from `tokens.json`)
    - Disabled state (during loading): `opacity-50 cursor-not-allowed` on inputs — set `disabled` on all inputs when `status === 'loading'`
    - Labels: `block text-sm font-light mb-1` (Nunito Sans weight 300)
    - Textarea `Interesse`: `min-h-[100px] resize-y`
  - [x] 3.4 Style the primary submit button
    - Background: `bg-[#abd5f4]` (primary color from `tokens.json`)
    - Text: dark (`text-gray-900`), bold, full-width on mobile (`w-full`), minimum height `min-h-[44px]` for tap target
    - Hover: `hover:brightness-95 transition-colors duration-200` — keep transitions subtle, no 0.8s animations on a form button
    - Disabled state: `disabled:opacity-60 disabled:cursor-not-allowed`
    - Rounded: `rounded-none` (0px radius)
  - [x] 3.5 Implement full accessibility attribute set
    - Email input: confirm `aria-required="true"` and `aria-describedby="email-error"` are present
    - Error `<p id="email-error" role="alert">`: always rendered, empty string when no error — do not conditionally mount/unmount this element
    - Server error `<p role="alert">`: rendered below submit button only when `status === 'error'`
    - Success `<div>` replacement block: apply `role="status"` so screen readers announce the thank-you message
    - All interactive elements (inputs, textarea, button) must reach the 44x44px minimum tap target — verify with the test from 3.1
    - Spinner SVG inside submit button: `aria-hidden="true"` and `focusable="false"`
  - [x] 3.6 Ensure visual and accessibility tests pass
    - Run ONLY the 3 tests written in 3.1
    - All 3 tests must be green
    - Do NOT run the full test suite

**Acceptance Criteria:**
- All 3 tests from 3.1 pass
- Form container uses 0px border radius, white background, token-defined shadow, and 40px vertical padding
- Input focus ring color is `#36afeb`
- Submit button background is `#abd5f4`, minimum height 44px, `rounded-none`
- All labels use Nunito Sans weight 300; section heading uses Roboto bold
- Error messages use `role="alert"`; success block uses `role="status"`
- Spinner is `aria-hidden="true"` and never receives focus
- No `display: none` or `aria-hidden` on the honeypot field wrapper

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1–3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Audit all tests from Task Groups 1–3
    - Review the 5 API route tests from Task 1.1
    - Review the 4 LeadForm structure/state tests from Task 2.1
    - Review the 3 accessibility tests from Task 3.1
    - Total existing coverage: 12 tests
  - [x] 4.2 Identify critical gaps for this spec only
    - Focus exclusively on the two deliverables: `LeadForm.tsx` and `app/api/leads/route.ts`
    - Identify any critical user-facing workflow not yet covered by the 12 existing tests
    - Candidate gaps to evaluate (add only if not already covered):
      - End-to-end happy path: form filled, submitted, success state shown (integration-level with mocked fetch)
      - Rate limit window reset: fourth submission after 61 minutes is accepted (unit test on the rate limit logic)
      - Telefon field optional: submit with empty Telefon succeeds (API test)
    - Do NOT assess test coverage for the rest of the application
    - Do NOT add tests for Confluence, Resend, or any out-of-scope item
  - [x] 4.3 Write a maximum of 6 additional strategic tests if gaps exist
    - Add no more than 6 new tests total; prefer fewer
    - Prioritize end-to-end component + API interaction over additional unit tests
    - Do not duplicate logic already covered by the 12 existing tests
    - Do not write tests for edge cases, performance, or i18n unless business-critical
  - [x] 4.4 Run all feature-specific tests and confirm they pass
    - Run ONLY the tests from 1.1, 2.1, 3.1, and 4.3
    - Expected total: 12–18 tests maximum
    - All tests must be green
    - Do NOT run the full application test suite

**Acceptance Criteria:**
- All feature-specific tests pass (12–18 tests total)
- No more than 6 additional tests added beyond the 12 from Task Groups 1–3
- Tests cover: API validation, honeypot, rate limiting, CSRF check, form rendering, four UI states, accessibility attributes
- Zero tests for out-of-scope functionality (Confluence, Resend, admin views)

---

## Execution Order

Recommended implementation sequence based on hard dependencies:

1. **API Layer — Task Group 1**: Build and test `/api/leads/route.ts` first. The API contract (request shape, response envelopes, status codes) is the authoritative interface the form component will call. Finalising it first means the frontend is built against a verified contract.
2. **Frontend Structure — Task Group 2**: Scaffold `LeadForm.tsx` with `'use client'`, props, state machine, fields, submit handler, and loading button. Style is not a concern yet; only functionality and correctness.
3. **Frontend Styling — Task Group 3**: Apply design-token-aligned Tailwind classes and complete all accessibility attributes. This is deliberately last because it has zero impact on correctness and can be iterated without touching logic.
4. **Test Review — Task Group 4**: Audit the 12 tests produced across groups 1–3, identify any critical uncovered workflow, and add a maximum of 6 targeted tests. Run the full feature-specific suite to confirm green.
