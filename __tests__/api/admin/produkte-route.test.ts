// API route tests for POST /api/admin/produkte and PATCH /api/admin/produkte.
// Mocks both Supabase clients to avoid hitting a real database.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// --- Mock factories ---

function makeSessionClient(hasSession: boolean) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: hasSession
            ? { user: { id: 'user-1', email: 'admin@test.de' } }
            : null,
        },
        error: null,
      }),
    },
  }
}

// Fluent builder for the admin Supabase client mock.
// Each chained method returns the same builder so calls chain correctly.
function makeAdminClient({
  existingSlug = false,
  insertError = false,
  configInsertError = false,
  updateError = false,
  upsertError = false,
} = {}) {
  const mockSingle = vi.fn().mockResolvedValue({
    data: existingSlug ? { id: 'existing-id' } : null,
    error: null,
  })

  const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ single: mockSingle }),
    // For config insert (no .select chain)
    then: (resolve: (v: { data: null; error: null | { message: string } }) => void) => {
      resolve({ data: null, error: configInsertError ? { message: 'db error' } : null })
    },
  })
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: updateError ? { message: 'update error' } : null }),
  })
  const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: upsertError ? { message: 'upsert error' } : null })
  const mockMaybeSingle = vi.fn().mockResolvedValue({
    data: existingSlug ? { id: 'existing-id' } : null,
    error: null,
  })
  const mockEqForSlug = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEqForSlug })

  // Track call order per table to route correctly
  let tableCalls = 0

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'produkte') {
        tableCalls++
        return {
          select: mockSelect,
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: insertError ? null : { id: 'new-product-id' },
                error: insertError ? { message: 'insert error' } : null,
              }),
            }),
          }),
          update: mockUpdate,
        }
      }
      if (table === 'produkt_config') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: configInsertError ? { message: 'config insert error' } : null,
          }),
          upsert: mockUpsert,
        }
      }
      return {}
    }),
  }
}

// Holds current mock implementations — reset in beforeEach.
let mockSessionClient: ReturnType<typeof makeSessionClient>
let mockAdminClient: ReturnType<typeof makeAdminClient>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSessionClient),
  createAdminClient: vi.fn(() => mockAdminClient),
}))

// Helper to build a NextRequest-like object.
function makeRequest(method: string, body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
    method,
  }
}

describe('POST /api/admin/produkte', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSessionClient = makeSessionClient(true)
    mockAdminClient = makeAdminClient()
  })

  it('returns 401 when no auth session', async () => {
    mockSessionClient = makeSessionClient(false)
    const { POST } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('POST', {})
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 when required field name is missing', async () => {
    const { POST } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('POST', { slug: 'test', typ: 'sterbegeld' })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.details.name).toBeDefined()
  })

  it('returns 409 when slug already exists', async () => {
    mockAdminClient = makeAdminClient({ existingSlug: true })
    const { POST } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('POST', {
      name: 'Sterbegeld24Plus',
      slug: 'sterbegeld24plus',
      typ: 'sterbegeld',
    })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error.code).toBe('SLUG_EXISTS')
  })

  it('returns 201 with data.id on valid create', async () => {
    const { POST } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('POST', {
      name: 'Sterbegeld24Plus',
      slug: 'sterbegeld24plus',
      typ: 'sterbegeld',
      zielgruppe: ['senioren_50plus'],
      fokus: 'sicherheit',
    })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data).toBeDefined()
    expect(json.data.id).toBeDefined()
    expect(json.error).toBeNull()
  })
})

describe('PATCH /api/admin/produkte', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSessionClient = makeSessionClient(true)
    mockAdminClient = makeAdminClient()
  })

  it('returns 401 when no auth session', async () => {
    mockSessionClient = makeSessionClient(false)
    const { PATCH } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('PATCH', {})
    const res = await PATCH(req as unknown as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 when id is missing or invalid', async () => {
    const { PATCH } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('PATCH', { name: 'Test', slug: 'test', typ: 'sterbegeld' })
    const res = await PATCH(req as unknown as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 200 with data.id on valid update', async () => {
    const { PATCH } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('PATCH', {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sterbegeld24Plus',
      slug: 'sterbegeld24plus',
      typ: 'sterbegeld',
      status: 'aktiv',
    })
    const res = await PATCH(req as unknown as Parameters<typeof PATCH>[0])
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(json.error).toBeNull()
  })
})
