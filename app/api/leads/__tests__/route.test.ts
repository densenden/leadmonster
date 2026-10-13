// Tests for POST /api/leads — core validation, CSRF, rate limiting, and honeypot.
// Mocks Supabase so no real DB calls are made. Each test runs under 50ms.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { COMPLETE_LEAD_PAYLOAD } from '@/components/sections/__tests__/lead-form-test-helpers'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Chain-agnostischer Supabase-Mock — deckt sowohl den primären Insert-Pfad
// (`from('leads').insert().select().single()`) als auch den Post-Save-Pfad
// (`from('produkte').select().eq().single()`, `from('leads').update().eq()`)
// ab, der seit der Umstellung auf awaited Convexa+Email-Sync genutzt wird.
const mockInsertChain: {
  insert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  then: (resolve: (v: unknown) => unknown) => Promise<unknown>
} = {
  insert: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  single: vi.fn(),
  // Damit `await from('leads').update({...}).eq('id', …)` als thenable funktioniert.
  then(resolve) {
    return Promise.resolve({ data: null, error: null }).then(resolve)
  },
}
mockInsertChain.insert.mockReturnValue(mockInsertChain)
mockInsertChain.select.mockReturnValue(mockInsertChain)
mockInsertChain.eq.mockReturnValue(mockInsertChain)
mockInsertChain.update.mockReturnValue(mockInsertChain)
mockInsertChain.single.mockResolvedValue({ data: { id: 'new-lead-uuid' }, error: null })

const mockFrom = vi.fn(() => mockInsertChain)

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}))

vi.mock('@/lib/convexa/client', () => ({
  pushLeadToConvexa: vi.fn().mockResolvedValue({ id: 'convexa-001', status: 'created' }),
  isConvexaSyncEnabled: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/resend/mailer', () => ({
  isResendEnabled: vi.fn().mockResolvedValue(true),
  sendLeadConfirmation: vi.fn().mockResolvedValue(true),
  sendSalesNotification: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/captcha/verify', () => ({
  verifyCaptchaToken: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/captcha/config', () => ({
  getCaptchaServerConfig: vi.fn().mockResolvedValue({
    enabled: false,
    provider: 'turnstile',
    siteKey: null,
    secretKey: null,
  }),
}))

