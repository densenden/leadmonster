import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Session refresh middleware.
// Runs on every non-static request to keep the Supabase session cookie
// alive across navigations. Redirect logic is intentionally NOT here —
// auth guards live in app/admin/(protected)/layout.tsx.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set(name, value)
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set(name, '')
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set(name, '', options as Parameters<typeof response.cookies.set>[2])
        },
      },
    },
  )

  // IMPORTANT: use getUser() not getSession() — getSession() is not safe server-side
  // as it reads from the cookie without re-validating with the Supabase auth server.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Exclude _next/static, _next/image, favicon.ico, and common static asset extensions.
    // All other routes (including /admin/:path* and /api/:path*) are matched.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js)$).*)',
  ],
}
