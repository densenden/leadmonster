# Task Breakdown: Admin Authentication (Supabase Auth)

## Overview
Total Tasks: 24
Task Groups: 4

---

## Task List

### Infrastructure Layer

#### Task Group 1: Supabase SSR Client Setup
**Dependencies:** None

- [x] 1.0 Complete Supabase SSR client infrastructure
  - [x] 1.1 Write 2-4 focused tests for Supabase client utilities
    - Test that `createBrowserClient` is called with the correct env vars in `client.ts`
    - Test that `createServerClient` in `server.ts` reads and writes cookies using the Next.js `cookies()` API
    - Test that calling `server.ts` without valid cookies returns `null` for `getUser()`
    - Mock `@supabase/ssr` and Next.js `cookies()` — no real network calls
  - [x] 1.2 Install required packages
    - Run `npm install @supabase/ssr @supabase/supabase-js`
    - Verify versions are compatible with Next.js 14 App Router
  - [x] 1.3 Create `lib/supabase/client.ts` — browser client
    - Use `createBrowserClient` from `@supabase/ssr`
    - Pass `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - TypeScript strict mode — no `any` types
    - Export as `createClient()` factory function (not a singleton, per SSR best practice)
  - [x] 1.4 Create `lib/supabase/server.ts` — server client
    - Use `createServerClient` from `@supabase/ssr`
    - Pass `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - Implement cookie adapter using Next.js `cookies()` API:
      - `get(name)` — reads cookie by name
      - `set(name, value, options)` — writes cookie (only works in Route Handlers / Server Actions, not in read-only Server Components; handle the `TypeError` silently)
      - `remove(name, options)` — removes cookie (same constraint)
    - TypeScript strict mode — no `any` types
    - Export as `createClient()` factory function
    - Also exports `createAdminClient()` — service role client using direct `createSupabaseClient` with `SUPABASE_SERVICE_ROLE_KEY`
  - [x] 1.5 Create `lib/supabase/types.ts` — shared TypeScript types
    - Define `AdminUser` interface: `{ id: string; email: string }`
    - Re-export as named exports for use across admin components
    - Import `User` from `@supabase/supabase-js` and use it as the base type constraint
  - [x] 1.6 Verify `.env.local` contains required keys
    - Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present
    - Confirm `.env.example` lists these keys with empty values (already in place per CLAUDE.md)
  - [x] 1.7 Ensure client infrastructure tests pass
    - Run ONLY the 2-4 tests written in 1.1
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-4 tests written in 1.1 pass
- `lib/supabase/client.ts` exports a typed `createClient()` function using `createBrowserClient`
- `lib/supabase/server.ts` exports a typed `createClient()` function using `createServerClient` with cookie adapter
- `lib/supabase/types.ts` exports `AdminUser` interface
- No TypeScript errors (`tsc --noEmit` passes)

---

### Middleware Layer

#### Task Group 2: Session Refresh Middleware
**Dependencies:** Task Group 1

- [x] 2.0 Complete Next.js session refresh middleware
  - [x] 2.1 Write 2-3 focused tests for middleware behavior
    - Test that the middleware calls `supabase.auth.getUser()` on a matched route
    - Test that the middleware returns the response with refreshed `Set-Cookie` headers
    - Test that the middleware does NOT run on `_next/static`, `_next/image`, and `favicon.ico` paths (matcher exclusion)
    - Mock `@supabase/ssr` and `NextResponse`
  - [x] 2.2 Create `middleware.ts` at the project root
    - Import `createServerClient` from `@supabase/ssr` and `NextResponse` from `next/server`
    - Create a Supabase client inside the middleware function using the request's cookie store
    - Call `supabase.auth.getUser()` to trigger session cookie refresh — do NOT use `getSession()` (it is not safe server-side per Supabase docs)
    - Return the updated `NextResponse` with refreshed cookies so the session persists across navigations
    - Do NOT add redirect logic here — redirect logic lives exclusively in `app/admin/layout.tsx`
  - [x] 2.3 Configure the `matcher` export
    - Exclude: `_next/static`, `_next/image`, `favicon.ico`, and common static asset extensions (`.png`, `.jpg`, `.svg`, `.ico`, `.css`, `.js`)
    - Match all other paths including `/admin/:path*` and `/api/:path*`
    - Use the recommended Supabase SSR middleware matcher pattern
  - [x] 2.4 Ensure middleware tests pass
    - Run ONLY the 2-3 tests written in 2.1

**Acceptance Criteria:**
- The 2-3 tests written in 2.1 pass
- `middleware.ts` exists at project root and is exported as default
- Session cookies are refreshed on every matched request
- Static assets are excluded from middleware execution
- No redirect logic in middleware (separation of concerns)

---

### Auth Guard & Admin Shell

#### Task Group 3: Auth Guard Layout and Admin Pages
**Dependencies:** Task Groups 1 and 2