vi.mock('@/lib/leads/save-bot-attempt', () => ({
  saveBotAttempt: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = COMPLETE_LEAD_PAYLOAD

/**
 * Builds a NextRequest-compatible Request with CSRF header by default.
 * Pass `withCsrf: false` to test the missing-header scenario.
 */
function makeRequest(
  body: unknown,
  options: { ip?: string; withCsrf?: boolean; cookie?: string } = {},
): Request {
  const { ip = '127.0.0.1', withCsrf = true, cookie } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-forwarded-for': ip,
  }
  if (withCsrf) {
    headers['X-Requested-With'] = 'XMLHttpRequest'
  }
  if (cookie) {
    headers.cookie = cookie
  }
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Reset rate limit store between tests by reimporting the module.
    // The store is module-level; resetModules() ensures a fresh Map each test.
    mockFrom.mockReturnValue(mockInsertChain)
    mockInsertChain.insert.mockReturnValue(mockInsertChain)
    mockInsertChain.select.mockReturnValue(mockInsertChain)
    mockInsertChain.eq.mockReturnValue(mockInsertChain)
    mockInsertChain.update.mockReturnValue(mockInsertChain)
    mockInsertChain.single.mockResolvedValue({ data: { id: 'new-lead-uuid' }, error: null })
  })

  it('Test 1: valid payload returns HTTP 201 with { data: { id } } envelope', async () => {
    const { POST } = await import('../route')
    const response = await POST(makeRequest(VALID_PAYLOAD) as never)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data).toBeDefined()
    expect(typeof body.data.id).toBe('string')
    expect(body.error).toBeNull()
  })

  it('Test 2: missing email returns HTTP 422 with VALIDATION_ERROR code', async () => {
    const { POST } = await import('../route')
    const { email: _omit, ...payloadWithoutEmail } = VALID_PAYLOAD

    const response = await POST(makeRequest(payloadWithoutEmail) as never)

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(Array.isArray(body.error.details)).toBe(true)
    expect(body.error.details.some((d: { field: string }) => d.field === 'email')).toBe(true)
  })

  it('Test 3: non-empty website honeypot returns HTTP 200 with { data: { id: "bot" } } and no leads insert', async () => {
    const { saveBotAttempt } = await import('@/lib/leads/save-bot-attempt')
    const { POST } = await import('../route')
    const payloadWithHoneypot = { ...VALID_PAYLOAD, website: 'http://spam.example.com' }

    const response = await POST(makeRequest(payloadWithHoneypot) as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.id).toBe('bot')

    // Real leads table must not be written — quarantine goes to lead_bot_attempts instead.
    expect(mockInsertChain.insert).not.toHaveBeenCalled()
    expect(saveBotAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'honeypot', email: VALID_PAYLOAD.email }),
    )
  })

  it('Test 4: third submission from same IP within 60 min returns HTTP 429 with RATE_LIMIT_EXCEEDED', async () => {
    const { POST } = await import('../route')
    const ip = '10.0.0.99'

    // Submit 3 times (all should succeed)
    await POST(makeRequest(VALID_PAYLOAD, { ip }) as never)
    await POST(makeRequest(VALID_PAYLOAD, { ip }) as never)
    await POST(makeRequest(VALID_PAYLOAD, { ip }) as never)

    // 4th submission (count is 3, limit is 3 → reject)
    const response = await POST(makeRequest(VALID_PAYLOAD, { ip }) as never)

    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('Test 5: request missing X-Requested-With header returns HTTP 403', async () => {
    const { POST } = await import('../route')
    const response = await POST(makeRequest(VALID_PAYLOAD, { withCsrf: false }) as never)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('Test 6: missing privacy consent returns HTTP 422 with VALIDATION_ERROR', async () => {
    const { POST } = await import('../route')
    const { privacyConsent: _omit, ...payloadWithoutConsent } = VALID_PAYLOAD

    const response = await POST(makeRequest(payloadWithoutConsent) as never)

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(
      body.error.details.some((d: { field: string }) => d.field === 'privacyConsent'),
    ).toBe(true)
  })

  it('Test 7: failed captcha returns HTTP 403 with CAPTCHA_FAILED, quarantines attempt, no leads insert', async () => {
    const { verifyCaptchaToken } = await import('@/lib/captcha/verify')
    const { saveBotAttempt } = await import('@/lib/leads/save-bot-attempt')
    vi.mocked(verifyCaptchaToken).mockResolvedValueOnce({
      ok: false,
      code: 'CAPTCHA_FAILED',
      message: 'Captcha ungültig oder abgelaufen. Bitte erneut bestätigen.',
    })

    const { POST } = await import('../route')
    const response = await POST(
      makeRequest({ ...VALID_PAYLOAD, turnstileToken: 'bad-token' }) as never,
    )

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('CAPTCHA_FAILED')
    expect(mockInsertChain.insert).not.toHaveBeenCalled()
    expect(saveBotAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'captcha_failed', email: VALID_PAYLOAD.email }),
    )
  })

  it('Test 8: too-fast form session cookie when captcha enabled returns HTTP 403 TOO_FAST', async () => {
    process.env.INTERNAL_SECRET = 'test-route-form-session'
    const { getCaptchaServerConfig } = await import('@/lib/captcha/config')
    const { saveBotAttempt } = await import('@/lib/leads/save-bot-attempt')
    const { createFormSessionToken, FORM_SESSION_COOKIE } = await import(
      '@/lib/captcha/form-session'
    )
    vi.mocked(getCaptchaServerConfig).mockResolvedValueOnce({
      enabled: true,
      provider: 'turnstile',
      siteKey: 'site',
      secretKey: 'secret',
    })

    const tooFastToken = createFormSessionToken(Date.now() - 100)
    const { POST } = await import('../route')
    const response = await POST(
      makeRequest(
        {
          ...VALID_PAYLOAD,
          turnstileToken: 'ok-token',
          formLoadedAt: new Date(Date.now() - 100).toISOString(),
        },
        { cookie: `${FORM_SESSION_COOKIE}=${tooFastToken}` },
      ) as never,
    )

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error.code).toBe('TOO_FAST')
    expect(mockInsertChain.insert).not.toHaveBeenCalled()
    expect(saveBotAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'too_fast', email: VALID_PAYLOAD.email }),
    )
  })

  it('Test 8b: spam heuristic (VergleichsRechner defaults) quarantines with silent 200', async () => {
    const { saveBotAttempt } = await import('@/lib/leads/save-bot-attempt')
    const { POST } = await import('../route')
    const response = await POST(
      makeRequest({
        ...VALID_PAYLOAD,
        geburtsdatum: '1984-10-03',
        formPlacement: 'vergleichsrechner',
        interesse:
          'Beratungsanfrage für die Sterbegeld24Plus. Geburtsjahr 1961 (65 Jahre), 8.000 €. Bitte um persönlichen Vergleich aller Anbieter.',
        filterContext: {
          sterbegeld_summe: 8000,
          akzeptierte_wartezeit_monate: 0,
        },
      }) as never,
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toEqual({ id: 'bot' })
    expect(mockInsertChain.insert).not.toHaveBeenCalled()
    expect(saveBotAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'spam_heuristic',
        email: VALID_PAYLOAD.email,
        payload: expect.objectContaining({
          signals: expect.arrayContaining([
            expect.objectContaining({ code: 'vergleich_defaults_unchanged' }),
          ]),
        }),
      }),
    )
  })

  it('Test 8b2: spam heuristic (born after 1990) quarantines with silent 200', async () => {
    const { saveBotAttempt } = await import('@/lib/leads/save-bot-attempt')
    const { POST } = await import('../route')
    const response = await POST(
      makeRequest({
        ...VALID_PAYLOAD,
        geburtsdatum: '1993-02-04',
        formPlacement: 'vergleichsrechner',
        interesse: 'Persönliche Beratung bitte',
        filterContext: { sterbegeld_summe: 15000 },
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(mockInsertChain.insert).not.toHaveBeenCalled()
    expect(saveBotAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'spam_heuristic',
        payload: expect.objectContaining({
          signals: expect.arrayContaining([
            expect.objectContaining({ code: 'born_after_1990' }),
          ]),
        }),
      }),
    )
  })

  it('Test 8c: missing form session cookie when captcha enabled → FORM_SESSION_INVALID', async () => {
    const { getCaptchaServerConfig } = await import('@/lib/captcha/config')
    const { saveBotAttempt } = await import('@/lib/leads/save-bot-attempt')
    vi.mocked(getCaptchaServerConfig).mockResolvedValueOnce({
      enabled: true,
      provider: 'turnstile',
      siteKey: 'site',
      secretKey: 'secret',
    })

    const { POST } = await import('../route')
    const response = await POST(
      makeRequest({
        ...VALID_PAYLOAD,
        turnstileToken: 'ok-token',
        formLoadedAt: new Date(Date.now() - 60_000).toISOString(),
      }) as never,
    )

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error.code).toBe('FORM_SESSION_INVALID')
    expect(mockInsertChain.insert).not.toHaveBeenCalled()
    expect(saveBotAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'form_session_invalid' }),
    )
  })

  it('Test 9: long hCaptcha token (>2048 chars) passes Zod validation', async () => {
    const { POST } = await import('../route')
    const longToken = 'x'.repeat(3000)

    const response = await POST(
      makeRequest({ ...VALID_PAYLOAD, turnstileToken: longToken }) as never,
    )

    // Must not be 422 too_big on turnstileToken — hCaptcha tokens are often >2k.
    expect(response.status).not.toBe(422)
    expect([200, 201, 403]).toContain(response.status)
  })
})
