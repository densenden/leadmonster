import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { lookupRedirect } from '@/lib/redirects/lookup'

const AUTH_REFRESH_TIMEOUT_MS = 2_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ])
}

// Middleware Aufgaben:
// 1. Redirect-Tabelle abfragen — Vertriebs-pflegbare 301/302 vor jedem Request.
// 2. Supabase-Session-Cookie auffrischen (nur /admin), damit Auth-State erhalten bleibt.
//    Auth-Guards selbst leben in app/admin/(protected)/layout.tsx.
// DB calls are time-boxed — paused/slow Supabase must not hit MIDDLEWARE_INVOCATION_TIMEOUT.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !anonKey) {
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    anonKey,
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

  // Session refresh only where auth matters — skip on public pages to avoid
  // blocking every visitor on Supabase auth latency.
  if (pathname.startsWith('/admin')) {
    await withTimeout(supabase.auth.getUser(), AUTH_REFRESH_TIMEOUT_MS)
  }

  return response
}

export const config = {
  matcher: [
    // Exclude _next/static, _next/image, favicon.ico, and common static asset extensions.
    // All other routes (including /admin/:path* and /api/:path*) are matched.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js)$).*)',
  ],
}
