import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { lookupRedirect } from '@/lib/redirects/lookup'

// Middleware Aufgaben:
// 1. Redirect-Tabelle abfragen — Vertriebs-pflegbare 301/302 vor jedem Request.
// 2. Supabase-Session-Cookie auffrischen, damit Auth-State über Navigationen
//    erhalten bleibt. Auth-Guards selbst leben in app/admin/(protected)/layout.tsx.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey!,
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

  // ─── Redirect-Lookup ──────────────────────────────────────────────────
  // Nur für GET/HEAD-Requests an öffentliche Pfade. /admin und /api werden
  // ausgenommen, damit interne Routen nicht aus Versehen umgeleitet werden.
  const { pathname } = request.nextUrl
  const isPublic = !pathname.startsWith('/admin') && !pathname.startsWith('/api')
  const isReadable = request.method === 'GET' || request.method === 'HEAD'
  if (isPublic && isReadable) {
    try {
      const hit = await lookupRedirect(supabase, pathname)
      if (hit) {
        // Self-Redirect-Guard: wenn `target` (modulo Trailing-Slash) gleich
        // dem aktuellen Pfad ist, würde Next.js auto-trailing-slash-normalisation
        // eine Endlosschleife auslösen. Lieber stillschweigend durchreichen.
        const stripped = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)
        if (stripped(hit.target) !== stripped(pathname)) {
          const target = new URL(hit.target, request.url)
          // Query-String und Hash der Anfrage übernehmen, damit UTM-Parameter
          // bei Redirects nicht verloren gehen.
          target.search = request.nextUrl.search
          return NextResponse.redirect(target, hit.status)
        }
      }
    } catch (err) {
      // Bei DB-Fehler: keine Redirect-Logik anwenden, Request normal durchreichen.
      console.error('redirect lookup failed', err)
    }
  }

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
