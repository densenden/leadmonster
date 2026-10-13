/**
 * Unified captcha verification for POST /api/leads.
 * Dispatches to Turnstile or hCaptcha based on Admin settings.
 */
import { getCaptchaServerConfig } from './config'
import type { CaptchaVerifyResult } from './types'
import { verifyTurnstileTokenWithSecret } from '@/lib/turnstile/verify'
import { verifyHcaptchaToken } from '@/lib/hcaptcha/verify'

/**
 * Verifies the captcha token for the active provider.
 * When captcha is disabled / not configured, returns ok (honeypot + rate-limit still apply).
 */
export async function verifyCaptchaToken(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<CaptchaVerifyResult> {
  const config = await getCaptchaServerConfig()

  if (!config.enabled || !config.secretKey) {
    return { ok: true }
  }

  if (config.provider === 'hcaptcha') {
    return verifyHcaptchaToken(token, config.secretKey, remoteIp)
  }

  return verifyTurnstileTokenWithSecret(token, config.secretKey, remoteIp)
}
