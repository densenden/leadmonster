// Gap analysis tests for the Ratgeber feature.
// Covers critical workflows not addressed by the primary task group tests.
// Focused on: breadcrumb rendering, intent tag derivation, API route, reading time display.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

const mockFetchRatgeberBySlug = vi.fn()
const mockFetchAllPublishedRatgeberParams = vi.fn()
const mockFetchAllRatgeberForProdukt = vi.fn()

vi.mock('@/lib/supabase/ratgeber', () => ({
  fetchRatgeberBySlug: (...args: unknown[]) => mockFetchRatgeberBySlug(...args),
  fetchAllPublishedRatgeberParams: (...args: unknown[]) =>
    mockFetchAllPublishedRatgeberParams(...args),
  fetchAllRatgeberForProdukt: (...args: unknown[]) => mockFetchAllRatgeberForProdukt(...args),
}))

vi.mock('@/components/sections/LeadForm', () => ({
  LeadForm: ({ intentTag }: { intentTag: string }) =>
    React.createElement('div', { 'data-testid': 'lead-form', 'data-intent': intentTag }, 'LeadForm'),
}))

// ---------------------------------------------------------------------------
// Shared mock data factory
// ---------------------------------------------------------------------------

function makePublishedRatgeberRow(
  slug: string,
  overrides: Partial<{
    title: string
    sections: unknown[]
  }> = {},
) {
  return {
    id: `row-${slug}`,
    produkt_id: 'prod-1',
    page_type: 'ratgeber',
    slug,
    title: overrides.title ?? 'Testartikel',
    meta_title: 'Test Meta Title',
    meta_desc: 'Test meta description for this article.',
    content: { sections: overrides.sections ?? [] },
    schema_markup: null,
    status: 'publiziert' as const,
    generated_at: '2026-04-01T00:00:00.000Z',
    published_at: '2026-04-01T00:00:00.000Z',
  }
}

function mockProduktQuery() {
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
}

// ---------------------------------------------------------------------------
// Gap Test 1: deriveIntentTag returns 'preis' for slug containing 'kosten'
// ---------------------------------------------------------------------------

describe('deriveIntentTag — unit', () => {
  it('returns preis for slug containing kosten', async () => {
    const { deriveIntentTag } = await import(
      '@/app/[produkt]/ratgeber/[thema]/_components/ratgeber-renderer'
    )
    expect(deriveIntentTag('kosten-leistungen')).toBe('preis')
  })

  it('returns preis for slug containing preis', async () => {
    const { deriveIntentTag } = await import(
      '@/app/[produkt]/ratgeber/[thema]/_components/ratgeber-renderer'
    )
    expect(deriveIntentTag('preis-vergleich')).toBe('preis')
  })

  it('returns sicherheit for slug containing schutz', async () => {
    const { deriveIntentTag } = await import(
      '@/app/[produkt]/ratgeber/[thema]/_components/ratgeber-renderer'
    )
    expect(deriveIntentTag('schutz-familie')).toBe('sicherheit')
  })

  it('returns sicherheit as default when slug matches nothing', async () => {
    const { deriveIntentTag } = await import(
      '@/app/[produkt]/ratgeber/[thema]/_components/ratgeber-renderer'
    )
    expect(deriveIntentTag('fuer-wen')).toBe('sicherheit')
  })
})

// ---------------------------------------------------------------------------
// Gap Test 2: CTA section renders LeadForm with correct intentTag
// ---------------------------------------------------------------------------

describe('RatgeberRenderer — cta section intentTag', () => {
  it('renders LeadForm with intentTag=preis for a cost-focused article slug', async () => {
    const { RatgeberRenderer } = await import(
      '@/app/[produkt]/ratgeber/[thema]/_components/ratgeber-renderer'
    )

    render(
      React.createElement(RatgeberRenderer, {
        sections: [
          {
            type: 'cta' as const,
            headline: 'Jetzt anfragen',
            cta_text: 'Angebot anfordern',
            cta_anchor: '#formular',
          },
        ],
        articleSlug: 'kosten-leistungen',
        produktSlug: 'sterbegeld24plus',
        produktId: 'prod-uuid-1',
        zielgruppeTag: 'senioren_50plus',
      }),
    )

    const leadForm = screen.getByTestId('lead-form')
    expect(leadForm.getAttribute('data-intent')).toBe('preis')
  })
})

// ---------------------------------------------------------------------------
// Gap Test 3: Article page renders breadcrumb with 4 correct levels
// ---------------------------------------------------------------------------

