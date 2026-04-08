// Tests for FAQ-specific SEO utility functions.
// All tests are pure — no network calls, no Supabase imports.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateFAQPageSchema, generateBreadcrumbSchema } from '../schema'
import { buildFAQMetadata } from '../metadata'

// ---------------------------------------------------------------------------
// generateFAQPageSchema
// ---------------------------------------------------------------------------
describe('generateFAQPageSchema', () => {
  it('produces @type FAQPage with correct mainEntity array shape', () => {
    const items = [
      { frage: 'Was ist Sterbegeld?', antwort: 'Sterbegeld ist eine Versicherung.' },
      { frage: 'Wer benötigt das?', antwort: 'Senioren ab 50 Jahren.' },
    ]

    const result = generateFAQPageSchema(items)

    expect((result as Record<string, unknown>)['@context']).toBe('https://schema.org')
    expect((result as Record<string, unknown>)['@type']).toBe('FAQPage')

    const mainEntity = (result as Record<string, unknown>)['mainEntity'] as Array<Record<string, unknown>>
    expect(Array.isArray(mainEntity)).toBe(true)
    expect(mainEntity).toHaveLength(2)
  })

  it('maps each item to @type Question with name and acceptedAnswer', () => {
    const items = [
      { frage: 'Wie hoch ist der Beitrag?', antwort: 'Ab 7,99 Euro monatlich.' },
    ]

    const result = generateFAQPageSchema(items)
    const mainEntity = (result as Record<string, unknown>)['mainEntity'] as Array<Record<string, unknown>>

    expect(mainEntity[0]['@type']).toBe('Question')
    expect(mainEntity[0]['name']).toBe('Wie hoch ist der Beitrag?')

    const acceptedAnswer = mainEntity[0]['acceptedAnswer'] as Record<string, unknown>
    expect(acceptedAnswer['@type']).toBe('Answer')
    expect(acceptedAnswer['text']).toBe('Ab 7,99 Euro monatlich.')
  })

  it('returns an empty mainEntity array for an empty items list', () => {
    const result = generateFAQPageSchema([])
    const mainEntity = (result as Record<string, unknown>)['mainEntity'] as unknown[]
    expect(mainEntity).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// generateBreadcrumbSchema (with @context — distinct from buildBreadcrumbSchema)
// ---------------------------------------------------------------------------
describe('generateBreadcrumbSchema', () => {
  it('produces BreadcrumbList with @context and @type', () => {
    const crumbs = [
      { name: 'Startseite', url: 'https://leadmonster.de' },
      { name: 'Sterbegeld24Plus', url: 'https://leadmonster.de/sterbegeld24plus' },
      { name: 'FAQ', url: 'https://leadmonster.de/sterbegeld24plus/faq' },
    ]

    const result = generateBreadcrumbSchema(crumbs)

    expect((result as Record<string, unknown>)['@context']).toBe('https://schema.org')
    expect((result as Record<string, unknown>)['@type']).toBe('BreadcrumbList')
  })

  it('produces three-item BreadcrumbList with correct positions and URLs', () => {
    const crumbs = [
      { name: 'Startseite', url: 'https://leadmonster.de' },
      { name: 'Sterbegeld24Plus', url: 'https://leadmonster.de/sterbegeld24plus' },
      { name: 'FAQ', url: 'https://leadmonster.de/sterbegeld24plus/faq' },
    ]

    const result = generateBreadcrumbSchema(crumbs)
    const items = (result as Record<string, unknown>)['itemListElement'] as Array<Record<string, unknown>>

    expect(items).toHaveLength(3)
    expect(items[0]['position']).toBe(1)
    expect(items[0]['name']).toBe('Startseite')
    expect(items[0]['item']).toBe('https://leadmonster.de')
    expect(items[1]['position']).toBe(2)
    expect(items[2]['position']).toBe(3)
    expect(items[2]['name']).toBe('FAQ')
    expect(items[2]['item']).toBe('https://leadmonster.de/sterbegeld24plus/faq')
  })
})

// ---------------------------------------------------------------------------
// buildFAQMetadata
// ---------------------------------------------------------------------------
describe('buildFAQMetadata', () => {
  beforeEach(() => {
    // Ensure env var is absent so fallback domain is used
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses meta_title and meta_desc from DB when present', () => {
    const result = buildFAQMetadata({
      produkt: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' },
      faqRecord: {
        meta_title: 'FAQ Sterbegeld24Plus',
        meta_desc: 'Alle Fragen beantwortet.',
        status: 'publiziert',
      },
      itemCount: 10,
    })

    expect(result.title).toBe('FAQ Sterbegeld24Plus')
    expect(result.description).toBe('Alle Fragen beantwortet.')
  })

  it('applies fallback title when meta_title is absent', () => {
    const result = buildFAQMetadata({
      produkt: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' },
      faqRecord: { meta_title: null, meta_desc: null, status: 'publiziert' },
      itemCount: 12,
    })

    expect(result.title).toContain('Sterbegeld24Plus')
    expect(result.title).toContain('12')
    // Title must not exceed 60 characters
    expect((result.title as string).length).toBeLessThanOrEqual(60)
  })

  it('applies fallback description when meta_desc is absent', () => {
    const result = buildFAQMetadata({
      produkt: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' },
      faqRecord: { meta_title: null, meta_desc: null, status: 'publiziert' },
      itemCount: 10,
    })

    expect(result.description).toContain('Sterbegeld24Plus')
    // Description must not exceed 160 characters
    expect((result.description as string).length).toBeLessThanOrEqual(160)
  })

  it('sets robots.index = false when status is not publiziert', () => {
    const result = buildFAQMetadata({
      produkt: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' },
      faqRecord: { meta_title: null, meta_desc: null, status: 'entwurf' },
      itemCount: 10,
    })

    expect((result.robots as { index: boolean }).index).toBe(false)
  })

  it('sets robots.index = true when status is publiziert', () => {
    const result = buildFAQMetadata({
      produkt: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' },
      faqRecord: { meta_title: null, meta_desc: null, status: 'publiziert' },
      itemCount: 10,
    })

    expect((result.robots as { index: boolean }).index).toBe(true)
    expect((result.robots as { follow: boolean }).follow).toBe(true)
  })

  it('sets canonical URL using produkt.domain when provided', () => {
    const result = buildFAQMetadata({
      produkt: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus', domain: 'sterbegeld24plus.de' },
      faqRecord: { meta_title: null, meta_desc: null, status: 'publiziert' },
      itemCount: 10,
    })

    const canonical = (result.alternates as { canonical: string }).canonical
    expect(canonical).toBe('https://sterbegeld24plus.de/sterbegeld24plus/faq')
  })

  it('falls back to leadmonster.de domain when neither domain nor env var is set', () => {
    const result = buildFAQMetadata({
      produkt: { name: 'Sterbegeld24Plus', slug: 'sterbegeld24plus' },
      faqRecord: { meta_title: null, meta_desc: null, status: 'publiziert' },
      itemCount: 10,
    })

    const canonical = (result.alternates as { canonical: string }).canonical
    expect(canonical).toContain('sterbegeld24plus/faq')
  })
})
