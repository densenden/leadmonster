# Specification: Admin Authentication (Supabase Auth)

## Goal
Protect all `/admin` routes behind a Supabase Auth session guard so that only authenticated admin users can access the admin area. Unauthenticated visitors are redirected to a login page with email/password sign-in.

## User Stories
- As an admin user, I want to sign in with my email and password so that I can access the protected admin area.
- As an unauthenticated visitor, I want to be redirected to the login page when I try to access any `/admin` route so that unauthorised access is prevented.

## Specific Requirements

**Supabase SSR client setup**
- Install `@supabase/ssr` and `@supabase/supabase-js` packages
- Create `lib/supabase/client.ts` — browser client using `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Create `lib/supabase/server.ts` — server client using `createServerClient` from `@supabase/ssr`, reading and writing cookies via the Next.js `cookies()` API (read-only in Server Components, read-write in Route Handlers/Server Actions)
- Both files use TypeScript strict mode; no `any` types

**Middleware for session refresh**
- Create `middleware.ts` at the project root
- Runs on every request matching `/admin/:path*` and all other non-static paths
- Uses `createServerClient` from `@supabase/ssr` to call `supabase.auth.getUser()` and refresh the session cookie on each request
- Returns the updated response with refreshed cookies so the session stays alive across navigations
- The `matcher` config must exclude `_next/static`, `_next/image`, `favicon.ico`, and other static assets

**Auth guard in `app/admin/layout.tsx`**
- Server Component — uses `lib/supabase/server.ts` to call `supabase.auth.getUser()`
- If no valid user is returned, calls `redirect('/admin/login')` from `next/navigation`
- Does not expose session errors to the client; fails silently and redirects
- Wraps child routes in a shared admin shell (minimal layout placeholder for now)
- The `/admin/login` route must be excluded from the auth guard — place the login page outside the layout guard scope or check the path explicitly

**Login page `app/admin/login/page.tsx`**
- Client Component (`'use client'`)
- Email and password fields with proper `type="email"` and `type="password"` attributes
- On submit calls `supabase.auth.signInWithPassword({ email, password })` using the browser client from `lib/supabase/client.ts`
- On success calls `router.push('/admin')` and `router.refresh()` to sync the server-side session
- On error displays a user-friendly German error message (e.g. "Ungültige Anmeldedaten. Bitte erneut versuchen.") — never expose raw Supabase error messages
- Form has `aria-label`, labels are associated with inputs via `htmlFor`/`id`, submit button shows loading state while the request is in flight
- No registration link — admin accounts are created manually in the Supabase dashboard only

**Admin dashboard placeholder `app/admin/page.tsx`**
- Server Component
- Renders a minimal authenticated dashboard page (heading + welcome message in German)
- Displays the logged-in user's email (read from the session via the server Supabase client)
- Contains a sign-out button that is a Client Component or calls a Server Action

**Sign-out functionality**
- Sign-out triggers `supabase.auth.signOut()` via the browser client in a Client Component, or via a Next.js Server Action using the server client
- After sign-out, redirect to `/admin/login`
- Call `router.refresh()` after sign-out to invalidate the cached server session

**TypeScript types**
- Define a `AdminUser` interface in `lib/supabase/types.ts` wrapping the Supabase `User` type: `{ id: string; email: string }`
- Export session-related types from this file for use across admin components

**Design — login page**
- Centered card layout, full-viewport height, white background (`background.page: #ffffff` from design tokens)
- Brand Blue (`#abd5f4`) as input focus ring color
- Primary action button uses Brand Blue fill
- Logo (`assets/logo.png`) displayed above the form
- Font: Nunito Sans (body) as defined in `design-tokens/tokens.json`
- Tailwind CSS utility classes only — no custom CSS files for this feature

## Existing Code to Leverage

**`design-tokens/tokens.json`**
- Source of truth for all color, typography, and spacing decisions
- Use `colors.primary.hex` (#abd5f4) for interactive states and the login button
- Use `colors.background.page` (#ffffff) for the login card background
- Use `typography.fonts.body.family` (Nunito Sans) for all text in admin UI

**`assets/logo.png`**
- Existing logo file — display in the login form header using Next.js `<Image>` component

## Out of Scope
- Public user registration or self-service password reset flow
- Role-based access control (all authenticated users have full admin access)
- OAuth / social login providers
- Two-factor authentication
- Email confirmation on sign-in
- Any admin sub-pages beyond the placeholder dashboard (covered in later specs)
- Rate limiting on the login endpoint
- Audit logging of login events
- Any changes to the public-facing (non-admin) routes
