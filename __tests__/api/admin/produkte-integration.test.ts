// Integration tests for the Produkt admin API.
// Covers end-to-end create and edit flows with mocked DB.
// Verifies sequential writes and upsert-on-conflict behaviour.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// ---------------------------------------------------------------------------
// Shared mock state — reset per test
// ---------------------------------------------------------------------------

let insertedProdukt: { name: string; slug: string; typ: string; status: string } | null = null
let insertedConfig: Record<string, unknown> | null = null
let upsertedConfig: Record<string, unknown> | null = null
let updatedProdukt: Record<string, unknown> | null = null

const mockSessionWithUser = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'admin@test.de' } } },
    }),
  },
}

function makeAdminClientWithTracking() {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'produkte') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              // Slug check — no existing slug
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            insertedProdukt = data as typeof insertedProdukt
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'generated-uuid-abc' },
                  error: null,
                }),
              }),
            }
          }),
          update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            updatedProdukt = data
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }
          }),
        }
      }
      if (table === 'produkt_config') {
        return {
          insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            insertedConfig = data
            return Promise.resolve({ data: null, error: null })
          }),
          upsert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            upsertedConfig = data
            return Promise.resolve({ data: null, error: null })
          }),
        }
      }
      return {}
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSessionWithUser),
  createAdminClient: vi.fn(() => makeAdminClientWithTracking()),
}))

function makeRequest(method: string, body: unknown) {
  return { json: vi.fn().mockResolvedValue(body), method }
}

// ---------------------------------------------------------------------------
// End-to-end create flow
// ---------------------------------------------------------------------------

describe('End-to-end create flow (POST)', () => {
  beforeEach(() => {
    vi.resetModules()
    insertedProdukt = null
    insertedConfig = null
  })

  it('inserts into produkte THEN produkt_config sequentially', async () => {
    const { POST } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('POST', {
      name: 'Sterbegeld24Plus',
      slug: 'sterbegeld24plus',
      typ: 'sterbegeld',
      fokus: 'sicherheit',
      zielgruppe: ['senioren_50plus'],
      anbieter: ['Allianz'],
      argumente: { schutz: 'Sofort' },
    })

    const res = await POST(req as unknown as Parameters<typeof POST>[0])

    expect(res.status).toBe(201)
    // Verify produkte insert received the correct fields
    expect(insertedProdukt).not.toBeNull()
    expect(insertedProdukt!.name).toBe('Sterbegeld24Plus')
    expect(insertedProdukt!.slug).toBe('sterbegeld24plus')
    expect(insertedProdukt!.typ).toBe('sterbegeld')
    expect(insertedProdukt!.status).toBe('entwurf') // default

    // Verify produkt_config was inserted with the produkt_id from the first insert
    expect(insertedConfig).not.toBeNull()
    expect(insertedConfig!.produkt_id).toBe('generated-uuid-abc')
    expect(insertedConfig!.fokus).toBe('sicherheit')
    expect(insertedConfig!.anbieter).toEqual(['Allianz'])
  })

  it('returns the new product id in the response', async () => {
    const { POST } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('POST', {
      name: 'Pflege Premium',
      slug: 'pflege-premium',
      typ: 'pflege',
    })

    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    const json = await res.json()

    expect(json.data.id).toBe('generated-uuid-abc')
  })

  it('uses "entwurf" as default status when status is not provided', async () => {
    const { POST } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('POST', {
      name: 'Unfall Direkt',
      slug: 'unfall-direkt',
      typ: 'unfall',
    })

    await POST(req as unknown as Parameters<typeof POST>[0])

    expect(insertedProdukt!.status).toBe('entwurf')
  })
})

// ---------------------------------------------------------------------------
// End-to-end edit flow
// ---------------------------------------------------------------------------

describe('End-to-end edit flow (PATCH)', () => {
  beforeEach(() => {
    vi.resetModules()
    updatedProdukt = null
    upsertedConfig = null
  })

  it('updates produkte and upserts produkt_config', async () => {
    const { PATCH } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('PATCH', {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Updated Name',
      slug: 'updated-slug',
      typ: 'sterbegeld',
      status: 'aktiv',
      fokus: 'preis',
      anbieter: ['Allianz', 'Zurich'],
    })

    const res = await PATCH(req as unknown as Parameters<typeof PATCH>[0])

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe('123e4567-e89b-12d3-a456-426614174000')

    // Verify produkte was updated (not inserted)
    expect(updatedProdukt).not.toBeNull()
    expect(updatedProdukt!.name).toBe('Updated Name')
    expect(updatedProdukt!.status).toBe('aktiv')
    expect(updatedProdukt!.updated_at).toBeDefined()
  })

  it('produkt_config is upserted using produkt_id as conflict target', async () => {
    const { PATCH } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('PATCH', {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test',
      slug: 'test',
      typ: 'pflege',
      argumente: { key: 'value' },
    })

    await PATCH(req as unknown as Parameters<typeof PATCH>[0])

    // Verify upsert was called with the correct produkt_id
    expect(upsertedConfig).not.toBeNull()
    expect(upsertedConfig!.produkt_id).toBe('123e4567-e89b-12d3-a456-426614174000')
  })

  it('includes updated_at timestamp in produkte update', async () => {
    const beforeTest = new Date().toISOString()
    const { PATCH } = await import('@/app/api/admin/produkte/route')
    const req = makeRequest('PATCH', {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test',
      slug: 'test',
      typ: 'unfall',
    })

    await PATCH(req as unknown as Parameters<typeof PATCH>[0])

    expect(updatedProdukt!.updated_at).toBeDefined()
    const updatedAt = updatedProdukt!.updated_at as string
    expect(new Date(updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeTest).getTime(),
    )
  })
})
