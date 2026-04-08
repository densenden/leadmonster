// Tests for the admin ratgeber section — status badges and generate button behaviour.
// Supabase and fetch are mocked — no real network access.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  })),
}))

// ContentPreview is a client component — stub it.
vi.mock('@/components/admin/ContentPreview', () => ({
  ContentPreview: ({ row }: { row: { id: string } }) =>
    React.createElement('div', { 'data-testid': `preview-${row.id}` }),
}))

// GenerateButton is a client component — stub it.
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

function makeRatgeberRow(overrides: Partial<{
  id: string
  status: string
  title: string | null
  slug: string | null
  generated_at: string
}>) {
  return {
    id: overrides.id ?? 'rg-1',
    produkt_id: 'prod-1',
    page_type: 'ratgeber',
    slug: overrides.slug ?? 'was-ist-sterbegeld',
    title: overrides.title ?? 'Was ist Sterbegeld?',
    meta_title: null,
    meta_desc: null,
    content: null,
    schema_markup: null,
    status: overrides.status ?? 'entwurf',
    generated_at: overrides.generated_at ?? '2026-04-07T10:00:00.000Z',
    published_at: null,
    created_at: '2026-04-07T10:00:00.000Z',
    updated_at: '2026-04-07T10:00:00.000Z',
  }
}

function mockSupabaseCalls(contentRows: unknown[]) {
  let callCount = 0
  mockFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: VALID_PRODUKT, error: null }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: contentRows, error: null }),
    }
  })
}

// ---------------------------------------------------------------------------
// Test 1: Ratgeber section renders a status badge for each article row
// ---------------------------------------------------------------------------

describe('Admin content page — ratgeber section', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('renders a status badge for each ratgeber article row', async () => {
    mockSupabaseCalls([
      makeRatgeberRow({ id: 'rg-1', status: 'entwurf' }),
      makeRatgeberRow({ id: 'rg-2', status: 'publiziert' }),
      makeRatgeberRow({ id: 'rg-3', status: 'review' }),
    ])

    const { default: ContentPage } = await import('../page')
    const element = await ContentPage({ params: { id: 'prod-1' } })
    render(element as React.ReactElement)

    // All three status badge texts should appear in the ratgeber table
    const allBadges = screen.getAllByText(/entwurf|review|publiziert/i)
    expect(allBadges.length).toBeGreaterThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// Test 2: GenerateRatgeberButton submits correct POST payload
// ---------------------------------------------------------------------------

describe('GenerateRatgeberButton — POST behaviour', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('submits a POST to /api/generate with { produktId, pageType, topic } on valid submit', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ data: { id: 'new-row', slug: 'fuer-wen' }, error: null }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { GenerateRatgeberButton } = await import('../_components/generate-ratgeber-button')
    render(React.createElement(GenerateRatgeberButton, { produktId: 'prod-uuid-1' }))

    // Click the button to expand the inline form
    const expandButton = screen.getByRole('button', { name: /Weiteren Ratgeber generieren/i })
    fireEvent.click(expandButton)

    // Find the input and type a topic
    const input = screen.getByPlaceholderText(/kosten-leistungen/i)
    fireEvent.change(input, { target: { value: 'fuer-wen' } })

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /^Generieren$/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ produktId: 'prod-uuid-1', pageType: 'ratgeber', topic: 'fuer-wen' }),
        }),
      )
    })

    vi.unstubAllGlobals()
  })
})

// ---------------------------------------------------------------------------
// Test 3: GenerateRatgeberButton shows validation error for empty topic
// ---------------------------------------------------------------------------

describe('GenerateRatgeberButton — empty topic validation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('shows a validation error when topic is empty without making a network request', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    const { GenerateRatgeberButton } = await import('../_components/generate-ratgeber-button')
    render(React.createElement(GenerateRatgeberButton, { produktId: 'prod-uuid-1' }))

    // Expand the form
    const expandButton = screen.getByRole('button', { name: /Weiteren Ratgeber generieren/i })
    fireEvent.click(expandButton)

    // Submit without entering any topic
    const submitButton = screen.getByRole('button', { name: /^Generieren$/i })
    fireEvent.click(submitButton)

    // Validation error should appear without fetch being called
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByText(/Bitte geben Sie ein Thema/i)).toBeDefined()
    })

    expect(mockFetch).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
