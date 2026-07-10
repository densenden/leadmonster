'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_STORAGE_KEY,
  acceptAllPreferences,
  categoryAllowed,
  necessaryOnlyPreferences,
  parseConsentJson,
  serializeConsent,
  type CookieConsentPreferences,
} from '@/lib/cookies/consent'

interface CookieConsentContextValue {
  preferences: CookieConsentPreferences | null
  bannerVisible: boolean
  settingsOpen: boolean
  acceptAll: () => void
  acceptNecessaryOnly: () => void
  openSettings: () => void
  closeSettings: () => void
  savePreferences: (next: Pick<CookieConsentPreferences, 'statistics' | 'marketing'>) => void
  isAllowed: (category: 'necessary' | 'statistics' | 'marketing') => boolean
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

function persistConsent(preferences: CookieConsentPreferences) {
  const serialized = serializeConsent(preferences)
  localStorage.setItem(CONSENT_STORAGE_KEY, serialized)
  document.cookie = [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}`,
    'Path=/',
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ].join('; ')
}

function readStoredConsent(): CookieConsentPreferences | null {
  const fromStorage = parseConsentJson(localStorage.getItem(CONSENT_STORAGE_KEY))
  if (fromStorage) return fromStorage

  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${CONSENT_COOKIE_NAME}=`))
  if (!match) return null
  const value = match.slice(CONSENT_COOKIE_NAME.length + 1)
  return parseConsentJson(decodeURIComponent(value))
}

function applyOptionalScripts(preferences: CookieConsentPreferences) {
  // Hook for future analytics / marketing tags — load only after opt-in.
  if (preferences.statistics || preferences.marketing) {
    window.dispatchEvent(
      new CustomEvent('lm:cookie-consent', { detail: preferences }),
    )
  }
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider')
  }
  return context
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isPublicSite = !pathname?.startsWith('/admin')

  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = readStoredConsent()
    setPreferences(stored)
    setBannerVisible(isPublicSite && stored === null)
    if (stored) applyOptionalScripts(stored)
    setReady(true)
  }, [isPublicSite])

  const commit = useCallback((next: CookieConsentPreferences) => {
    persistConsent(next)
    setPreferences(next)
    setBannerVisible(false)
    setSettingsOpen(false)
    applyOptionalScripts(next)
  }, [])

  const acceptAll = useCallback(() => commit(acceptAllPreferences()), [commit])
  const acceptNecessaryOnly = useCallback(() => commit(necessaryOnlyPreferences()), [commit])

  const savePreferences = useCallback(
    (next: Pick<CookieConsentPreferences, 'statistics' | 'marketing'>) => {
      commit({
        ...necessaryOnlyPreferences(),
        statistics: next.statistics,
        marketing: next.marketing,
      })
    },
    [commit],
  )

  const openSettings = useCallback(() => {
    setSettingsOpen(true)
    setBannerVisible(false)
  }, [])

  const closeSettings = useCallback(() => {
    setSettingsOpen(false)
    if (!preferences && isPublicSite) setBannerVisible(true)
  }, [preferences, isPublicSite])

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      preferences,
      bannerVisible: ready && isPublicSite && bannerVisible,
      settingsOpen: ready && isPublicSite && settingsOpen,
      acceptAll,
      acceptNecessaryOnly,
      openSettings,
      closeSettings,
      savePreferences,
      isAllowed: (category) => categoryAllowed(preferences, category),
    }),
    [
      preferences,
      ready,
      isPublicSite,
      bannerVisible,
      settingsOpen,
      acceptAll,
      acceptNecessaryOnly,
      openSettings,
      closeSettings,
      savePreferences,
    ],
  )

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {isPublicSite && <CookieConsentUI />}
    </CookieConsentContext.Provider>
  )
}

