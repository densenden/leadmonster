// Tests for the content management Server Component page.
// Supabase admin client is mocked — no real DB access occurs.
// ContentPreview is mocked to focus tests on data-fetching and grouping logic.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  })),
}))

// ContentPreview is a client component that calls fetch — mock it to avoid jsdom issues.
vi.mock('@/components/admin/ContentPreview', () => ({
  ContentPreview: ({ row }: { row: { page_type: string; id: string } }) =>
    React.createElement('div', { 'data-testid': `preview-${row.id}` }, row.page_type),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// GenerateButton is a client component — mock it to avoid fetch in tests.
vi.mock(
  '@/app/admin/(protected)/produkte/[id]/content/_components/GenerateButton',
  () => ({
    GenerateButton: () => React.createElement('button', null, 'Content generieren'),
  }),
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PRODUKT = { id: 'prod-1', name: 'Testprodukt' }

function makeContentRow(overrides: Partial<{
  id: string
  page_type: string
  status: string
  title: string | null
  generated_at: string
  published_at: string | null
}>) {
  return {
    id: overrides.id ?? 'row-1',
    produkt_id: 'prod-1',
    page_type: overrides.page_type ?? 'hauptseite',
    slug: null,
    title: overrides.title ?? 'Testtitel',
    meta_title: null,
    meta_desc: null,
    content: null,
    schema_markup: null,
    status: overrides.status ?? 'entwurf',
    generated_at: overrides.generated_at ?? '2026-04-07T10:00:00.000Z',
    published_at: overrides.published_at ?? null,
    created_at: '2026-04-07T10:00:00.000Z',
    updated_at: '2026-04-07T10:00:00.000Z',
  }
}

// Sets up mockFrom to handle two sequential from() calls:
// 1st call: produkte.select().eq().maybeSingle() → returns the product row
// 2nd call: generierter_content.select().eq().order() → returns the content rows
function mockSupabaseCalls(produkt: typeof VALID_PRODUKT | null, contentRows: unknown[]) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      // produkte lookup
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: produkt, error: null }),
      }
    }
    // generierter_content fetch
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: contentRows, error: null }),
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Content management page — empty state', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('renders "Noch kein Content generiert" and a generate button when no rows exist', async () => {
    mockSupabaseCalls(VALID_PRODUKT, [])

    const { default: ContentPage } = await import('../page')
    const element = await ContentPage({ params: { id: 'prod-1' } })
    render(element as React.ReactElement)

    expect(screen.getByText(/Noch kein Content generiert/i)).toBeDefined()
    expect(screen.getAllByRole('button', { name: /Content generieren/i }).length).toBeGreaterThan(0)
  })
})

describe('Content management page — grouping by page_type', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('groups rows by page_type and renders one accordion section per unique type', async () => {
    mockSupabaseCalls(VALID_PRODUKT, [
      makeContentRow({ id: 'r1', page_type: 'hauptseite' }),
      makeContentRow({ id: 'r2', page_type: 'faq' }),
      makeContentRow({ id: 'r3', page_type: 'vergleich' }),
    ])

    const { default: ContentPage } = await import('../page')
    const element = await ContentPage({ params: { id: 'prod-1' } })
    render(element as React.ReactElement)

    // The accordion summary labels should appear
    expect(screen.getByText('Hauptseite')).toBeDefined()
    expect(screen.getByText('FAQ')).toBeDefined()
    expect(screen.getByText('Vergleich')).toBeDefined()
  })

  it('renders multiple ratgeber rows as separate ContentPreview instances in the same group', async () => {
    mockSupabaseCalls(VALID_PRODUKT, [
      makeContentRow({ id: 'rg1', page_type: 'ratgeber', title: 'Ratgeber 1' }),
      makeContentRow({ id: 'rg2', page_type: 'ratgeber', title: 'Ratgeber 2' }),
    ])

    const { default: ContentPage } = await import('../page')
    const element = await ContentPage({ params: { id: 'prod-1' } })
    render(element as React.ReactElement)

    // Both ratgeber previews should appear under the same section
    expect(screen.getByTestId('preview-rg1')).toBeDefined()
    expect(screen.getByTestId('preview-rg2')).toBeDefined()
  })
})
