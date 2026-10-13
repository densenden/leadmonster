/**
 * Captcha config for lead forms (Turnstile or hCaptcha).
 *
 * Resolution order:
 *   1. einstellungen table (admin can change without redeploy)
 *   2. process.env fallback
 *
 * Master switch stays `turnstile_enabled` for backwards compat
 * (Admin UI label: "Captcha aktiv").
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { CaptchaProvider, CaptchaPublicConfig, CaptchaServerConfig } from './types'

export const CAPTCHA_PROVIDER_SETTING = 'captcha_provider'
export const CAPTCHA_ENABLED_SETTING = 'turnstile_enabled'

export const TURNSTILE_SITE_KEY_SETTING = 'turnstile_site_key'
export const TURNSTILE_SECRET_KEY_SETTING = 'turnstile_secret_key'

export const HCAPTCHA_SITE_KEY_SETTING = 'hcaptcha_site_key'
export const HCAPTCHA_SECRET_KEY_SETTING = 'hcaptcha_secret_key'

function parseEnabledFlag(raw: string | null | undefined): boolean | null {
  if (raw == null || raw.trim() === '') return null
  const v = raw.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'false' || v === '0' || v === 'no') return false
  return null
}

function parseProvider(raw: string | null | undefined): CaptchaProvider {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'hcaptcha') return 'hcaptcha'
  return 'turnstile'
}

async function loadCaptchaRows(): Promise<Record<string, string>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('einstellungen')
      .select('schluessel, wert')
      .in('schluessel', [
        CAPTCHA_ENABLED_SETTING,
        CAPTCHA_PROVIDER_SETTING,
        TURNSTILE_SITE_KEY_SETTING,
        TURNSTILE_SECRET_KEY_SETTING,
        HCAPTCHA_SITE_KEY_SETTING,
        HCAPTCHA_SECRET_KEY_SETTING,
      ])

    if (error) {
      console.warn('[captcha] einstellungen query error:', error.message)
      return {}
    }

    const map: Record<string, string> = {}
    for (const row of data ?? []) {
      if (row.wert != null) map[row.schluessel] = row.wert
    }
    return map
  } catch (err) {
    console.warn('[captcha] Failed to load einstellungen:', err)
    return {}
  }
}

/**
 * Full server config for the active captcha provider.
 * Enabled only when Admin toggle is true AND both keys for that provider exist.
 */
export async function getCaptchaServerConfig(): Promise<CaptchaServerConfig> {
  const db = await loadCaptchaRows()
  const provider = parseProvider(
    db[CAPTCHA_PROVIDER_SETTING] ?? process.env.CAPTCHA_PROVIDER,
  )

  const turnstileSite =
    (db[TURNSTILE_SITE_KEY_SETTING] ?? '').trim() ||
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim() ||
    null
  const turnstileSecret =
    (db[TURNSTILE_SECRET_KEY_SETTING] ?? '').trim() ||
    (process.env.TURNSTILE_SECRET_KEY ?? '').trim() ||
    null

  const hcaptchaSite =
    (db[HCAPTCHA_SITE_KEY_SETTING] ?? '').trim() ||
    (process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? '').trim() ||
    null
  const hcaptchaSecret =
    (db[HCAPTCHA_SECRET_KEY_SETTING] ?? '').trim() ||
    (process.env.HCAPTCHA_SECRET_KEY ?? '').trim() ||
    null

  const siteKey = provider === 'hcaptcha' ? hcaptchaSite : turnstileSite
  const secretKey = provider === 'hcaptcha' ? hcaptchaSecret : turnstileSecret

  const flag = parseEnabledFlag(db[CAPTCHA_ENABLED_SETTING])
  const hasKeys = Boolean(siteKey && secretKey)
  const enabled = flag === true && hasKeys

  return { enabled, provider, siteKey, secretKey }
}

/** Public subset for the browser / config API. */
export async function getCaptchaPublicConfig(): Promise<CaptchaPublicConfig> {
  const full = await getCaptchaServerConfig()
  return {
    enabled: full.enabled,
    provider: full.provider,
    siteKey: full.enabled ? full.siteKey : null,
  }
}
