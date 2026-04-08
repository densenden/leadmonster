// Tests for app/api/seo/llms/route.ts — validates auth guard, file write, and content format.
// Mocks Supabase admin client to control DB responses. fs/promises is NOT mocked
// because Vitest's module isolation prevents the mock from intercepting the route's
// named import in this environment — the route writes to disk and we read it back to verify.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

// ===== Module mocks =====

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Path to the public/llms.txt file that the route overwrites.
const LLMS_PATH = join(process.cwd(), 'public', 'llms.txt')

// ===== Supabase mock builder =====

type ChainResult = { data: unknown; error: null | { message: string } }

function buildSupabaseMock(
  produkte: Array<{ id: string; slug: string; name: string }>,
  contentRows: Array<{
    slug: string
    page_type: string
    meta_desc: string | null
    produkt_id: string
  }> = [],
) {
  const makeChain = (result: ChainResult) => ({
    select: () => makeChain(result),
    eq: () => makeChain(result),
    in: () => makeChain(result),
    then: (resolve: (v: ChainResult) => unknown) => Promise.resolve(result).then(resolve),
  })

  return {
    from: vi.fn((table: string) => {
      if (table === 'produkte') return makeChain({ data: produkte, error: null })
      if (table === 'generierter_content') return makeChain({ data: contentRows, error: null })
      return makeChain({ data: [], error: null })
    }),
  }
}

// ===== Helper: build a Request with optional secret header =====

function buildRequest(secret?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret !== undefined) headers['x-internal-secret'] = secret
  return new Request('http://localhost/api/seo/llms', { method: 'POST', headers })
}

// ===== Tests: POST /api/seo/llms =====

describe('POST /api/seo/llms', () => {
  let originalLlmsContent: string

  beforeEach(async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
    process.env.INTERNAL_SECRET = 'test-secret-123'
    // Snapshot current llms.txt so we can restore it after tests that write to disk.
    originalLlmsContent = await readFile(LLMS_PATH, 'utf8').catch(() => '')
  })

  afterEach(async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    delete process.env.INTERNAL_SECRET
    vi.clearAllMocks()
    // Restore llms.txt to its pre-test state.
    if (originalLlmsContent) {
      await writeFile(LLMS_PATH, originalLlmsContent, 'utf8')
    }
  })

  it('returns 401 when x-internal-secret header is missing', async () => {
    const { POST } = await import('@/app/api/seo/llms/route')
    const response = await POST(buildRequest())
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.updated).toBe(false)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when x-internal-secret header is wrong', async () => {
    const { POST } = await import('@/app/api/seo/llms/route')
    const response = await POST(buildRequest('wrong-secret'))
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.updated).toBe(false)
  })

  it('returns 200 with updated:true and productCount on success', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValue(
      buildSupabaseMock([
        { id: 'uuid-1', slug: 'sterbegeld24plus', name: 'Sterbegeld24Plus' },
      ]) as ReturnType<typeof createAdminClient>,
    )

    const { POST } = await import('@/app/api/seo/llms/route')
    const response = await POST(buildRequest('test-secret-123'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.updated).toBe(true)
    expect(body.productCount).toBe(1)
  })

  it('overwrites public/llms.txt with the product name and canonical URL', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValue(
      buildSupabaseMock([
        { id: 'uuid-1', slug: 'sterbegeld24plus', name: 'Sterbegeld24Plus' },
      ]) as ReturnType<typeof createAdminClient>,
    )

    const { POST } = await import('@/app/api/seo/llms/route')
    const response = await POST(buildRequest('test-secret-123'))
    expect(response.status).toBe(200)

    // Read the actual file that the route wrote to disk.
    const written = await readFile(LLMS_PATH, 'utf8')
    expect(written).toContain('Sterbegeld24Plus')
    expect(written).toContain('https://leadmonster.de/sterbegeld24plus')
  })
})

// ===== Tests: publish trigger in admin content route =====

describe('admin content route publish trigger', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
    process.env.INTERNAL_SECRET = 'test-secret-123'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    delete process.env.INTERNAL_SECRET
    vi.restoreAllMocks()
  })

  it('fires a fetch to /api/seo/llms when content is published', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-user' } } }),
      },
    } as unknown as ReturnType<typeof createClient>)

    // Intercept global fetch to capture the fire-and-forget call.
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ updated: true }), { status: 200 }),
    )

    const { POST } = await import('@/app/api/admin/content/route')
    const request = new Request('http://localhost/api/admin/content', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'sterbegeld24plus' }),
    })

    await POST(request as unknown as Parameters<typeof POST>[0])

    // Give the fire-and-forget a tick to execute.
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Verify a fetch was fired toward the llms route.
    const llmsCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes('/api/seo/llms'),
    )
    expect(llmsCalls.length).toBeGreaterThanOrEqual(1)

    const [, llmsInit] = llmsCalls[0]
    const headers = llmsInit?.headers as Record<string, string>
    expect(headers?.['x-internal-secret']).toBe('test-secret-123')
  })
})
