/**
 * Shared captcha types for lead-form bot protection.
 * Providers: Cloudflare Turnstile (existing) or hCaptcha (checkbox alternative).
 */

export type CaptchaProvider = 'turnstile' | 'hcaptcha'

export type CaptchaVerifyResult =
  | { ok: true }
  | {
      ok: false
      code: 'CAPTCHA_REQUIRED' | 'CAPTCHA_FAILED'
      message: string
    }

export interface CaptchaPublicConfig {
  enabled: boolean
  provider: CaptchaProvider
  /** Public site key for the active provider — safe in the browser. */
  siteKey: string | null
}

export interface CaptchaServerConfig extends CaptchaPublicConfig {
  secretKey: string | null
}
