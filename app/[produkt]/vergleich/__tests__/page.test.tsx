// Tests for app/[produkt]/vergleich/page.tsx — generateStaticParams, generateMetadata, page rendering.
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

// Mock Next.js Link so JSX renders cleanly in jsdom
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    `<a href="${href}">${children}</a>`,
}))

// Mock the Vergleich component so JSX renders cleanly
vi.mock('@/components/sections/Vergleich', () => ({
  Vergleich: () => '<table data-testid="vergleich-table"></table>',
}))

// Mock the LeadForm component — accepts new required props
vi.mock('@/components/sections/LeadForm', () => ({
  LeadForm: ({
    produktId,
    zielgruppeTag,
    intentTag,
  }: {
    produktId: string
    zielgruppeTag: string
    intentTag: string
  }) =>
    `<div data-testid="lead-form" data-product="${produktId}" data-zielgruppe="${zielgruppeTag}" data-intent="${intentTag}"></div>`,
}))

// Admin client mock — reconfigured per-test via mockAdminFrom
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

function makeProduktRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-uuid-1',
    slug: 'sterbegeld24plus',
    name: 'Sterbegeld24Plus',
    typ: 'sterbegeld',
    status: 'aktiv',
    ...overrides,
  }
}

function makeConfigRow(overrides: Record<string, unknown> = {}) {
  return {
    anbieter: ['AXA', 'Allianz'],
    argumente: null,
    zielgruppe: ['senioren_50plus'],
    ...overrides,
  }
}

function makeContentRow(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Vergleich Sterbegeld24Plus',
    meta_title: 'Sterbegeld24Plus Anbieter im Vergleich 2026',
    meta_desc: 'Vergleichen Sie AXA und Allianz Sterbegeldversicherungen.',
    content: {
      sections: [
        {
          type: 'vergleich',
          intro: 'Im folgenden Vergleich stellen wir AXA und Allianz gegenüber.',
          criteria: [
            { label: 'Sofortleistung', values: { AXA: true, Allianz: false } },
          ],
        },
      ],
    },
    schema_markup: null,
    status: 'publiziert',
    generated_at: '2026-04-02T10:30:00Z',
    ...overrides,
  }
}

// Build a chainable Supabase mock where .single() returns the given result
function makeChain(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
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

  it('returns meta_title and canonical URL from DB row when vergleich content exists', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      if (callCount === 2) return makeChain({ data: makeConfigRow(), error: null })
      return makeChain({ data: makeContentRow(), error: null })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    expect(metadata.title).toBeDefined()
    const canonical = (metadata.alternates as { canonical: string })?.canonical
    expect(canonical).toContain('sterbegeld24plus/vergleich')
  })

  it('falls back to default title when no DB row exists', async () => {
    mockAdminFrom.mockImplementation(() =>
      makeChain({ data: null, error: { code: 'PGRST116' } })
    )

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'nonexistent' } })

    expect(metadata.title).toBe('Anbietervergleich')
    expect(metadata.description).toBe('Vergleichen Sie die besten Anbieter.')
  })
})

describe('VergleichPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
  })

  it('calls notFound() when no published vergleich row is found', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      if (callCount === 2) return makeChain({ data: makeConfigRow(), error: null })
      // Third call — content — returns null
      return makeChain({ data: null, error: { code: 'PGRST116' } })
    })

    const { default: VergleichPage } = await import('../page')
    await expect(
      VergleichPage({ params: { produkt: 'sterbegeld24plus' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('calls notFound() when content status is not publiziert', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      if (callCount === 2) return makeChain({ data: makeConfigRow(), error: null })
      return makeChain({ data: makeContentRow({ status: 'entwurf' }), error: null })
    })

    const { default: VergleichPage } = await import('../page')
    await expect(
      VergleichPage({ params: { produkt: 'sterbegeld24plus' } })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('renders without throwing when all data is present and publiziert', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      if (callCount === 2) return makeChain({ data: makeConfigRow(), error: null })
      return makeChain({ data: makeContentRow(), error: null })
    })

    const { default: VergleichPage } = await import('../page')
    const result = await VergleichPage({ params: { produkt: 'sterbegeld24plus' } })
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