describe('RatgeberArticlePage — breadcrumb navigation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_BASE_URL = 'leadmonster.de'
  })

  it('renders a breadcrumb nav with 4 levels including article title', async () => {
    mockFetchRatgeberBySlug.mockResolvedValue(
      makePublishedRatgeberRow('was-ist-sterbegeld', {
        title: 'Was ist Sterbegeld?',
      }),
    )
    mockProduktQuery()

    const { default: RatgeberArticlePage } = await import(
      '@/app/[produkt]/ratgeber/[thema]/page'
    )
    const element = await RatgeberArticlePage({
      params: { produkt: 'sterbegeld24plus', thema: 'was-ist-sterbegeld' },
    })
    render(element as React.ReactElement)

    const nav = screen.getByRole('navigation', { name: /Breadcrumb/i })
    expect(nav).toBeDefined()

    // The four breadcrumb levels — article title appears in both breadcrumb and h1,
    // so we use getAllByText and check at least one match exists
    expect(screen.getByText('Startseite')).toBeDefined()
    expect(screen.getByText('Sterbegeld24Plus')).toBeDefined()
    expect(screen.getByText('Ratgeber')).toBeDefined()
    // Article title appears in breadcrumb (span with aria-current) and h1 — check both present
    expect(screen.getAllByText('Was ist Sterbegeld?').length).toBeGreaterThanOrEqual(2)

    // Verify the breadcrumb span has aria-current="page"
    const currentCrumb = screen.getByRole('navigation', { name: /Breadcrumb/i })
      .querySelector('[aria-current="page"]')
    expect(currentCrumb).toBeDefined()
    expect(currentCrumb?.textContent).toBe('Was ist Sterbegeld?')
  })
})

// ---------------------------------------------------------------------------
// Gap Test 4: Reading time is displayed below article title
// ---------------------------------------------------------------------------

describe('RatgeberArticlePage — reading time display', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('displays Lesezeit below the article h1 heading', async () => {
    mockFetchRatgeberBySlug.mockResolvedValue(
      makePublishedRatgeberRow('fuer-wen', {
        title: 'Für wen eignet sich Sterbegeld?',
        sections: [{ type: 'intro', text: 'Sterbegeld ist für jeden geeignet.' }],
      }),
    )
    mockProduktQuery()

    const { default: RatgeberArticlePage } = await import(
      '@/app/[produkt]/ratgeber/[thema]/page'
    )
    const element = await RatgeberArticlePage({
      params: { produkt: 'sterbegeld24plus', thema: 'fuer-wen' },
    })
    render(element as React.ReactElement)

    // Reading time paragraph should appear below the h1
    const readingTimeText = screen.getByText(/Lesezeit: ca\. \d+ Minuten/i)
    expect(readingTimeText).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Gap Test 5: /api/generate with pageType='ratgeber' returns 201
// ---------------------------------------------------------------------------

describe('POST /api/generate — pageType ratgeber', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 201 with { id, slug } when ratgeber generation succeeds', async () => {
    // Mock auth
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null,
    })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
      createAdminClient: vi.fn(() => ({ from: mockFrom })),
    }))

    // Mock generateContent to return a successful ratgeber result
    vi.doMock('@/lib/anthropic/generator', () => ({
      generateContent: vi.fn().mockResolvedValue({
        success: [{ page_type: 'ratgeber', slug: 'fuer-wen', rowId: 'new-row-id' }],
        failed: [],
      }),
    }))

    const { POST } = await import('@/app/api/generate/route')
    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

    const req = new Request('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produktId: VALID_UUID, pageType: 'ratgeber', topic: 'fuer-wen' }),
    })

    const response = await POST(req as never)
    expect(response.status).toBe(201)

    const body = await response.json() as { data: { id: string; slug: string }; error: null }
    expect(body.data.id).toBe('new-row-id')
    expect(body.data.slug).toBe('fuer-wen')
    expect(body.error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Gap Test 6: Empty state shows correct message in index page
// ---------------------------------------------------------------------------

describe('RatgeberIndexPage — empty state', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders an empty state message when no articles are published', async () => {
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
    mockFetchAllRatgeberForProdukt.mockResolvedValue([])

    const { default: RatgeberIndexPage } = await import('@/app/[produkt]/ratgeber/page')
    const element = await RatgeberIndexPage({ params: { produkt: 'sterbegeld24plus' } })
    render(element as React.ReactElement)

    expect(screen.getByText(/Noch keine Ratgeber veröffentlicht/i)).toBeDefined()
  })
})
