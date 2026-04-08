// Tests for the /api/generate POST route handler.
// generateContent is mocked — route internals only (auth, validation, response mapping) are tested.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GenerationResult } from '@/lib/anthropic/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockGenerateContent = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('@/lib/anthropic/generator', () => ({
  generateContent: mockGenerateContent,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

function makeAllSuccessResult(count = 7): GenerationResult {
  return {
    success: Array.from({ length: count }, (_, i) => ({
      page_type: 'hauptseite' as const,
      slug: `slug-${i}`,
      rowId: `row-${i}`,
    })),
    failed: [],
  }
}

function makePartialResult(): GenerationResult {
  return {
    success: [{ page_type: 'hauptseite', slug: 'hauptseite', rowId: 'row-1' }],
    failed: [{ page_type: 'faq', error_message: 'Timeout', attempt_count: 1 }],
  }
}

function makeAllFailedResult(): GenerationResult {
  return {
    success: [],
    failed: [
      { page_type: 'hauptseite', error_message: 'Error', attempt_count: 1 },
      { page_type: 'faq', error_message: 'Error', attempt_count: 1 },
    ],
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no authenticated user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ produktId: VALID_UUID }) as never)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.data).toBeNull()
  })

  it('returns 400 when produktId is not a valid UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ produktId: 'not-a-uuid' }) as never)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when request body is not valid JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { POST } = await import('../route')
    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: 'not json',
    })
    const response = await POST(req as never)

    expect(response.status).toBe(400)
  })

  it('returns 200 with generatedCount 7 when all page types succeed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockGenerateContent.mockResolvedValue(makeAllSuccessResult(7))

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ produktId: VALID_UUID }) as never)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.generatedCount).toBe(7)
    expect(body.data.errors).toHaveLength(0)
    expect(body.error).toBeNull()
  })

  it('returns 207 when generation partially succeeds', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockGenerateContent.mockResolvedValue(makePartialResult())

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ produktId: VALID_UUID }) as never)

    expect(response.status).toBe(207)
    const body = await response.json()
    expect(body.data.generatedCount).toBe(1)
    expect(body.data.errors).toHaveLength(1)
  })

  it('returns 500 when all generation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockGenerateContent.mockResolvedValue(makeAllFailedResult())

    const { POST } = await import('../route')
    const response = await POST(makeRequest({ produktId: VALID_UUID }) as never)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error.code).toBe('GENERATION_FAILED')
    expect(body.data).toBeNull()
  })
})
