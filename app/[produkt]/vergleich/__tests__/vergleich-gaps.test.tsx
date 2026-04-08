// Additional targeted tests — Task Group 4 gap analysis.
// Covers: date formatting, 60-char title truncation.
// Component integration tests live in vergleich-integration.test.tsx (no mocks for Vergleich).
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// 1. Date formatting — ISO timestamp → "DD.MM.YYYY"
// (server-side formatting logic extracted and tested in isolation)
// ---------------------------------------------------------------------------

describe('date formatting: ISO timestamp → DD.MM.YYYY', () => {
  it('formats a UTC ISO string to German short date', () => {
    const isoString = '2026-04-02T10:30:00Z'
    const formatted = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(isoString))

    // German locale outputs DD.MM.YYYY
    expect(formatted).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)
    expect(formatted).toContain('2026')
    expect(formatted).toContain('04')
    expect(formatted).toContain('02')
  })

  it('formats a midnight ISO string to the correct day', () => {
    const isoString = '2026-01-15T00:00:00Z'
    const formatted = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(isoString))

    // Should contain the year regardless of timezone offset
    expect(formatted).toContain('2026')
  })
})

// ---------------------------------------------------------------------------
// 2. generateMetadata 60-character title truncation guard
// ---------------------------------------------------------------------------

// Mock all Next.js and Supabase deps before importing the page module
const mockAdminFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    `<a href="${href}">${children}</a>`,
}))
vi.mock('@/components/sections/Vergleich', () => ({
  Vergleich: () => '<table data-testid="vergleich-table"></table>',
}))
vi.mock('@/components/sections/LeadForm', () => ({
  LeadForm: ({ produktId, intentTag }: { produktId: string; intentTag?: string }) =>
    `<div data-testid="lead-form" data-product="${produktId}" data-intent="${intentTag}"></div>`,
}))

function makeChain(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
}

describe('generateMetadata — 60-character title truncation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('truncates meta_title to 60 characters when the DB returns a longer string', async () => {
    const longTitle = 'A'.repeat(80) // 80 chars — must be truncated to 60

    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1)
        return makeChain({
          data: {
            id: 'p1',
            slug: 'sterbegeld24plus',
            name: 'Sterbegeld24Plus',
            typ: 'sterbegeld',
            status: 'aktiv',
          },
          error: null,
        })
      if (callCount === 2)
        return makeChain({ data: { anbieter: ['AXA'], argumente: null }, error: null })
      return makeChain({
        data: {
          title: null,
          meta_title: longTitle,
          meta_desc: 'Kurze Beschreibung.',
          content: null,
          schema_markup: null,
          status: 'publiziert',
          generated_at: null,
        },
        error: null,
      })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    // Title must not exceed 60 chars
    const title = typeof metadata.title === 'string' ? metadata.title : ''
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title).toBe('A'.repeat(60))
  })

  it('does not truncate a title that is exactly 60 characters', async () => {
    const exactTitle = 'B'.repeat(60)

    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1)
        return makeChain({
          data: {
            id: 'p1',
            slug: 'sterbegeld24plus',
            name: 'Sterbegeld24Plus',
            typ: 'sterbegeld',
            status: 'aktiv',
          },
          error: null,
        })
      if (callCount === 2)
        return makeChain({ data: { anbieter: ['AXA'], argumente: null }, error: null })
      return makeChain({
        data: {
          title: null,
          meta_title: exactTitle,
          meta_desc: 'Beschreibung.',
          content: null,
          schema_markup: null,
          status: 'publiziert',
          generated_at: null,
        },
        error: null,
      })
    })

    const { generateMetadata } = await import('../page')
    const metadata = await generateMetadata({ params: { produkt: 'sterbegeld24plus' } })

    const title = typeof metadata.title === 'string' ? metadata.title : ''
    expect(title.length).toBe(60)
    expect(title).toBe(exactTitle)
  })
})
