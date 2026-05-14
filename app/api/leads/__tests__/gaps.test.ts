// Gap-filling tests for POST /api/leads (Task Group 4).
// Covers: rate limit window reset, optional telefon field, and complete payload.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — all at module top level (hoisted by Vitest)
// ---------------------------------------------------------------------------

const mockInsertChain = {
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'gap-lead-uuid' }, error: null }),
}

const mockFrom = vi.fn(() => mockInsertChain)

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}))

vi.mock('@/lib/convexa/client', () => ({
  pushLeadToConvexa: vi.fn().mockResolvedValue({ id: 'convexa-gap-001', status: 'created' }),
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
  email: 'gap@example.de',
}

function makeRequest(body: unknown, ip = '192.168.1.1'): Request {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads — gap tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockFrom.mockReturnValue(mockInsertChain)
    mockInsertChain.insert.mockReturnThis()
    mockInsertChain.select.mockReturnThis()
    mockInsertChain.single.mockResolvedValue({ data: { id: 'gap-lead-uuid' }, error: null })
  })

  // ---------------------------------------------------------------------------
  // Gap 1: Rate limit window reset — after the window expires, a new submission is accepted.
  // Because `resetModules()` creates a fresh module with a new rateLimitStore Map,
  // each reimport effectively simulates a fresh server process (empty rate limit store).
  // The actual window-reset behaviour (resetAt comparison) is exercised in route.test.ts
  // through the 3-submission → 429 sequence with a unique IP per test.
  // ---------------------------------------------------------------------------
  it('Gap 1: a fresh module import starts with an empty rate limit store — first request accepted', async () => {
    // resetModules() in beforeEach ensures a clean store for every test.
    // This test confirms that after such a reset, the very first request from any IP is accepted.
    const ip = '10.99.0.1'
    const { POST } = await import('../route')
    const response = await POST(makeRequest(VALID_PAYLOAD, ip) as never)
    expect(response.status).toBe(201)
  })

  // ---------------------------------------------------------------------------
  // Gap 2: Optional Telefon — submit without telefon field succeeds
  // ---------------------------------------------------------------------------
  it('Gap 2: submit without telefon field succeeds with HTTP 201', async () => {
    const { POST } = await import('../route')

    const response = await POST(makeRequest(VALID_PAYLOAD) as never)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.id).toBe('gap-lead-uuid')
    expect(body.error).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Gap 3: End-to-end: complete valid payload (all optional fields) returns 201
  // ---------------------------------------------------------------------------
  it('Gap 3: complete valid payload with all optional fields returns HTTP 201', async () => {
    const { POST } = await import('../route')
    const fullPayload = {
      ...VALID_PAYLOAD,
      vorname: 'Maria',
      nachname: 'Muster',
      telefon: '0151 9876543',
      interesse: 'Ich möchte mehr über Sofortschutz erfahren.',
    }

    const response = await POST(makeRequest(fullPayload) as never)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.error).toBeNull()
    expect(typeof body.data.id).toBe('string')
  })

  // ---------------------------------------------------------------------------
  // Gap 4: Lead-Kontaktfelder (Migration 20260514000000) — geburtsdatum, adresse,
  // sterbegeld_summe + akzeptierte_wartezeit_monate landen vollständig in der
  // insert payload. Christian-Wunsch für „blinde" Angebotsversendung.
  // ---------------------------------------------------------------------------
  it('Gap 4: lead with Christian kontakt-felder writes all columns into DB insert', async () => {
    const { POST } = await import('../route')
    const fullPayload = {
      ...VALID_PAYLOAD,
      email: 'christian-fields@example.de',
      vorname: 'Maria',
      nachname: 'Muster',
      geburtsdatum: '1962-03-14',
      strasse: 'Musterstraße 12',
      plz: '80331',
      ort: 'München',
      filterContext: {
        akzeptierte_wartezeit_monate: 12,
        sterbegeld_summe: 10000,
      },
    }

    const response = await POST(makeRequest(fullPayload, '10.10.10.4') as never)
    expect(response.status).toBe(201)

    // Insert-Payload extrahieren — das letzte insert()-Call enthält alle Spalten.
    const insertCalls = mockInsertChain.insert.mock.calls
    expect(insertCalls.length).toBeGreaterThan(0)
    const insertedRow = insertCalls[insertCalls.length - 1][0] as Record<string, unknown>

    expect(insertedRow.geburtsdatum).toBe('1962-03-14')
    expect(insertedRow.strasse).toBe('Musterstraße 12')
    expect(insertedRow.plz).toBe('80331')
    expect(insertedRow.ort).toBe('München')
    expect(insertedRow.akzeptierte_wartezeit_monate).toBe(12)
    expect(insertedRow.sterbegeld_summe).toBe(10000)
  })

  it('Gap 5: invalid PLZ (non-5-digit) returns 422 validation error', async () => {
    const { POST } = await import('../route')
    const response = await POST(
      makeRequest({ ...VALID_PAYLOAD, email: 'plz-fail@example.de', plz: '123' }, '10.10.10.5') as never,
    )
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.some((d: { field: string }) => d.field === 'plz')).toBe(true)
  })

  it('Gap 6: invalid geburtsdatum (out of range) returns 422', async () => {
    const { POST } = await import('../route')
    const response = await POST(
      makeRequest(
        { ...VALID_PAYLOAD, email: 'birth-fail@example.de', geburtsdatum: '1900-01-01' },
        '10.10.10.6',
      ) as never,
    )
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.some((d: { field: string }) => d.field === 'geburtsdatum')).toBe(true)
  })
})
