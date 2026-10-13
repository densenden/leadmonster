import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetConfig = vi.fn()

vi.mock('../config', () => ({
  getTurnstileServerConfig: () => mockGetConfig(),
}))

describe('verifyTurnstileToken', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips verification when Turnstile is disabled', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: false,
      siteKey: null,
      secretKey: null,
    })
    const { verifyTurnstileToken } = await import('../verify')
    const result = await verifyTurnstileToken(undefined)
    expect(result).toEqual({ ok: true })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('hard-fails when token is missing (no soft-allow for bots)', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: true,
      siteKey: 'site',
      secretKey: 'secret',
    })
    const { verifyTurnstileToken } = await import('../verify')
    const result = await verifyTurnstileToken('')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CAPTCHA_REQUIRED')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accepts a token when Cloudflare siteverify returns success', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: true,
      siteKey: 'site',
      secretKey: 'secret',
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    const { verifyTurnstileToken } = await import('../verify')
    const result = await verifyTurnstileToken('valid-token', '1.2.3.4')
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('rejects when Cloudflare siteverify returns success=false', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: true,
      siteKey: 'site',
      secretKey: 'secret',
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    } as Response)

    const { verifyTurnstileToken } = await import('../verify')
    const result = await verifyTurnstileToken('bad-token')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CAPTCHA_FAILED')
  })

  it('hard-fails when siteverify is unreachable', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: true,
      siteKey: 'site',
      secretKey: 'secret',
    })
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    const { verifyTurnstileToken } = await import('../verify')
    const result = await verifyTurnstileToken('some-token')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CAPTCHA_FAILED')
  })

  it('hard-fails when secret key is rejected by Cloudflare', async () => {
    mockGetConfig.mockResolvedValue({
      enabled: true,
      siteKey: 'site',
      secretKey: 'wrong-secret',
    })
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-secret'] }),
    } as Response)

    const { verifyTurnstileToken } = await import('../verify')
    const result = await verifyTurnstileToken('some-token')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CAPTCHA_FAILED')
  })
})
