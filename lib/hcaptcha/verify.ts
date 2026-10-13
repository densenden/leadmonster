/**
 * Server-side hCaptcha token verification.
 * Docs: https://docs.hcaptcha.com/#verify-the-user-response-server-side
 */
const SITEVERIFY_URL = 'https://api.hcaptcha.com/siteverify'

export type HcaptchaVerifyResult =
  | { ok: true }
  | { ok: false; code: 'CAPTCHA_REQUIRED' | 'CAPTCHA_FAILED'; message: string }

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
}

/**
 * Verifies an hCaptcha response token with the secret key.
 * Caller must already know captcha is enabled and keys exist.
 */
export async function verifyHcaptchaToken(
  token: string | undefined | null,
  secretKey: string,
  remoteIp?: string,
): Promise<HcaptchaVerifyResult> {
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
      // Hard-fail (2026-08-03): soft-allow let captcha-farm traffic through on outages.
      console.error('[hcaptcha] siteverify HTTP error — rejecting submit:', res.status)
      return {
        ok: false,
        code: 'CAPTCHA_FAILED',
        message: 'Captcha-Prüfung vorübergehend nicht erreichbar. Bitte erneut versuchen.',
      }
    }

    const data = (await res.json()) as SiteverifyResponse
    if (!data.success) {
      const codes = data['error-codes'] ?? []
      console.warn('[hcaptcha] siteverify rejected:', codes)
      // Wrong secret must not open the door — admin must fix keys.
      if (codes.includes('invalid-input-secret') || codes.includes('not-using-dummy-secret')) {
        console.error(
          '[hcaptcha] SECRET KEY REJECTED — check Admin → Einstellungen → Bot-Schutz',
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
    console.error('[hcaptcha] siteverify request failed — rejecting submit:', err)
    return {
      ok: false,
      code: 'CAPTCHA_FAILED',
      message: 'Captcha-Prüfung vorübergehend nicht erreichbar. Bitte erneut versuchen.',
    }
  }
}
