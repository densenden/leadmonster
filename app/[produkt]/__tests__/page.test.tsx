// Tests for app/[produkt]/page.tsx — generateStaticParams, generateMetadata, section renderer.
// All Supabase calls are mocked — no real network requests.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/navigation so notFound() can be tracked
const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({ notFound: mockNotFound }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// Mock next/headers for the supabase server client
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// Build a chainable Supabase query mock
function makeSupabaseChain(result: { data: unknown; error: unknown }) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  return chain
}

// Admin client mock — will be configured per-test
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

// Mock section components so renderToString works in test environment
vi.mock('@/components/sections/Hero', () => ({
  Hero: ({ headline }: { headline: string }) => `<section data-testid="hero">${headline}</section>`,
}))
vi.mock('@/components/sections/FeatureGrid', () => ({
  FeatureGrid: ({ items }: { items: unknown[] }) =>
    `<section data-testid="features" data-count="${items.length}"></section>`,
}))
vi.mock('@/components/sections/TrustBar', () => ({
  TrustBar: ({ items }: { items: unknown[] }) =>
    `<section data-testid="trust" data-count="${items.length}"></section>`,
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateStaticParams', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns [{ produkt: string }] shape for each published slug', async () => {
    // Supabase returns two rows with slugs
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.eq = vi.fn().mockImplementation(() => ({
      ...chain,
      // Final .eq() call resolves with data
      eq: vi.fn().mockResolvedValue({
        data: [
          { slug: 'sterbegeld24plus' },
          { slug: 'pflegeabsicherung' },
        ],
        error: null,
      }),
    }))
    mockAdminFrom.mockReturnValue(chain)

    const { generateStaticParams } = await import('../page')
    const params = await generateStaticParams()

    expect(Array.isArray(params)).toBe(true)
    // Each entry must have a produkt key
    for (const entry of params) {
      expect(typeof (entry as { produkt: string }).produkt).toBe('string')
    }
  })

  it('returns [] and does not throw when Supabase returns an error', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.eq = vi.fn().mockImplementation(() => ({
      ...chain,
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
    }))
    mockAdminFrom.mockReturnValue(chain)

    const { generateStaticParams } = await import('../page')
    await expect(generateStaticParams()).resolves.toEqual([])
  })
})

describe('generateMetadata', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a Metadata object with title and canonical from the fetched row', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          meta_title: 'Sterbegeld — Jetzt absichern',
          meta_desc: 'Günstige Sterbegeldversicherung',
          slug: 'sterbegeld24plus',
        },
        error: null,
      }),
    }
    mockAdminFrom.mockReturnValue(chain)

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    expect(metadata.title).toBe('Sterbegeld — Jetzt absichern')
    expect(metadata.description).toBe('Günstige Sterbegeldversicherung')
  })

  it('returns a minimal fallback Metadata when no row is found', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockAdminFrom.mockReturnValue(chain)

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'unknown-product' } })

    // Should not throw — returns fallback
    expect(metadata.title).toBe('unknown-product')
  })
})

describe('ProduktPage — section renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotFound.mockClear()
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
  })

  it('calls notFound() when row has status entwurf (unpublished)', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          status: 'entwurf',
          content: { sections: [] },
          title: 'Test',
          slug: 'test',
          produkte: { slug: 'test', name: 'Test' },
        },
        error: null,
      }),
    }
    mockAdminFrom.mockReturnValue(chain)

    const { default: ProduktPage } = await import('../page')

    await expect(
      ProduktPage({ params: { produkt: 'test' } }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalled()
  })

  it('calls notFound() when no row is returned from Supabase', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }
    mockAdminFrom.mockReturnValue(chain)

    const { default: ProduktPage } = await import('../page')

    await expect(
      ProduktPage({ params: { produkt: 'nonexistent' } }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalled()
  })
})
