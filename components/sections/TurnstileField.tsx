'use client'

/**
 * Cloudflare Turnstile widget for the lead form.
 * Loads the script once, renders the challenge, and reports the token upward.
 *
 * Hard-fail UX: if the widget cannot load, parent must block submit
 * (bots were abusing soft-submit without a token).
 */
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'flexible' | 'compact'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onTurnstileApiLoad?: () => void
  }
}

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileApiLoad'

export interface TurnstileFieldProps {
  siteKey: string
  onTokenChange: (token: string | null) => void
  /** Called when widget becomes available (true) or fails to load (false). */
  onAvailabilityChange?: (available: boolean) => void
  /** Reset the widget (e.g. after a failed submit). */
  resetSignal?: number
  className?: string
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      window.onTurnstileApiLoad = () => resolve()
      if (window.turnstile) resolve()
      return
    }

    window.onTurnstileApiLoad = () => resolve()
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Turnstile script failed to load'))
    document.head.appendChild(script)
  })
}

export function TurnstileField({
  siteKey,
  onTokenChange,
  onAvailabilityChange,
  resetSignal = 0,
  className,
}: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function mount() {
      try {
        await loadTurnstileScript()
        if (cancelled || !containerRef.current || !window.turnstile) return

        // Remove previous widget if we re-render with a new site key.
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // ignore — widget may already be gone
          }
          widgetIdRef.current = null
        }

        containerRef.current.innerHTML = ''
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'light',
          size: 'flexible',
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
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
    // onTokenChange / onAvailabilityChange are stable enough via parent; siteKey is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      onTokenChange(null)
      window.turnstile.reset(widgetIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  return (
    <div className={className} data-testid="turnstile-field">
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
