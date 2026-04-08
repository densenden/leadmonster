// Tests for the public Ratgeber pages — article SSG route and index listing.
// All Supabase calls and helper functions are mocked — no real network requests.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Suppress notFound throws — track calls
const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({ notFound: mockNotFound }))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// Mock the Supabase admin client
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

// Mock ratgeber query functions
const mockFetchAllRatgeberForProdukt = vi.fn()
const mockFetchRatgeberBySlug = vi.fn()
const mockFetchAllPublishedRatgeberParams = vi.fn()

vi.mock('@/lib/supabase/ratgeber', () => ({
  fetchAllRatgeberForProdukt: (...args: unknown[]) => mockFetchAllRatgeberForProdukt(...args),
  fetchRatgeberBySlug: (...args: unknown[]) => mockFetchRatgeberBySlug(...args),
  fetchAllPublishedRatgeberParams: (...args: unknown[]) =>
    mockFetchAllPublishedRatgeberParams(...args),
}))

// Mock LeadForm to avoid fetch issues in jsdom
vi.mock('@/components/sections/LeadForm', () => ({
  LeadForm: () => React.createElement('div', { 'data-testid': 'lead-form' }, 'LeadForm'),
}))

// ---------------------------------------------------------------------------
// Test 1: generateStaticParams returns correct { produkt, thema } shape
// ---------------------------------------------------------------------------

describe('generateStaticParams — ratgeber article route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns correct { produkt, thema } shape from mocked Supabase data', async () => {
    mockFetchAllPublishedRatgeberParams.mockResolvedValue([
      { produkt: 'sterbegeld24plus', thema: 'was-ist-sterbegeld' },
      { produkt: 'sterbegeld24plus', thema: 'fuer-wen' },
    ])

    // Use absolute import path with @/ alias to avoid bracket issues
    const { generateStaticParams } = await import(
      '@/app/[produkt]/ratgeber/[thema]/page'
    )
    const params = await generateStaticParams()

    expect(Array.isArray(params)).toBe(true)
    expect(params).toHaveLength(2)
    expect(params[0]).toMatchObject({ produkt: 'sterbegeld24plus', thema: 'was-ist-sterbegeld' })
    expect(params[1]).toMatchObject({ produkt: 'sterbegeld24plus', thema: 'fuer-wen' })
  })
})

// ---------------------------------------------------------------------------
// Test 2: article page calls notFound() when fetchRatgeberBySlug returns null
// ---------------------------------------------------------------------------

describe('RatgeberArticlePage — notFound behaviour', () => {
  beforeEach(() => {
    vi.resetModules()
    mockNotFound.mockClear()
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
  })

  it('calls notFound() when fetchRatgeberBySlug returns null', async () => {
    mockFetchRatgeberBySlug.mockResolvedValue(null)

    const { default: RatgeberArticlePage } = await import(
      '@/app/[produkt]/ratgeber/[thema]/page'
    )

    await expect(
      RatgeberArticlePage({ params: { produkt: 'sterbegeld24plus', thema: 'nonexistent' } }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test 3: generateMetadata sets canonical to the correct URL pattern
// ---------------------------------------------------------------------------

describe('generateMetadata — ratgeber article', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_BASE_URL = 'leadmonster.de'
  })

  it('sets canonical to {NEXT_PUBLIC_BASE_URL}/{produkt}/ratgeber/{thema}', async () => {
    mockFetchRatgeberBySlug.mockResolvedValue({
      id: 'row-1',
      produkt_id: 'prod-1',
      page_type: 'ratgeber',
      slug: 'was-ist-sterbegeld',
      title: 'Was ist Sterbegeld?',
      meta_title: 'Was ist Sterbegeld? — Alles was Sie wissen müssen',
      meta_desc: 'Eine Sterbegeldversicherung deckt Beerdigungskosten ab.',
      content: { sections: [] },
      schema_markup: null,
      status: 'publiziert',
      generated_at: '2026-04-01T00:00:00.000Z',
      published_at: '2026-04-01T00:00:00.000Z',
    })

    const { generateMetadata } = await import(
      '@/app/[produkt]/ratgeber/[thema]/page'
    )
    const metadata = await generateMetadata({
      params: { produkt: 'sterbegeld24plus', thema: 'was-ist-sterbegeld' },
    })

    // alternates.canonical should contain the article path
    const canonical =
      typeof metadata.alternates?.canonical === 'string' ? metadata.alternates.canonical : ''
    expect(canonical).toContain('sterbegeld24plus/ratgeber/was-ist-sterbegeld')
  })
})

// ---------------------------------------------------------------------------
// Test 4: index page renders a card for each article in the mocked list
// ---------------------------------------------------------------------------

describe('RatgeberIndexPage — card grid', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders a card for each article in the mocked list', async () => {
    // Mock produkte lookup
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'prod-1',
          name: 'Sterbegeld24Plus',
          slug: 'sterbegeld24plus',
          domain: null,
        },
        error: null,
      }),
    })

    mockFetchAllRatgeberForProdukt.mockResolvedValue([
      {
        id: 'art-1',
        slug: 'was-ist-sterbegeld',
        title: 'Was ist Sterbegeld?',
        meta_desc: 'Alles über Sterbegeld.',
        content: { sections: [{ type: 'intro', text: 'Intro text.' }] },
        published_at: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'art-2',
        slug: 'fuer-wen',
        title: 'Für wen eignet sich Sterbegeld?',
        meta_desc: 'Sterbegeld eignet sich besonders für Senioren.',
        content: { sections: [{ type: 'intro', text: 'Intro text.' }] },
        published_at: '2026-04-02T00:00:00.000Z',
      },
    ])

    const { default: RatgeberIndexPage } = await import('@/app/[produkt]/ratgeber/page')
    const element = await RatgeberIndexPage({ params: { produkt: 'sterbegeld24plus' } })
    render(element as React.ReactElement)

    expect(screen.getByText('Was ist Sterbegeld?')).toBeDefined()
    expect(screen.getByText('Für wen eignet sich Sterbegeld?')).toBeDefined()
  })
})
