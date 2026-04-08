// Gap tests for PATCH /api/admin/content/[id] — integration-level scenarios.
// Covers: exact-limit validation, published_at auto-set, unauthenticated rejection.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockUpdate = vi.fn()

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
// Gap tests
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/content/[id] — integration gaps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('accepts meta_title of exactly 60 characters (boundary value — must return 200)', async () => {
    const exactTitle = 'a'.repeat(60)
    const updatedRow = { id: VALID_ID, meta_title: exactTitle }

    const chain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
    }
    mockUpdate.mockReturnValue(chain)

    const { PATCH } = await import('../[id]/route')
    const response = await PATCH(
      makeRequest(VALID_ID, { meta_title: exactTitle }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.error).toBeNull()
  })

  it('rejects unauthenticated PATCH with 401 (auth guard enforced)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { PATCH } = await import('../[id]/route')
    const response = await PATCH(
      makeRequest(VALID_ID, { title: 'Test' }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.data).toBeNull()
  })

  it('auto-sets published_at when advancing to publiziert status', async () => {
    let capturedUpdateData: Record<string, unknown> = {}

    const chain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: VALID_ID, status: 'publiziert', published_at: '2026-04-07T10:00:00.000Z' },
        error: null,
      }),
    }
    // Capture the argument passed to .update() to verify published_at is set
    mockUpdate.mockImplementation((data: Record<string, unknown>) => {
      capturedUpdateData = data
      return chain
    })

    const { PATCH } = await import('../[id]/route')
    await PATCH(
      makeRequest(VALID_ID, { status: 'publiziert' }) as never,
      makeParams(VALID_ID) as never,
    )

    // published_at should have been added to the update payload automatically
    expect(capturedUpdateData.published_at).toBeDefined()
    expect(typeof capturedUpdateData.published_at).toBe('string')
  })

  it('does NOT overwrite explicit published_at when provided in the body', async () => {
    const explicitDate = '2026-01-01T00:00:00.000Z'
    let capturedUpdateData: Record<string, unknown> = {}

    const chain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: VALID_ID, status: 'publiziert', published_at: explicitDate },
        error: null,
      }),
    }
    mockUpdate.mockImplementation((data: Record<string, unknown>) => {
      capturedUpdateData = data
      return chain
    })

    const { PATCH } = await import('../[id]/route')
    await PATCH(
      makeRequest(VALID_ID, { status: 'publiziert', published_at: explicitDate }) as never,
      makeParams(VALID_ID) as never,
    )

    expect(capturedUpdateData.published_at).toBe(explicitDate)
  })
})
