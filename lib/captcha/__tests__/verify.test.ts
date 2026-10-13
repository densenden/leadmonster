import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetConfig = vi.fn()

vi.mock('../config', () => ({
  getCaptchaServerConfig: () => mockGetConfig(),
}))

vi.mock('@/lib/turnstile/verify', () => ({
  verifyTurnstileTokenWithSecret: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/hcaptcha/verify', () => ({
  verifyHcaptchaToken: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('verifyCaptchaToken', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('skips when captcha disabled', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: false,
      provider: 'turnstile',
      siteKey: null,
      secretKey: null,
    })
    const { verifyCaptchaToken } = await import('../verify')
    const { verifyTurnstileTokenWithSecret } = await import('@/lib/turnstile/verify')
    const result = await verifyCaptchaToken(undefined)
    expect(result).toEqual({ ok: true })
    expect(verifyTurnstileTokenWithSecret).not.toHaveBeenCalled()
  })

  it('routes to hCaptcha when provider is hcaptcha', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: true,
      provider: 'hcaptcha',
      siteKey: 'hsite',
      secretKey: 'hsecret',
    })
    const { verifyHcaptchaToken } = await import('@/lib/hcaptcha/verify')
    vi.mocked(verifyHcaptchaToken).mockResolvedValueOnce({ ok: true })

    const { verifyCaptchaToken } = await import('../verify')
    const result = await verifyCaptchaToken('tok', '1.1.1.1')
    expect(result).toEqual({ ok: true })
    expect(verifyHcaptchaToken).toHaveBeenCalledWith('tok', 'hsecret', '1.1.1.1')
  })
})
