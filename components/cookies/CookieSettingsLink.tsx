'use client'

import { useCookieConsent } from '@/components/cookies/CookieConsent'

interface Props {
  className?: string
}

export function CookieSettingsLink({ className = '' }: Props) {
  const { openSettings } = useCookieConsent()

  return (
    <button
      type="button"
      onClick={openSettings}
      className={className}
    >
      Cookie-Einstellungen
    </button>
  )
}
