// Tests for PATCH /api/admin/content/[id] route handler.
// Supabase clients are mocked — no real DB connections are made.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockUpdate = vi.fn()

// Chainable query builder mock: update().eq().select().single()
function makeQueryChain(result: { data: unknown; error: unknown }) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  }
  chain.update = vi.fn().mockReturnValue(chain)
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ID = '123e4567-e89b-12d3-a456-426614174000'

function makeRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/admin/content/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: { id } }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/content/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('returns 200 with the updated row on a valid PATCH body', async () => {
    const updatedRow = {
      id: VALID_ID,
      title: 'Neuer Titel',
      meta_title: 'Kurzer Meta-Titel',
      meta_desc: 'Kurze Meta-Beschreibung für die Seite',
      status: 'entwurf',
    }

    // Set up the chained query mock
    const chain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    }
    mockUpdate.mockReturnValue(chain)

    const { PATCH } = await import('../[id]/route')
    const response = await PATCH(
      makeRequest(VALID_ID, { title: 'Neuer Titel', meta_title: 'Kurzer Meta-Titel' }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toEqual(updatedRow)
    expect(body.error).toBeNull()
  })

  it('returns 422 when meta_title exceeds 60 characters', async () => {
    const { PATCH } = await import('../[id]/route')
    const response = await PATCH(
      makeRequest(VALID_ID, { meta_title: 'a'.repeat(61) }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toBeDefined()
    expect(body.error.details.meta_title).toBeDefined()
    expect(body.data).toBeNull()
  })

  it('returns 422 when meta_desc exceeds 160 characters', async () => {
    const { PATCH } = await import('../[id]/route')
    const response = await PATCH(
      makeRequest(VALID_ID, { meta_desc: 'a'.repeat(161) }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.meta_desc).toBeDefined()
    expect(body.data).toBeNull()
  })

  it('returns 404 when the row id does not exist in the database', async () => {
    // Supabase PostgREST returns PGRST116 when .single() finds no rows.
    const chain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockUpdate.mockReturnValue(chain)

    const { PATCH } = await import('../[id]/route')
    const response = await PATCH(
      makeRequest(VALID_ID, { title: 'Something' }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 401 when the request is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { PATCH } = await import('../[id]/route')
    const response = await PATCH(
      makeRequest(VALID_ID, { title: 'Something' }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })
})