function CookieConsentUI() {
  const {
    bannerVisible,
    settingsOpen,
    acceptAll,
    acceptNecessaryOnly,
    openSettings,
    closeSettings,
    savePreferences,
    preferences,
  } = useCookieConsent()

  const [statistics, setStatistics] = useState(preferences?.statistics ?? false)
  const [marketing, setMarketing] = useState(preferences?.marketing ?? false)

  useEffect(() => {
    if (settingsOpen) {
      setStatistics(preferences?.statistics ?? false)
      setMarketing(preferences?.marketing ?? false)
    }
  }, [settingsOpen, preferences])

  if (!bannerVisible && !settingsOpen) return null

  return (
    <>
      {bannerVisible && (
        <div
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#e2e8f0] bg-white shadow-[0_-8px_30px_rgba(26,50,82,0.12)]"
          role="region"
          aria-label="Cookie-Hinweis"
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="font-heading text-base font-bold text-[#1a3252] mb-1">
                Cookies auf dieser Website
              </p>
              <p className="font-body text-sm text-[#4a5568] leading-relaxed">
                Wir verwenden technisch notwendige Cookies für den Betrieb der Seite.
                Optionale Cookies für Statistik helfen uns, Inhalte zu verbessern.
                Details finden Sie in unserer{' '}
                <Link href="/datenschutz" className="text-[#02a9e6] hover:underline">
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto">
              <Button variant="ghost" size="md" className="min-h-[44px] flex-1 sm:flex-none" onClick={acceptNecessaryOnly}>
                Nur notwendige
              </Button>
              <Button variant="secondary" size="md" className="min-h-[44px] flex-1 sm:flex-none" onClick={openSettings}>
                Einstellungen
              </Button>
              <Button variant="solid-accent" size="md" className="min-h-[44px] flex-1 sm:flex-none" onClick={acceptAll}>
                Alle akzeptieren
              </Button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#1a3252]/50 p-4"
          role="presentation"
          onClick={closeSettings}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-settings-title"
            className="w-full max-w-lg rounded-lg bg-white shadow-xl border border-[#e2e8f0] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cookie-settings-title" className="font-heading text-xl font-bold text-[#1a3252] mb-2">
              Cookie-Einstellungen
            </h2>
            <p className="font-body text-sm text-[#4a5568] mb-5 leading-relaxed">
              Wählen Sie, welche optionalen Cookies wir setzen dürfen. Notwendige Cookies
              sind für den Betrieb der Website erforderlich.
            </p>

            <ul className="space-y-4 mb-6">
              <CategoryRow
                title="Notwendig"
                description="Session-Verwaltung und Speicherung Ihrer Cookie-Auswahl."
                checked
                disabled
              />
              <CategoryRow
                title="Statistik"
                description="Anonyme Nutzungsstatistiken zur Verbesserung unserer Inhalte."
                checked={statistics}
                onChange={setStatistics}
              />
              <CategoryRow
                title="Marketing"
                description="Meta Pixel für Kampagnen-Messung und Conversion-Tracking (Facebook/Instagram Ads)."
                checked={marketing}
                onChange={setMarketing}
              />
            </ul>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeSettings}>
                Abbrechen
              </Button>
              <Button
                variant="solid-primary"
                size="sm"
                onClick={() => savePreferences({ statistics, marketing })}
              >
                Auswahl speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CategoryRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange?: (value: boolean) => void
}) {
  return (
    <li className="flex items-start justify-between gap-4 rounded-md border border-[#e2e8f0] p-4">
      <div>
        <p className="font-body text-sm font-semibold text-[#1a3252]">{title}</p>
        <p className="font-body text-xs text-[#718096] mt-1 leading-relaxed">{description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span
          className={[
            'h-6 w-11 rounded-full transition-colors',
            disabled ? 'bg-[#02a9e6]/60' : 'bg-[#e2e8f0] peer-checked:bg-[#02a9e6]',
            'after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform',
            'peer-checked:after:translate-x-5',
            disabled ? 'opacity-70 cursor-not-allowed' : '',
          ].join(' ')}
          aria-hidden="true"
        />
        <span className="sr-only">{title}</span>
      </label>
    </li>
  )
}
