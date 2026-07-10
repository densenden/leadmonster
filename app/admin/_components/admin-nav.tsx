'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MonsterLogo } from '@/components/MonsterLogo'

const navItems = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/onboarding', label: 'Erste Schritte' },
  { href: '/admin/produkte', label: 'Produkte' },
  { href: '/admin/produkt-typen', label: 'Versicherungsarten' },
  { href: '/admin/tarife', label: 'Tarife' },
  { href: '/admin/bilder', label: 'Bilder' },
  { href: '/admin/wissensfundus', label: 'Wissensfundus' },
  { href: '/admin/redaktion', label: 'Redaktion' },
  { href: '/admin/trust', label: 'Trust' },
  { href: '/admin/scraper', label: 'Scraper' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/redirects', label: 'Redirects' },
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
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const sidebarContent = (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <MonsterLogo size={34} showText textColor="white" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div>
          <div className="flex items-stretch">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center px-3 py-2 rounded-l-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors min-h-[44px]"
            >
              Frontpage <span className="ml-1 text-xs opacity-70">↗</span>
            </Link>
            <button
              type="button"
              onClick={() => setFrontpageOpen(o => !o)}
              aria-label={frontpageOpen ? 'Produkte einklappen' : 'Produkte ausklappen'}
              aria-expanded={frontpageOpen}
              className="px-2 rounded-r-lg text-white/60 hover:text-white hover:bg-white/10 text-xs transition-colors min-h-[44px]"
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
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors min-h-[40px]"
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
              className={`flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-white/50 text-xs truncate mb-2">{email}</p>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-white/70 hover:text-white text-sm transition-colors min-h-[44px]"
        >
          Abmelden →
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 bg-[#1a3252] px-4 py-3 border-b border-white/10">
        <MonsterLogo size={28} showText textColor="white" />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-white hover:bg-white/10 transition-colors"
          aria-label="Admin-Menü öffnen"
          aria-expanded={mobileOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            aria-label="Menü schließen"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-[#1a3252] flex flex-col shadow-xl">
            <div className="flex items-center justify-end px-3 py-2 border-b border-white/10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-white hover:bg-white/10"
                aria-label="Menü schließen"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-56 bg-[#1a3252] flex-col z-30">
        {sidebarContent}
      </aside>
    </>
  )
}
