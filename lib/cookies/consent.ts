// Cookie consent storage + helpers (TTDSG / DSGVO).
// Necessary cookies are always allowed; statistics/marketing need opt-in.

export const CONSENT_COOKIE_NAME = 'lm_consent'
export const CONSENT_STORAGE_KEY = 'lm_cookie_consent'
export const CONSENT_VERSION = 1
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180 // 180 days

export type CookieCategory = 'necessary' | 'statistics' | 'marketing'

export interface CookieConsentPreferences {
  version: number
  necessary: true
  statistics: boolean
  marketing: boolean
  updatedAt: string
}

export const necessaryOnlyPreferences = (): CookieConsentPreferences => ({
  version: CONSENT_VERSION,
  necessary: true,
  statistics: false,
  marketing: false,
  updatedAt: new Date().toISOString(),
})

export const acceptAllPreferences = (): CookieConsentPreferences => ({
  version: CONSENT_VERSION,
  necessary: true,
  statistics: true,
  marketing: true,
  updatedAt: new Date().toISOString(),
})

export function isConsentRecord(value: unknown): value is CookieConsentPreferences {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<CookieConsentPreferences>
  return (
    record.version === CONSENT_VERSION &&
    record.necessary === true &&
    typeof record.statistics === 'boolean' &&
    typeof record.marketing === 'boolean' &&
    typeof record.updatedAt === 'string'
  )
}

export function parseConsentJson(raw: string | null | undefined): CookieConsentPreferences | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isConsentRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function serializeConsent(preferences: CookieConsentPreferences): string {
  return JSON.stringify(preferences)
}

export function hasValidConsent(preferences: CookieConsentPreferences | null): boolean {
  return preferences !== null
}

export function categoryAllowed(
  preferences: CookieConsentPreferences | null,
  category: CookieCategory,
): boolean {
  if (category === 'necessary') return true
  if (!preferences) return false
  if (category === 'statistics') return preferences.statistics
  return preferences.marketing
}

/** Read marketing opt-in from browser storage (client-only, no React context). */
export function readMarketingConsent(): boolean {
  if (typeof window === 'undefined') return false

  const fromStorage = parseConsentJson(localStorage.getItem(CONSENT_STORAGE_KEY))
  if (fromStorage) return fromStorage.marketing

  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${CONSENT_COOKIE_NAME}=`))
  if (!match) return false
  const value = match.slice(CONSENT_COOKIE_NAME.length + 1)
  const fromCookie = parseConsentJson(decodeURIComponent(value))
  return fromCookie?.marketing ?? false
}
