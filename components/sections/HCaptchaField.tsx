'use client'

/**
 * hCaptcha checkbox widget for the lead form.
 * Loads the script once, renders the challenge, and reports the token upward.
 * Hard-fail UX: if the widget cannot load, parent must block submit.
 */
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark'
          size?: 'normal' | 'compact'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onHcaptchaApiLoad?: () => void
  }
}

const SCRIPT_ID = 'hcaptcha-script'
const SCRIPT_SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHcaptchaApiLoad'

export interface HCaptchaFieldProps {
  siteKey: string
  onTokenChange: (token: string | null) => void
  /** Called when widget becomes available (true) or fails to load (false). */
  onAvailabilityChange?: (available: boolean) => void
  resetSignal?: number
  className?: string
}

function loadHcaptchaScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.hcaptcha) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      window.onHcaptchaApiLoad = () => resolve()
      if (window.hcaptcha) resolve()
      return
    }

    window.onHcaptchaApiLoad = () => resolve()
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('hCaptcha script failed to load'))
    document.head.appendChild(script)
  })
}

export function HCaptchaField({
  siteKey,
  onTokenChange,
  onAvailabilityChange,
  resetSignal = 0,
  className,
}: HCaptchaFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function mount() {
      try {
        await loadHcaptchaScript()
        if (cancelled || !containerRef.current || !window.hcaptcha) return

        if (widgetIdRef.current) {
          try {
            window.hcaptcha.remove(widgetIdRef.current)
          } catch {
            // widget may already be gone
          }
          widgetIdRef.current = null
        }

        containerRef.current.innerHTML = ''
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'normal',
          callback: token => {
            onTokenChange(token)
            onAvailabilityChange?.(true)
            setLoadError(false)
          },
          'error-callback': () => {
            onTokenChange(null)
            setLoadError(true)
            onAvailabilityChange?.(false)
          },
          'expired-callback': () => {
            onTokenChange(null)
          },
        })
        setLoadError(false)
        onAvailabilityChange?.(true)
      } catch {
        if (!cancelled) {
          setLoadError(true)
          onTokenChange(null)
          onAvailabilityChange?.(false)
        }
      }
    }

    void mount()

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.hcaptcha) {
      onTokenChange(null)
      window.hcaptcha.reset(widgetIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  return (
    <div className={className} data-testid="hcaptcha-field">
      <div ref={containerRef} />
      {loadError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          Sicherheitscheck konnte nicht geladen werden. Bitte Seite neu laden oder anderen Browser
          / Netzwerk versuchen — Absenden ist ohne Captcha nicht möglich.
        </p>
      )}
    </div>
  )
}
