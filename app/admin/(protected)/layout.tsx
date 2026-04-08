import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Server Component auth guard.
// Protects all routes within app/admin/(protected)/ from unauthenticated access.
// The login page at app/admin/login/page.tsx is outside this group and is NOT protected.
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated visitors silently — never expose auth errors.
  if (!user) {
    redirect('/admin/login')
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>
}
