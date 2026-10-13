/**
 * Backwards-compatible Turnstile config wrappers.
 * Prefer `@/lib/captcha/config` for new code.
 */
import {
  getCaptchaPublicConfig,
  getCaptchaServerConfig,
  TURNSTILE_SITE_KEY_SETTING,
  TURNSTILE_SECRET_KEY_SETTING,
  CAPTCHA_ENABLED_SETTING as TURNSTILE_ENABLED_SETTING,
} from '@/lib/captcha/config'

export {
  TURNSTILE_SITE_KEY_SETTING,
  TURNSTILE_SECRET_KEY_SETTING,
  TURNSTILE_ENABLED_SETTING,
}

export interface TurnstilePublicConfig {
  enabled: boolean
  siteKey: string | null
}

export interface TurnstileServerConfig extends TurnstilePublicConfig {
  secretKey: string | null
}

export async function getTurnstileServerConfig(): Promise<TurnstileServerConfig> {
  const full = await getCaptchaServerConfig()
  // Only report Turnstile as enabled when that provider is active.
  if (full.provider !== 'turnstile') {
    return { enabled: false, siteKey: null, secretKey: null }
  }
  return {
    enabled: full.enabled,
    siteKey: full.siteKey,
    secretKey: full.secretKey,
  }
}

export async function getTurnstilePublicConfig(): Promise<TurnstilePublicConfig> {
  const full = await getCaptchaPublicConfig()
  if (full.provider !== 'turnstile') {
    return { enabled: false, siteKey: null }
  }
  return { enabled: full.enabled, siteKey: full.siteKey }
}
