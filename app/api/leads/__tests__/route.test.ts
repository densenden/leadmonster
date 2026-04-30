// Tests for POST /api/leads — core validation, CSRF, rate limiting, and honeypot.
// Mocks Supabase so no real DB calls are made. Each test runs under 50ms.
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
}))

vi.mock('@/lib/resend/mailer', () => ({
  sendLeadConfirmation: vi.fn().mockResolvedValue(true),
  sendSalesNotification: vi.fn().mockResolvedValue(true),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  produktId: '987fcdeb-51a2-43d7-b456-426614174001',
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'sicherheit',
  vorname: 'Anna',
  nachname: 'Beispiel',
  email: 'anna@example.de',
  telefon: '0151 9876543',
  interesse: 'Sofortschutz für meine Eltern',
}

/**
 * Builds a NextRequest-compatible Request with CSRF header by default.
 * Pass `withCsrf: false` to test the missing-header scenario.
 */
function makeRequest(
  body: unknown,
  options: { ip?: string; withCsrf?: boolean } = {},
): Request {
  const { ip = '127.0.0.1', withCsrf = true } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-forwarded-for': ip,
  }
  if (withCsrf) {
    headers['X-Requested-With'] = 'XMLHttpRequest'
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

  it('Test 3: non-empty website honeypot returns HTTP 200 with { data: { id: "bot" } } and no DB write', async () => {
    const { POST } = await import('../route')
    const payloadWithHoneypot = { ...VALID_PAYLOAD, website: 'http://spam.example.com' }

    const response = await POST(makeRequest(payloadWithHoneypot) as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.id).toBe('bot')

    // The insert chain must not have been called
    expect(mockInsertChain.insert).not.toHaveBeenCalled()
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
})
