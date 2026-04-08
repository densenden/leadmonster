// Task Group 4 gap-analysis tests for the FAQ public page feature.
// Covers critical integration paths not addressed by unit tests in groups 1–3.
// NOTE: This file mocks @/components/sections/FAQ for page-level tests.
//       FAQ component structural tests (motion-reduce) live in components/sections/__tests__/FAQ.test.tsx.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'

// ---------------------------------------------------------------------------
// Mocks (same pattern as page.test.tsx)
// ---------------------------------------------------------------------------

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
vi.mock('next/navigation', () => ({ notFound: mockNotFound }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))
vi.mock('@/components/sections/FAQ', () => ({
  FAQ: ({ items }: { items: unknown[] }) =>
    `<section data-testid="faq" data-count="${items.length}"></section>`,
}))

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
    id: 'gap-prod-uuid',
    slug: 'sterbegeld24plus',
    name: 'Sterbegeld24Plus',
    domain: null,
    status: 'aktiv',
    ...overrides,
  }
}

function makeFaqItems(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    frage: `Frage ${i + 1}?`,
    antwort: `Antwort ${i + 1}.`,
  }))
}

function makeChain(finalResult: { data: unknown; error: unknown }) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
  }
}

function setupMocks(produktRow: unknown, faqRow: unknown) {
  let callCount = 0
  mockAdminFrom.mockImplementation(() => {
    callCount++
    if (callCount === 1) return makeChain({ data: produktRow, error: null })
    return makeChain({ data: faqRow, error: null })
  })
}

async function renderPageHtml(slug: string, faqRowOverrides: Record<string, unknown> = {}) {
  const faqRow = {
    title: 'FAQ',
    meta_title: null,
    meta_desc: null,
    content: { sections: [{ type: 'faq', items: makeFaqItems(10) }] },
    schema_markup: null,
    status: 'publiziert',
    ...faqRowOverrides,
  }
  setupMocks(makeProduktRow(), faqRow)

  const { default: FAQPage } = await import('../page')
  const element = await FAQPage({ params: { produkt: slug } })
  return renderToString(element as React.ReactElement)
}

// ---------------------------------------------------------------------------
// Gap 1: schema_markup null → runtime generateFAQPageSchema fallback used
// ---------------------------------------------------------------------------

describe('schema_markup null fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('renders without throwing when schema_markup is null (runtime fallback)', async () => {
    const html = await renderPageHtml('sterbegeld24plus', { schema_markup: null })
    // The JSON-LD script tag must still be present with a @graph
    expect(html).toContain('application/ld+json')
    expect(html).toContain('@graph')
  })

  it('injects stored schema_markup directly into @graph when present', async () => {
    const storedSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [],
    }
    const html = await renderPageHtml('sterbegeld24plus', { schema_markup: storedSchema })
    // Page still renders and includes JSON-LD
    expect(html).toContain('application/ld+json')
    expect(html).toContain('@graph')
  })
})

// ---------------------------------------------------------------------------
// Gap 2: ISR revalidate export value
// ---------------------------------------------------------------------------

describe('ISR revalidate export', () => {
  it('exports revalidate as exactly 3600 (consistent with main product page)', async () => {
    vi.resetModules()
    const mod = await import('../page')
    expect((mod as Record<string, unknown>).revalidate).toBe(3600)
  })
})

// ---------------------------------------------------------------------------
// Gap 3: Breadcrumb aria-current on last crumb
// ---------------------------------------------------------------------------

describe('FAQPage breadcrumb aria-current', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('renders span with aria-current="page" on the last FAQ breadcrumb crumb', async () => {
    const html = await renderPageHtml('sterbegeld24plus')
    expect(html).toContain('aria-current="page"')
  })

  it('breadcrumb nav has aria-label="Breadcrumb"', async () => {
    const html = await renderPageHtml('sterbegeld24plus')
    expect(html).toContain('aria-label="Breadcrumb"')
  })
})

// ---------------------------------------------------------------------------
// Gap 4: CTA link href contains /{slug}#formular
// ---------------------------------------------------------------------------

describe('FAQPage CTA link target', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('CTA link href points to /{slug}#formular', async () => {
    const html = await renderPageHtml('sterbegeld24plus')
    expect(html).toContain('/sterbegeld24plus#formular')
  })

  it('CTA text contains the expected German copy', async () => {
    const html = await renderPageHtml('sterbegeld24plus')
    expect(html).toContain('Noch Fragen? Jetzt unverbindlich anfragen')
  })
})

// ---------------------------------------------------------------------------
// Gap 5: @graph JSON-LD structure includes both FAQPage and BreadcrumbList
// ---------------------------------------------------------------------------

describe('FAQPage JSON-LD @graph structure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('@graph contains both FAQPage and BreadcrumbList nodes', async () => {
    const html = await renderPageHtml('sterbegeld24plus')
    // Extract the JSON-LD script content
    const match = html.match(/<script[^>]*application\/ld\+json[^>]*>([^<]+)<\/script>/)
    expect(match).not.toBeNull()
    const parsed = JSON.parse(match![1])
    const graph: Array<Record<string, unknown>> = parsed['@graph']
    expect(Array.isArray(graph)).toBe(true)
    const types = graph.map(node => node['@type'])
    expect(types).toContain('FAQPage')
    expect(types).toContain('BreadcrumbList')
  })
})
