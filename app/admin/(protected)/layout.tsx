import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import AdminNav from '@/app/admin/_components/admin-nav'

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const adminDb = createAdminClient()
  const { data: produkteRows } = await adminDb
    .from('produkte')
    .select('slug, name, status')
    .order('name', { ascending: true })

  const produkte = (produkteRows ?? [])
    .filter((p): p is { slug: string; name: string; status: string } => Boolean(p.slug))
    .map(p => ({ slug: p.slug, name: p.name, status: p.status }))

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav email={user.email ?? ''} produkte={produkte} />
      <main className="ml-56 min-h-screen">
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
