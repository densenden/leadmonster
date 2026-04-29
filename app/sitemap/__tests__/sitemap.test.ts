// Tests for app/sitemap.ts — validates the MetadataRoute.Sitemap output.
// Mocks the Supabase admin client and NEXT_PUBLIC_BASE_URL to keep tests offline.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { MetadataRoute } from 'next'

// ===== Supabase mock factory =====

type MockData = {
  produkte: Array<{ id: string; slug: string; updated_at: string }> | null
  ratgeber: Array<{
    slug: string | null
    published_at: string | null
    produkte: { slug: string } | null
  }> | null
}

function buildSupabaseMock(data: MockData) {
  // Chainable query builder mock.
  const makeBuilder = (result: { data: unknown; error: null }) => {
    const builder = {
      select: () => builder,
      eq: (_col: string, _val: string) => builder,
      then: (resolve: (v: { data: unknown; error: null }) => unknown) => resolve(result),
      [Symbol.toStringTag]: 'Promise',
    }
    // Make it await-able.
    Object.defineProperty(builder, Symbol.toStringTag, { value: 'Promise' })
    return {
      ...builder,
      // awaiting the builder resolves to the result
      then: (onfulfilled: (v: typeof result) => unknown) =>
        Promise.resolve(result).then(onfulfilled),
    }
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'produkte') return makeBuilder({ data: data.produkte, error: null })
      if (table === 'generierter_content') return makeBuilder({ data: data.ratgeber, error: null })
      return makeBuilder({ data: null, error: null })
    }),
  }
}

// ===== Module mocks =====

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

// ===== Tests =====

describe('sitemap', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function getSitemap(data: MockData): Promise<MetadataRoute.Sitemap> {
    const { createAdminClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValue(buildSupabaseMock(data) as unknown as ReturnType<typeof createAdminClient>)
    // Re-import sitemap fresh after mocks are configured.
    const { default: sitemapFn } = await import('@/app/sitemap')
    return sitemapFn()
  }

  it('homepage is always included with priority 0.9 and changeFrequency weekly', async () => {
    const result = await getSitemap({ produkte: [], ratgeber: [] })
    const homepage = result.find((e) => e.url === 'https://leadmonster.de/')
    expect(homepage).toBeDefined()
    expect(homepage?.priority).toBe(0.9)
    expect(homepage?.changeFrequency).toBe('weekly')
  })

  it('a published product generates exactly 4 sub-routes', async () => {
    const result = await getSitemap({
      produkte: [{ id: 'abc', slug: 'sterbegeld24plus', updated_at: '2026-04-01T00:00:00Z' }],
      ratgeber: [],
    })
    const produktRoutes = result.filter((e) => e.url.includes('/sterbegeld24plus'))
    // /sterbegeld24plus, /sterbegeld24plus/faq, /sterbegeld24plus/vergleich, /sterbegeld24plus/tarife
    expect(produktRoutes).toHaveLength(4)
    const paths = produktRoutes.map((e) => new URL(e.url).pathname)
    expect(paths).toContain('/sterbegeld24plus')
    expect(paths).toContain('/sterbegeld24plus/faq')
    expect(paths).toContain('/sterbegeld24plus/vergleich')
    expect(paths).toContain('/sterbegeld24plus/tarife')
  })

  it('assigns correct priority and changeFrequency per route type', async () => {
    const result = await getSitemap({
      produkte: [{ id: 'abc', slug: 'testprodukt', updated_at: '2026-04-01T00:00:00Z' }],
      ratgeber: [],
    })

    const get = (path: string) =>
      result.find((e) => new URL(e.url).pathname === path)

    expect(get('/testprodukt')?.priority).toBe(1.0)
    expect(get('/testprodukt')?.changeFrequency).toBe('weekly')

    expect(get('/testprodukt/faq')?.priority).toBe(0.8)
    expect(get('/testprodukt/faq')?.changeFrequency).toBe('monthly')

    expect(get('/testprodukt/vergleich')?.priority).toBe(0.8)
    expect(get('/testprodukt/vergleich')?.changeFrequency).toBe('monthly')

    expect(get('/testprodukt/tarife')?.priority).toBe(0.7)
    expect(get('/testprodukt/tarife')?.changeFrequency).toBe('monthly')
  })

  it('excludes products that are not published', async () => {
    // The mock only returns rows that match the filter — so passing empty array
    // simulates "no published products found".
    const result = await getSitemap({ produkte: [], ratgeber: [] })
    const nonHomepageRoutes = result.filter((e) => new URL(e.url).pathname !== '/')
    expect(nonHomepageRoutes).toHaveLength(0)
  })

  it('includes ratgeber entries from generierter_content with priority 0.6', async () => {
    const result = await getSitemap({
      produkte: [{ id: 'abc', slug: 'sterbegeld24plus', updated_at: '2026-04-01T00:00:00Z' }],
      ratgeber: [
        {
          slug: 'was-ist-sterbegeld',
          published_at: '2026-03-15T00:00:00Z',
          produkte: { slug: 'sterbegeld24plus' },
        },
      ],
    })

    const ratgeberEntry = result.find((e) =>
      new URL(e.url).pathname === '/sterbegeld24plus/ratgeber/was-ist-sterbegeld',
    )
    expect(ratgeberEntry).toBeDefined()
    expect(ratgeberEntry?.priority).toBe(0.6)
    expect(ratgeberEntry?.changeFrequency).toBe('monthly')
    expect(ratgeberEntry?.lastModified).toBe('2026-03-15T00:00:00Z')
  })

  it('returns empty array when NEXT_PUBLIC_BASE_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    const { createAdminClient } = await import('@/lib/supabase/server')
    vi.mocked(createAdminClient).mockReturnValue(
      buildSupabaseMock({ produkte: [], ratgeber: [] }) as unknown as ReturnType<typeof createAdminClient>,
    )
    const { default: sitemapFn } = await import('@/app/sitemap')
    const result = await sitemapFn()
    expect(result).toEqual([])
  })
})
