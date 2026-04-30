// Tests for email dispatch integration inside POST /api/leads.
// Validates non-blocking behaviour: email failures never block the 201 response,
// and resend_sent flag is set only when both sends succeed.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockSendLeadConfirmation = vi.fn()
const mockSendSalesNotification = vi.fn()
const mockPushLeadToConvexa = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
  })),
}))

vi.mock('@/lib/convexa/client', () => ({
  pushLeadToConvexa: mockPushLeadToConvexa,
}))

vi.mock('@/lib/resend/mailer', () => ({
  sendLeadConfirmation: mockSendLeadConfirmation,
  sendSalesNotification: mockSendSalesNotification,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PRODUKT_ID = '987fcdeb-51a2-43d7-b456-426614174111'

const INSERTED_LEAD = {
  id: 'lead-uuid-email-test',
  produkt_id: PRODUKT_ID,
  vorname: 'Max',
  nachname: 'Mustermann',
  email: 'max@example.de',
  telefon: '0151 1234567',
  interesse: 'Sofortschutz',
  zielgruppe_tag: 'senioren_50plus',
  intent_tag: 'sofortschutz',
  convexa_lead_id: null,
  convexa_synced: false,
  convexa_error: null,
  resend_sent: false,
  created_at: '2026-04-07T10:30:00.000Z',
}

// Valid camelCase payload matching the new leadSchema.
const VALID_PAYLOAD = {
  produktId: PRODUKT_ID,
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'sofortschutz',
  vorname: 'Max',
  nachname: 'Mustermann',
  email: 'max@example.de',
  telefon: '0151 1234567',
  interesse: 'Sofortschutz',
}

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  })
}

// Sets up mockFrom to handle the standard call sequence:
// 1) leads.insert(..).select('id').single() → returns { id }
// 2) produkte.select → returns produkt name/slug
// 3) leads.select('*').eq().single() → returns full lead row (for IIFE post-save)
// 4) leads.update (convexa flags) → resolves
// 5) leads.update (resend_sent) → resolves
function setupStandardFromMock(updateSpy?: ReturnType<typeof vi.fn>) {
  const update = updateSpy ?? vi.fn().mockReturnThis()
  const eq = vi.fn().mockReturnThis()
  const single = vi.fn().mockResolvedValue({ data: INSERTED_LEAD, error: null })

  let callCount = 0
  mockFrom.mockImplementation((table: string) => {
    callCount++

    if (table === 'leads' && callCount === 1) {
      // First call: insert + select('id') + single()
      return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: INSERTED_LEAD.id }, error: null }),
      }
    }

    if (table === 'produkte') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' }, error: null }),
      }
    }

    // Subsequent leads calls: full row select or update
    return { select: vi.fn().mockReturnThis(), update, eq, single }
  })

  return { update, eq }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/leads — email dispatch integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Convexa succeeds by default — isolate email behaviour
    mockPushLeadToConvexa.mockResolvedValue({ id: 'convexa-lead-id', status: 'created' })
  })

  it('returns 201 even when sendLeadConfirmation rejects internally', async () => {
    setupStandardFromMock()

    // Mailer functions internally swallow errors and return false — they never throw to the caller.
    mockSendLeadConfirmation.mockResolvedValue(false)
    mockSendSalesNotification.mockResolvedValue(false)

    const { POST } = await import('../route')
    const response = await POST(makeRequest(VALID_PAYLOAD) as never)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.id).toBe('lead-uuid-email-test')
    expect(body.error).toBeNull()
  })

  it('sets resend_sent=true in Supabase when both mailer functions return true', async () => {
    const updateSpy = vi.fn().mockReturnThis()
    setupStandardFromMock(updateSpy)

    mockSendLeadConfirmation.mockResolvedValue(true)
    mockSendSalesNotification.mockResolvedValue(true)

    const { POST } = await import('../route')
    await POST(makeRequest(VALID_PAYLOAD) as never)

    // Post-save work is now awaited inside the route — no microtask flush needed.

    // The update call setting resend_sent=true must have been made
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ resend_sent: true }),
    )
  })
})
