'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useCookieConsent } from '@/components/cookies/CookieConsent'
import {
  initMetaPixel,
  isMetaPixelConfigured,
  trackMetaPageView,
} from '@/lib/tracking/meta-pixel'

/**
 * Loads Meta Pixel after marketing opt-in and sends PageView on route changes.
 * Must live inside CookieConsentProvider (see app/layout.tsx).
 */
export function MetaPixel() {
  const pathname = usePathname()
  const { isAllowed } = useCookieConsent()
  const marketingAllowed = isAllowed('marketing')
  const skipNextPageView = useRef(true)

  // Re-run when user accepts marketing cookies (banner or settings).
  useEffect(() => {
    function onConsent(event: Event) {
      const detail = (event as CustomEvent<{ marketing?: boolean }>).detail
      if (detail?.marketing && isMetaPixelConfigured()) {
        initMetaPixel()
        skipNextPageView.current = true
      }
    }

    window.addEventListener('lm:cookie-consent', onConsent)
    return () => window.removeEventListener('lm:cookie-consent', onConsent)
  }, [])

  // Initial load with stored consent, or first paint after opt-in.
  useEffect(() => {
    if (!marketingAllowed || !isMetaPixelConfigured()) return
    initMetaPixel()
    skipNextPageView.current = true
  }, [marketingAllowed])

  // SPA navigations — skip duplicate PageView right after init.
  useEffect(() => {
    if (!marketingAllowed || !isMetaPixelConfigured()) return
    if (skipNextPageView.current) {
      skipNextPageView.current = false
      return
    }
    trackMetaPageView()
  }, [pathname, marketingAllowed])

  return null
}
