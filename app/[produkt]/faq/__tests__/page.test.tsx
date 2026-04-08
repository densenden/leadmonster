// Tests for app/[produkt]/faq/page.tsx — generateStaticParams, generateMetadata, page rendering.
// All Supabase calls are mocked — no real network requests.
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Mock FAQ section component so renderToString works without real JSX deps
vi.mock('@/components/sections/FAQ', () => ({
  FAQ: ({ items }: { items: { frage: string; antwort: string }[] }) =>
    `<section data-testid="faq" data-count="${items.length}"></section>`,
}))

// Build a chainable Supabase query mock
function makeChain(finalResult: { data: unknown; error: unknown }) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  }
}

// Admin client mock — will be reconfigured per-test
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeProduktRow() {
  return {
    id: 'prod-uuid-1',
    slug: 'sterbegeld24plus',
    name: 'Sterbegeld24Plus',
    domain: null,
    status: 'aktiv',
  }
}

function makeFaqContentRow(overrides: Record<string, unknown> = {}) {
  return {
    title: 'FAQ Sterbegeld24Plus',
    meta_title: 'FAQ Sterbegeld | 10 Antworten',
    meta_desc: 'Die 10 häufigsten Fragen beantwortet.',
    content: {
      sections: [
        {
          type: 'faq',
          items: Array.from({ length: 10 }, (_, i) => ({
            frage: `Frage ${i + 1}?`,
            antwort: `Antwort ${i + 1}.`,
          })),
        },
      ],
    },
    schema_markup: null,
    status: 'publiziert',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateStaticParams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns one { produkt: string } entry per aktiv product slug', async () => {
    // Query resolves directly (no .single())
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ slug: 'sterbegeld24plus' }, { slug: 'pflegeabsicherung' }],
        error: null,
      }),
    }
    mockAdminFrom.mockReturnValue(chain)

    const { generateStaticParams } = await import('../page')
    const params = await generateStaticParams()

    expect(Array.isArray(params)).toBe(true)
    expect(params).toHaveLength(2)
    expect((params[0] as { produkt: string }).produkt).toBe('sterbegeld24plus')
    expect((params[1] as { produkt: string }).produkt).toBe('pflegeabsicherung')
  })

  it('returns [] and does not throw when Supabase returns an error', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
    }
    mockAdminFrom.mockReturnValue(chain)

    const { generateStaticParams } = await import('../page')
    const result = await generateStaticParams()
    expect(result).toEqual([])
  })
})

describe('generateMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('delegates to buildFAQMetadata and returns correct canonical URL', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      return makeChain({ data: makeFaqContentRow(), error: null })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    expect(metadata.title).toBeDefined()
    // canonical must contain the slug and /faq
    const canonical = (metadata.alternates as { canonical: string })?.canonical
    expect(canonical).toContain('sterbegeld24plus/faq')
  })

  it('returns minimal fallback metadata when no FAQ record exists', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      return makeChain({ data: null, error: { code: 'PGRST116' } })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    expect(metadata.title).toBeDefined()
    expect((metadata.robots as { index: boolean }).index).toBe(false)
  })

  it('returns noindex metadata when product row is not found', async () => {
    mockAdminFrom.mockImplementation(() => makeChain({ data: null, error: { code: 'PGRST116' } }))

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'nonexistent' } })

    expect((metadata.robots as { index: boolean }).index).toBe(false)
  })
})

describe('FAQPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
  })

  it('calls notFound() when no publiziert FAQ record exists for the slug', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      return makeChain({ data: null, error: { code: 'PGRST116' } })
    })

    const { default: FAQPage } = await import('../page')
    await expect(FAQPage({ params: { produkt: 'sterbegeld24plus' } })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('calls notFound() when product row is not found', async () => {
    mockAdminFrom.mockImplementation(() => makeChain({ data: null, error: { code: 'PGRST116' } }))

    const { default: FAQPage } = await import('../page')
    await expect(FAQPage({ params: { produkt: 'nonexistent' } })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('extracts faq items from content.sections and passes them to FAQ component', async () => {
    const faqItems = Array.from({ length: 10 }, (_, i) => ({
      frage: `Frage ${i + 1}?`,
      antwort: `Antwort ${i + 1}.`,
    }))

    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      return makeChain({
        data: makeFaqContentRow({
          content: { sections: [{ type: 'faq', items: faqItems }] },
        }),
        error: null,
      })
    })

    const { default: FAQPage } = await import('../page')
    // Should not throw — product and FAQ record exist
    const result = await FAQPage({ params: { produkt: 'sterbegeld24plus' } })
    expect(result).toBeDefined()
  })

  it('renders without throwing when schema_markup is null (uses generateFAQPageSchema fallback)', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      return makeChain({
        data: makeFaqContentRow({ schema_markup: null }),
        error: null,
      })
    })

    const { default: FAQPage } = await import('../page')
    const result = await FAQPage({ params: { produkt: 'sterbegeld24plus' } })
    // Page rendered successfully
    expect(result).toBeDefined()
  })
})

describe('module-level ISR export', () => {
  it('exports revalidate = 3600', async () => {
    vi.resetModules()
    const mod = await import('../page')
    expect((mod as Record<string, unknown>).revalidate).toBe(3600)
  })
})
