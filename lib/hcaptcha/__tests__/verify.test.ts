import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('verifyHcaptchaToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires a token', async () => {
    const { verifyHcaptchaToken } = await import('../verify')
    const result = await verifyHcaptchaToken('', 'secret')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CAPTCHA_REQUIRED')
  })

  it('accepts success from siteverify', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)
    const { verifyHcaptchaToken } = await import('../verify')
    const result = await verifyHcaptchaToken('tok', 'secret', '9.9.9.9')
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.hcaptcha.com/siteverify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('rejects failed siteverify', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    } as Response)
    const { verifyHcaptchaToken } = await import('../verify')
    const result = await verifyHcaptchaToken('bad', 'secret')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CAPTCHA_FAILED')
  })
})
