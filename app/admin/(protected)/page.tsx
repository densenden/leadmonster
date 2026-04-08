import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/app/admin/_components/sign-out-button'

// Admin dashboard placeholder — Server Component.
// Displays the logged-in admin's email and a sign-out button.
// Full dashboard UI is implemented in later specs.
export default async function AdminDashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-heading text-3xl text-[#333333] mb-4">Admin Dashboard</h1>
      <p className="text-[#666666] mb-8">
        Willkommen, <span className="font-semibold">{user?.email}</span>
      </p>
      <SignOutButton />
    </div>
  )
}
