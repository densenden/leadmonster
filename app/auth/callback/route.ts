import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase email links (invite, recovery, magic link) land here with a `code`
// query param. We exchange it for a session cookie, then send the user onward.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_code`)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('auth callback failed', error.message)
    return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_failed`)
  }

  const safeNext = next.startsWith('/') ? next : '/admin'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
