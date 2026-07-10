'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'

export interface MobileNavLink {
  href: string
  label: string
  external?: boolean
}

export interface MobileNavCta {
  href: string
  label: string
}

interface MobileNavDrawerProps {
  links: MobileNavLink[]
  cta?: MobileNavCta
  /** Extra class for CTA link (e.g. border-accent text-accent). */
  ctaClassName?: string
}

/** Hamburger menu + slide-in drawer for narrow viewports. */
export function MobileNavDrawer({ links, cta, ctaClassName = '' }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    setOpen(false)
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-navy hover:bg-[#e1f0fb] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Menü öffnen"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] bg-[#1a3252]/40"
            aria-label="Menü schließen"
            onClick={close}
          />
          <nav
            id={panelId}
            aria-label="Mobile Navigation"
            className="fixed inset-y-0 right-0 z-[90] w-[min(100vw-3rem,320px)] bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
              <span className="font-heading font-bold text-navy text-base">Menü</span>
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-navy hover:bg-[#e1f0fb] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Menü schließen"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto py-2">
              {links.map(link => (
                <li key={link.href + link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      className="flex items-center min-h-[48px] px-5 font-body text-base font-medium text-body hover:bg-[#e1f0fb] hover:text-accent transition-colors"
                    >
                      {link.label}
                      <span className="ml-1 text-xs opacity-60" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      onClick={close}
                      className="flex items-center min-h-[48px] px-5 font-body text-base font-medium text-body hover:bg-[#e1f0fb] hover:text-accent transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {cta && (
              <div className="p-4 border-t border-[#e2e8f0]">
                <Link
                  href={cta.href}
                  onClick={close}
                  className={`flex items-center justify-center w-full min-h-[48px] px-5 rounded-lg font-body text-base font-bold border-[1.5px] transition-all duration-200 ${ctaClassName}`}
                >
                  {cta.label}
                </Link>
              </div>
            )}
          </nav>
        </>
      )}
    </div>
  )
}
