// Integration tests for the full lead submission flow — Task 7.9.
//
// These three tests cover the critical path through POST /api/leads:
//   Test 1: valid payload → HTTP 201 with data.id
//   Test 2: DB insert is called with snake_case field mapping
//   Test 3: confluence_synced and resend_sent flags are updated after async post-save
//
// All external dependencies (Supabase, Confluence, Resend) are mocked so these
// tests run without a real database, Confluence tenant, or Resend account.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module-level mock definitions — hoisted by Vitest before imports.
// ---------------------------------------------------------------------------

// Capture the insert spy reference so Test 2 can inspect its call arguments.
const insertSpy = vi.fn().mockReturnThis()
const selectSpy = vi.fn().mockReturnThis()
const singleInsertSpy = vi.fn().mockResolvedValue({ data: { id: 'pilot-lead-uuid' }, error: null })

// updateSpy tracks all update() calls — used in Test 3 to verify flag writes.
const updateSpy = vi.fn().mockReturnThis()
const eqUpdateSpy = vi.fn().mockResolvedValue({ error: null })

// Full lead row returned when the IIFE fetches the lead for downstream use.
const FULL_LEAD_ROW = {
  id: 'pilot-lead-uuid',
  produkt_id: 'test-produkt-uuid-001',
  vorname: 'Test',
  nachname: 'Pilot',
  email: 'test@test.de',
  telefon: null,
  interesse: null,
  zielgruppe_tag: 'senioren_50plus',
  intent_tag: 'sicherheit',
  confluence_page_id: null,
  confluence_synced: false,
  resend_sent: false,
  created_at: '2026-04-08T10:00:00.000Z',
}

// Mock createAdminClient — returns a fluent Supabase-like query builder.
// The from() dispatcher differentiates calls by table name and call order.
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}))

// Mock Confluence — succeeds and returns a known pageId.
const mockCreateLeadPage = vi.fn().mockResolvedValue({ pageId: 'confluence-page-abc' })

vi.mock('@/lib/confluence/client', () => ({
  createLeadPage: mockCreateLeadPage,
}))

// Mock Resend mailer — both sends succeed by default.
const mockSendLeadConfirmation = vi.fn().mockResolvedValue(true)
const mockSendSalesNotification = vi.fn().mockResolvedValue(true)

vi.mock('@/lib/resend/mailer', () => ({
  sendLeadConfirmation: mockSendLeadConfirmation,
  sendSalesNotification: mockSendSalesNotification,
}))

// Mock next/headers — required because lib/supabase/server imports cookies().
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const VALID_PAYLOAD = {
  produktId: 'test-produkt-uuid-001',
  email: 'test@test.de',
  vorname: 'Test',
  nachname: 'Pilot',
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'sicherheit',
}

// Builds a Request with the CSRF header and correct content-type.
function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'x-forwarded-for': '10.1.2.3',
    },
    body: JSON.stringify(body),
  })
}

// Configures mockFrom to replicate the call sequence inside route.ts:
//   call 1 → leads insert → returns { id }
//   call 2 → produkte select → returns product name/slug
//   call 3+ → leads select('*') / leads update → returns full row / resolves
function setupFromMock() {
  let callCount = 0
  mockFrom.mockImplementation((table: string) => {
    callCount++

    if (table === 'leads' && callCount === 1) {
      // Insert path — route calls .insert().select('id').single()
      return {
        insert: insertSpy,
        select: selectSpy,
        single: singleInsertSpy,
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

    // Subsequent leads calls: full row fetch and flag update.
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({ data: FULL_LEAD_ROW, error: null }),
      })),
      update: updateSpy,
      single: vi.fn().mockResolvedValue({ data: FULL_LEAD_ROW, error: null }),
    }
  })

  // update() chains eq() which resolves to simulate a successful DB write.
  updateSpy.mockReturnValue({ eq: eqUpdateSpy })
}

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('Lead flow integration — Task 7.9', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setupFromMock()
  })

  // -------------------------------------------------------------------------
  // Test 1: POST to /api/leads with valid data returns 201 and has data.id
  // -------------------------------------------------------------------------
  it('Test 1: valid payload returns HTTP 201 with data.id in response body', async () => {
    const { POST } = await import('../route')
    const response = await POST(makeRequest(VALID_PAYLOAD) as never)

    // Status must be 201 (Created).
    expect(response.status).toBe(201)

    const body = await response.json()

    // Response must follow the { data, error } envelope contract.
    expect(body.error).toBeNull()
    expect(body.data).toBeDefined()
    expect(typeof body.data.id).toBe('string')
    expect(body.data.id.length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------------------
  // Test 2: DB insert is called with snake_case field mapping
  // -------------------------------------------------------------------------
  it('Test 2: Supabase insert is called with snake_case field names', async () => {
    const { POST } = await import('../route')
    await POST(makeRequest(VALID_PAYLOAD) as never)

    // insert() is called by route.ts — verify it received the snake_case payload.
    expect(insertSpy).toHaveBeenCalledOnce()
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        produkt_id: 'test-produkt-uuid-001',   // camelCase produktId → snake_case produkt_id
        email: 'test@test.de',
        intent_tag: 'sicherheit',              // camelCase intentTag → snake_case intent_tag
        zielgruppe_tag: 'senioren_50plus',     // camelCase zielgruppeTag → snake_case zielgruppe_tag
      }),
    )
  })

  // -------------------------------------------------------------------------
  // Test 3: confluence_synced and resend_sent flags are updated to true
  //
  // The IIFE in route.ts runs after the 201 response is returned; we flush the
  // microtask/macrotask queue with a short setTimeout to let it complete before
  // asserting the update() calls.
  // -------------------------------------------------------------------------
  it('Test 3: confluence_synced and resend_sent flags are updated to true after async post-save', async () => {
    const { POST } = await import('../route')
    await POST(makeRequest(VALID_PAYLOAD) as never)

    // Flush the non-blocking IIFE — 100ms gives all chained async operations time to settle.
    await new Promise<void>((resolve) => setTimeout(resolve, 100))

    // Confluence must have been called once with the full lead row.
    expect(mockCreateLeadPage).toHaveBeenCalledOnce()

    // Both email sends must have been called.
    expect(mockSendLeadConfirmation).toHaveBeenCalledOnce()
    expect(mockSendSalesNotification).toHaveBeenCalledOnce()

    // updateSpy must have been called with confluence_synced: true (Confluence update).
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ confluence_synced: true }),
    )

    // updateSpy must have been called with resend_sent: true (email update).
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ resend_sent: true }),
    )
  })
})
