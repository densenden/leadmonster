// Tests for app/[produkt]/tarife/page.tsx — generateMetadata and 404 handling.
// All Supabase calls are mocked — no real network requests.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Track notFound calls; make it throw so async page function terminates
const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({ notFound: mockNotFound }))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// Mock TarifRechner — avoids importing client-component deps in a server test
vi.mock('@/components/sections/TarifRechner', () => ({
  TarifRechner: () => '<div data-testid="tarif-rechner" />',
}))

// Build a chainable Supabase query mock that resolves via .single()
function makeChain(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  }
  return chain
}

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

function makeConfigRow() {
  return { anbieter: ['Allianz', 'AXA', 'Generali'] }
}

function makeContentRow(overrides: Record<string, unknown> = {}) {
  return {
    meta_title: 'Sterbegeld24Plus Tarifrechner',
    meta_desc: 'Berechnen Sie Ihren monatlichen Beitrag.',
    status: 'publiziert',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TarifePage — notFound behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
  })

  it('calls notFound() when the product row is not found in Supabase', async () => {
    // All three queries (produkt, config, content) go through mockAdminFrom.
    // First call (produkt) returns null — the page must call notFound immediately.
    mockAdminFrom.mockImplementation(() =>
      makeChain({ data: null, error: { code: 'PGRST116' } })
    )

    const { default: TarifePage } = await import('../page')
    await expect(TarifePage({ params: { produkt: 'does-not-exist' } })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('calls notFound() when the product status is not "aktiv"', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1)
        return makeChain({
          data: makeProduktRow({ status: 'entwurf' }),
          error: null,
        })
      return makeChain({ data: makeConfigRow(), error: null })
    })

    const { default: TarifePage } = await import('../page')
    await expect(TarifePage({ params: { produkt: 'sterbegeld24plus' } })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(mockNotFound).toHaveBeenCalled()
  })
})

describe('TarifePage — generateMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns the fallback title when no published tarif content row exists', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      if (callCount === 2) return makeChain({ data: makeConfigRow(), error: null })
      // Third call (generierter_content) returns null
      return makeChain({ data: null, error: { code: 'PGRST116' } })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    expect(typeof metadata.title).toBe('string')
    expect(metadata.title as string).toContain('Sterbegeld24Plus')
    expect(metadata.title as string).toContain('Tarifrechner')
    expect((metadata.title as string).length).toBeLessThanOrEqual(60)
  })

  it('returns the meta_title from generierter_content when a published row exists', async () => {
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      if (callCount === 2) return makeChain({ data: makeConfigRow(), error: null })
      return makeChain({ data: makeContentRow(), error: null })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    expect(metadata.title).toBe('Sterbegeld24Plus Tarifrechner')
  })

  it('enforces a maximum title length of 60 characters', async () => {
    const longTitle = 'A'.repeat(80)
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeChain({ data: makeProduktRow(), error: null })
      if (callCount === 2) return makeChain({ data: makeConfigRow(), error: null })
      return makeChain({ data: makeContentRow({ meta_title: longTitle }), error: null })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    expect((metadata.title as string).length).toBeLessThanOrEqual(60)
  })

  it('returns noindex fallback metadata when the product slug does not exist', async () => {
    mockAdminFrom.mockImplementation(() =>
      makeChain({ data: null, error: { code: 'PGRST116' } })
    )

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'nonexistent' } })

    expect((metadata.robots as { index: boolean }).index).toBe(false)
  })
})
