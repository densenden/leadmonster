'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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

interface ProduktLink {
  slug: string
  name: string
  status: string
}

export default function AdminNav({
  email,
  produkte = [],
}: {
  email: string
  produkte?: ProduktLink[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [frontpageOpen, setFrontpageOpen] = useState(false)

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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Frontpage with collapsible product submenu */}
        <div>
          <div className="flex items-stretch">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center px-3 py-2 rounded-l-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Frontpage <span className="ml-1 text-xs opacity-70">↗</span>
            </Link>
            <button
              type="button"
              onClick={() => setFrontpageOpen(o => !o)}
              aria-label={frontpageOpen ? 'Produkte einklappen' : 'Produkte ausklappen'}
              aria-expanded={frontpageOpen}
              className="px-2 rounded-r-lg text-white/60 hover:text-white hover:bg-white/10 text-xs transition-colors"
            >
              {frontpageOpen ? '▾' : '▸'}
            </button>
          </div>

          {frontpageOpen && produkte.length > 0 && (
            <ul className="mt-1 ml-3 border-l border-white/10 pl-2 space-y-0.5">
              {produkte.map(p => (
                <li key={p.slug}>
                  <Link
                    href={`/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] opacity-50 shrink-0">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {frontpageOpen && produkte.length === 0 && (
            <p className="mt-1 ml-5 text-xs text-white/40">Keine Produkte</p>
          )}
        </div>

        <div className="my-2 border-t border-white/10" />

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
