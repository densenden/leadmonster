'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MonsterLogo } from '@/components/MonsterLogo'

const navItems = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/produkte', label: 'Produkte' },
  { href: '/admin/wissensfundus', label: 'Wissensfundus' },
  { href: '/admin/scraper', label: 'Scraper' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/einstellungen', label: 'Einstellungen' },
]

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-[#1a3252] flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <MonsterLogo size={34} showText textColor="white" />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#02a9e6]/20 text-white border-l-2 border-[#02a9e6]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-white/50 text-xs truncate mb-2">{email}</p>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-white/70 hover:text-white text-sm transition-colors"
        >
          Abmelden →
        </button>
      </div>
    </aside>
  )
}
