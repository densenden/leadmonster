// Tests for Confluence integration inside POST /api/leads.
// Validates non-blocking behaviour: a Confluence failure never alters the client response.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockCreateLeadPage = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
  })),
}))

vi.mock('@/lib/confluence/client', () => ({
  createLeadPage: mockCreateLeadPage,
}))

// Mock the mailer module so the real Resend SDK is never instantiated in these
// Confluence-focused tests — email behaviour is covered in email.test.ts.
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

const PRODUKT_ID = '987fcdeb-51a2-43d7-b456-426614174111'

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

// Inserted lead row returned after insert — includes all DB columns.
const INSERTED_LEAD = {
  id: 'lead-uuid-42',
  produkt_id: PRODUKT_ID,
  vorname: 'Max',
  nachname: 'Mustermann',
  email: 'max@example.de',
  telefon: '0151 1234567',
  interesse: 'Sofortschutz',
  zielgruppe_tag: 'senioren_50plus',
  intent_tag: 'sofortschutz',
  confluence_page_id: null,
  confluence_synced: false,
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

// Sets up mockFrom to handle: insert(id only) → produkte → full lead select → update in sequence.
function _setupFromMock() {
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
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: INSERTED_LEAD, error: null }),
      update: vi.fn().mockReturnThis(),
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// LEGACY: Confluence has been replaced by Convexa as the lead CRM (April 2026).
// These tests describe the previous behaviour. Skipped pending re-write against
// pushLeadToConvexa contract — tracked as follow-up after Convexa API is finalized.
describe.skip('POST /api/leads — Confluence integration (legacy)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('updates lead with confluence_page_id and confluence_synced=true when createLeadPage succeeds', async () => {
    const updateSpy = vi.fn().mockReturnThis()
    const eqSpy = vi.fn().mockResolvedValue({ error: null })

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      callCount++

      if (table === 'leads' && callCount === 1) {
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

      // leads calls: full row select or update
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({ data: INSERTED_LEAD, error: null }),
          ...eqSpy(),
        })),
        update: updateSpy,
        single: vi.fn().mockResolvedValue({ data: INSERTED_LEAD, error: null }),
      }
    })

    mockCreateLeadPage.mockResolvedValue({ pageId: 'page-id-99' })

    const { POST } = await import('../route')
    const response = await POST(makeRequest(VALID_PAYLOAD) as never)

    // The route must still return 201 (lead was saved)
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.id).toBe('lead-uuid-42')
    expect(body.error).toBeNull()

    // createLeadPage must have been called
    expect(mockCreateLeadPage).toHaveBeenCalledOnce()
  })

  it('returns 201 even when createLeadPage throws — confluence_synced stays false', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      callCount++

      if (table === 'leads' && callCount === 1) {
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

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: INSERTED_LEAD, error: null }),
        update: vi.fn().mockReturnThis(),
      }
    })

    // Simulate Confluence API failure
    mockCreateLeadPage.mockRejectedValue(new Error('Confluence is down'))

    const { POST } = await import('../route')
    const response = await POST(makeRequest(VALID_PAYLOAD) as never)

    // Route must still return 201 — lead was saved successfully
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.id).toBe('lead-uuid-42')
    expect(body.error).toBeNull()

    // Error must have been logged
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
