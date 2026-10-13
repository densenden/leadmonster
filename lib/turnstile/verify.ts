/**
 * Server-side Cloudflare Turnstile token verification (hard-fail).
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * Hard-fail policy (2026-08-03):
 * - No token → CAPTCHA_REQUIRED
 * - Token rejected / wrong secret → CAPTCHA_FAILED
 * - Cloudflare siteverify unreachable → CAPTCHA_FAILED (no soft-allow)
 */
import type { CaptchaVerifyResult } from '@/lib/captcha/types'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
}

/**
 * Verifies a Turnstile token with the secret key.
 * Caller must already know captcha is enabled and keys exist.
 */
export async function verifyTurnstileTokenWithSecret(
  token: string | undefined | null,
  secretKey: string,
  remoteIp?: string,
): Promise<CaptchaVerifyResult> {
  const trimmed = typeof token === 'string' ? token.trim() : ''
  if (!trimmed) {
    return {
      ok: false,
      code: 'CAPTCHA_REQUIRED',
      message: 'Bitte bestätigen Sie, dass Sie kein Roboter sind.',
    }
  }

  try {
    const body = new URLSearchParams()
    body.set('secret', secretKey)
    body.set('response', trimmed)
    if (remoteIp && remoteIp !== 'unknown') {
      body.set('remoteip', remoteIp)
    }

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!res.ok) {
      // Hard-fail (2026-08-03): soft-allow opened the door during provider outages.
      console.error('[turnstile] siteverify HTTP error — rejecting submit:', res.status)
      return {
        ok: false,
        code: 'CAPTCHA_FAILED',
        message: 'Captcha-Prüfung vorübergehend nicht erreichbar. Bitte erneut versuchen.',
      }
    }

    const data = (await res.json()) as SiteverifyResponse
    if (!data.success) {
      const codes = data['error-codes'] ?? []
      console.warn('[turnstile] siteverify rejected:', codes)
      if (codes.includes('invalid-input-secret')) {
        console.error(
          '[turnstile] SECRET KEY REJECTED by Cloudflare — check Admin → Einstellungen → Bot-Schutz',
        )
      }
      return {
        ok: false,
        code: 'CAPTCHA_FAILED',
        message: 'Captcha ungültig oder abgelaufen. Bitte erneut bestätigen.',
      }
    }

    return { ok: true }
  } catch (err) {
    console.error('[turnstile] siteverify request failed — rejecting submit:', err)
    return {
      ok: false,
      code: 'CAPTCHA_FAILED',
      message: 'Captcha-Prüfung vorübergehend nicht erreichbar. Bitte erneut versuchen.',
    }
  }
}

/**
 * Backwards-compatible wrapper used by older tests/imports.
 * Loads config and verifies; when disabled returns ok.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<CaptchaVerifyResult> {
  const { getTurnstileServerConfig } = await import('./config')
  const config = await getTurnstileServerConfig()
  if (!config.enabled || !config.secretKey) {
    return { ok: true }
  }
  return verifyTurnstileTokenWithSecret(token, config.secretKey, remoteIp)
}
