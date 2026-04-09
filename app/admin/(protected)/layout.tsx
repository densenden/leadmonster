import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav email={user.email ?? ''} />
      <main className="ml-56 min-h-screen">
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