- [x] 3.0 Complete admin auth guard and all admin page components
  - [x] 3.1 Write 3-5 focused tests for auth guard and admin pages
    - Test that `app/admin/layout.tsx` redirects to `/admin/login` when `getUser()` returns `null`
    - Test that `app/admin/layout.tsx` renders children when a valid user is returned
    - Test that the login form submits `signInWithPassword` with the correct credentials
    - Test that a failed login displays the German error message and does not navigate
    - Test that the sign-out action calls `signOut()` and redirects to `/admin/login`
    - Mock `lib/supabase/server.ts` and `lib/supabase/client.ts`
  - [x] 3.2 Create `app/admin/(protected)/layout.tsx` — server-side auth guard
    - Mark as a Server Component (no `'use client'` directive)
    - Call `createClient()` from `lib/supabase/server.ts` and run `supabase.auth.getUser()`
    - If `user` is `null` or an error is returned, call `redirect('/admin/login')` from `next/navigation`
    - If user is valid, render a minimal admin shell wrapper around `{children}`
    - The admin shell can be a plain `<div>` placeholder for now — full admin nav is out of scope
    - The `/admin/login` route must NOT be covered by this layout — place it at `app/admin/login/page.tsx` outside a nested layout or check the route explicitly
    - Never expose auth errors to the rendered HTML
  - [x] 3.3 Create `app/admin/login/page.tsx` — login form
    - Add `'use client'` directive at the top
    - Import `createClient` from `@/lib/supabase/client`
    - Import `useRouter` from `next/navigation`
    - Manage `email`, `password`, `isLoading`, and `errorMessage` with `useState`
    - Render a centered card layout using Tailwind utility classes
    - Display the logo using Next.js `<Image src="/assets/logo.png" alt="LeadMonster Logo" .../>` above the form
    - Form attributes: `aria-label="Admin Login"`, `onSubmit` handler
    - Email and password fields with proper labels, htmlFor, and focus ring
    - Submit button with Brand Blue fill and loading state
    - On success: call `router.push('/admin')` then `router.refresh()`
    - On error: set `errorMessage` to `"Ungültige Anmeldedaten. Bitte erneut versuchen."` — never pass through raw Supabase error strings
    - Error message rendered in a `<p role="alert">` element for screen reader support
    - No registration link rendered anywhere on this page
  - [x] 3.4 Create `app/admin/(protected)/page.tsx` — dashboard placeholder
    - Server Component (no `'use client'` directive)
    - Call `createClient()` from `@/lib/supabase/server` and run `supabase.auth.getUser()`
    - Display a German heading: `<h1>Admin Dashboard</h1>`
    - Display a welcome message including the user's email: `Willkommen, {user.email}`
    - Import and render the `SignOutButton` Client Component (created in 3.5)
    - Apply Tailwind utilities consistent with the design tokens (heading color `text-[#333333]`, body `text-[#666666]`)
  - [x] 3.5 Create `app/admin/_components/sign-out-button.tsx` — sign-out Client Component
    - Add `'use client'` directive
    - Import `createClient` from `@/lib/supabase/client` and `useRouter` from `next/navigation`
    - On click: call `supabase.auth.signOut()`, then `router.push('/admin/login')`, then `router.refresh()`
    - Render as a `<button>` with accessible label: `aria-label="Abmelden"`
    - Apply Brand Blue button styles consistent with the login page button
    - Handle loading state: disable button and show "Abmelden..." while sign-out is in progress
  - [x] 3.6 Ensure auth guard and admin page tests pass
    - Run ONLY the 3-5 tests written in 3.1
    - Verify redirect fires correctly when unauthenticated
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 3-5 tests written in 3.1 pass
- Unauthenticated requests to any `/admin` path redirect to `/admin/login`
- Authenticated users reach `/admin` and see their email address
- Login form submits correctly, shows loading state, and displays German error on failure
- Sign-out clears the session and redirects to `/admin/login`
- Login page is accessible: labels bound to inputs, `role="alert"` on error, keyboard-navigable

---

### Testing

#### Task Group 4: Test Review and Gap Analysis
**Dependencies:** Task Groups 1, 2, and 3

- [x] 4.0 Review existing tests and fill critical gaps only
  - [x] 4.1 Review all tests written in Task Groups 1-3
    - Review the 2-4 tests from Task Group 1 (Supabase client utilities)
    - Review the 2-3 tests from Task Group 2 (middleware)
    - Review the 3-5 tests from Task Group 3 (auth guard + login + sign-out)
    - Total existing tests: approximately 7-12 tests
  - [x] 4.2 Analyse coverage gaps for this feature only
    - Identified gaps: cookie adapter, admin client, redirect flow all covered
    - Three core flows covered: sign-in, session refresh, sign-out
  - [x] 4.3 Write up to 6 additional strategic tests to fill identified gaps
    - auth-clients.test.ts added: cookie adapter read test, browser client key test, admin client key test
    - Total: 17 tests across 5 test files covering all core auth flows
  - [x] 4.4 Run all feature-specific tests
    - All 17 tests pass across 5 test files
    - Three core auth flows covered: sign-in, session refresh, sign-out

**Acceptance Criteria:**
- All feature-specific tests pass (17 tests total)
- The three core auth flows are covered: sign-in, session refresh, sign-out
- No more than 6 additional tests added in this task group
- Testing is focused exclusively on this spec's requirements

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1** — Supabase SSR client setup (`lib/supabase/client.ts`, `server.ts`, `types.ts`) — no dependencies
2. **Task Group 2** — Middleware (`middleware.ts`) — depends on `lib/supabase/server.ts`
3. **Task Group 3** — Auth guard layout, login page, dashboard placeholder, sign-out button — depends on both library files and middleware
4. **Task Group 4** — Test review and gap analysis — depends on all previous groups

## File Creation Summary

| File | Type | Task |
|---|---|---|
| `lib/supabase/client.ts` | Browser Supabase client | 1.3 |
| `lib/supabase/server.ts` | Server Supabase client with cookie adapter + admin client | 1.4 |
| `lib/supabase/types.ts` | `AdminUser` interface and session types | 1.5 |
| `middleware.ts` | Session refresh middleware at project root | 2.2 |
| `app/admin/(protected)/layout.tsx` | Server Component auth guard | 3.2 |
| `app/admin/login/page.tsx` | Login form Client Component | 3.3 |
| `app/admin/(protected)/page.tsx` | Dashboard placeholder Server Component | 3.4 |
| `app/admin/_components/sign-out-button.tsx` | Sign-out Client Component | 3.5 |
