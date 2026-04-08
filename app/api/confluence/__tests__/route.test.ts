// Tests for POST /api/confluence — manual Confluence re-sync route.
// Supabase clients and createLeadPage are mocked — no live calls in tests.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockCreateLeadPage = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('@/lib/confluence/client', () => ({
  createLeadPage: mockCreateLeadPage,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_LEAD_ID = '123e4567-e89b-12d3-a456-426614174000'
const PRODUKT_ID = '987fcdeb-51a2-43d7-b456-426614174111'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/confluence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Chainable Supabase query mock returning a single row.
function makeSingleChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/confluence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no authenticated session exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ leadId: VALID_LEAD_ID }) as never)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.data).toBeNull()
  })

  it('returns 400 when leadId is not a valid UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ leadId: 'not-a-uuid' }) as never)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.data).toBeNull()
  })

  it('returns 404 when no lead row exists for the given leadId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const chain = makeSingleChain({ data: null, error: { code: 'PGRST116' } })
    mockFrom.mockReturnValue(chain)

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ leadId: VALID_LEAD_ID }) as never)

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.data).toBeNull()
  })

  it('returns 200 with "already synced" message and does NOT call createLeadPage when confluence_synced is true', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const existingLead = {
      id: VALID_LEAD_ID,
      produkt_id: PRODUKT_ID,
      email: 'test@example.de',
      confluence_synced: true,
      confluence_page_id: 'conf-page-42',
      resend_sent: false,
    }

    const chain = makeSingleChain({ data: existingLead, error: null })
    mockFrom.mockReturnValue(chain)

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ leadId: VALID_LEAD_ID }) as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.message).toMatch(/already synced/i)
    expect(body.data.confluencePageId).toBe('conf-page-42')
    expect(body.error).toBeNull()
    // createLeadPage must NOT have been called
    expect(mockCreateLeadPage).not.toHaveBeenCalled()
  })

  it('returns 200 with confluencePageId and updates the lead row on successful re-sync', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const unsyncedLead = {
      id: VALID_LEAD_ID,
      produkt_id: PRODUKT_ID,
      email: 'test@example.de',
      confluence_synced: false,
      confluence_page_id: null,
      resend_sent: false,
    }

    const produkt = { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' }

    // First call: fetch lead; second call: fetch produkt; third: update lead
    let fromCallCount = 0
    mockFrom.mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        // leads query
        return makeSingleChain({ data: unsyncedLead, error: null })
      }
      if (fromCallCount === 2) {
        // produkte query
        return makeSingleChain({ data: produkt, error: null })
      }
      // update call
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    mockCreateLeadPage.mockResolvedValue({ pageId: 'new-page-99' })

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ leadId: VALID_LEAD_ID }) as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.confluencePageId).toBe('new-page-99')
    expect(body.error).toBeNull()
    expect(mockCreateLeadPage).toHaveBeenCalledOnce()
  })
})
