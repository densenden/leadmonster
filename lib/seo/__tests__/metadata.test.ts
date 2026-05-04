// Tests for SEO utility functions in lib/seo/metadata.ts and lib/seo/schema.ts.
// All tests are pure — no network calls, no Supabase imports.
import { describe, it, expect, afterEach } from 'vitest'
import { buildProduktMetadata, buildCanonicalUrl } from '../metadata'
import {
  buildInsuranceAgencySchema,
  buildBreadcrumbSchema,
  combineSchemas,
  buildProductSchema,
} from '../schema'

describe('buildProduktMetadata', () => {
  it('returns correct title and description from inputs', () => {
    const result = buildProduktMetadata({
      slug: 'sterbegeld24plus',
      meta_title: 'Sterbegeld24Plus — Jetzt absichern',
      meta_desc: 'Sterbegeldversicherung für Senioren ab 50',
    })

    // title is now { absolute: ... } so root layout's "%s | LeadMonster" template doesn't apply
    expect(result.title).toEqual({ absolute: 'Sterbegeld24Plus — Jetzt absichern' })
    expect(result.description).toBe('Sterbegeldversicherung für Senioren ab 50')
  })

  it('sets alternates.canonical to the correct absolute URL', () => {
    const result = buildProduktMetadata({
      slug: 'sterbegeld24plus',
      meta_title: 'Test',
      meta_desc: 'Test Beschreibung',
      domain: 'sterbegeld24plus.de',
    })

    expect((result.alternates as { canonical: string }).canonical).toBe(
      'https://sterbegeld24plus.de/sterbegeld24plus',
    )
  })

  it('sets robots index and follow', () => {
    const result = buildProduktMetadata({
      slug: 'test',
      meta_title: 'Test',
      meta_desc: 'Beschreibung',
    })

    expect(result.robots).toEqual({ index: true, follow: true })
  })

  it('sets Open Graph type to website and url matching canonical', () => {
    const result = buildProduktMetadata({
      slug: 'sterbegeld24plus',
      meta_title: 'OG Test',
      meta_desc: 'OG Beschreibung',
      domain: 'leadmonster.de',
    })

    const og = result.openGraph as Record<string, unknown>
    expect(og.type).toBe('website')
    expect(og.url).toBe('https://leadmonster.de/sterbegeld24plus')
  })

  // ===== Phase 4: Title-Suffix =====

  it('appends titleSuffix to the title when provided', () => {
    const result = buildProduktMetadata({
      slug: 'bu',
      meta_title: 'BU für Handwerker',
      meta_desc: 'desc',
      titleSuffix: 'Christian Wimmer Versicherungsmakler',
    })
    expect(result.title).toEqual({
      absolute: 'BU für Handwerker | Christian Wimmer Versicherungsmakler',
    })
  })

  it('omits the titleSuffix when null/undefined/empty', () => {
    const expectations: Array<string | null | undefined> = [null, undefined, '', '   ']
    for (const suffix of expectations) {
      const result = buildProduktMetadata({
        slug: 'sterbegeld24plus',
        meta_title: 'Sterbegeld24Plus',
        meta_desc: 'desc',
        titleSuffix: suffix as string | null,
      })
      expect(result.title).toEqual({ absolute: 'Sterbegeld24Plus' })
    }
  })

  it('drops the titleSuffix when combined length exceeds 60 chars', () => {
    // 50 chars + " | " + 30 chars = 83 chars → suffix wird weggelassen.
    const longTitle = 'A'.repeat(50)
    const result = buildProduktMetadata({
      slug: 'bu',
      meta_title: longTitle,
      meta_desc: 'desc',
      titleSuffix: 'Christian Wimmer Versicherungsmakler',
    })
    expect(result.title).toEqual({ absolute: longTitle })
  })

  it('truncates the base title when even base alone exceeds 60 chars', () => {
    // 70 chars base, 0 suffix → base wird auf 60 gekürzt.
    const veryLong = 'B'.repeat(70)
    const result = buildProduktMetadata({
      slug: 'bu',
      meta_title: veryLong,
      meta_desc: 'desc',
      titleSuffix: 'Suffix',
    })
    const title = (result.title as { absolute: string }).absolute
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title.startsWith('B')).toBe(true)
  })

  it('uses the suffixed title for openGraph.title (consistency)', () => {
    const result = buildProduktMetadata({
      slug: 'bu',
      meta_title: 'BU Handwerker',
      meta_desc: 'desc',
      titleSuffix: 'Christian Wimmer',
    })
    const og = result.openGraph as Record<string, unknown>
    expect(og.title).toBe('BU Handwerker | Christian Wimmer')
  })
})

describe('buildInsuranceAgencySchema', () => {
  it('returns an object with @type InsuranceAgency and all required fields', () => {
    const result = buildInsuranceAgencySchema({
      name: 'Sterbegeld24Plus',
      url: 'https://leadmonster.de/sterbegeld24plus',
    })

    expect(result['@type']).toBe('InsuranceAgency')
    expect(result['name']).toBe('Sterbegeld24Plus')
    expect(result['url']).toBe('https://leadmonster.de/sterbegeld24plus')
  })

  it('includes logo and sameAs when provided', () => {
    const result = buildInsuranceAgencySchema({
      name: 'Test',
      url: 'https://example.com',
      logo: 'https://example.com/logo.png',
      sameAs: ['https://facebook.com/test'],
    })

    expect(result['logo']).toBe('https://example.com/logo.png')
    expect(result['sameAs']).toEqual(['https://facebook.com/test'])
  })
})

describe('buildBreadcrumbSchema', () => {
  it('maps items to BreadcrumbList with correct ListItem positions', () => {
    const result = buildBreadcrumbSchema([
      { name: 'Startseite', url: 'https://leadmonster.de' },
      { name: 'Sterbegeld24Plus', url: 'https://leadmonster.de/sterbegeld24plus' },
    ])

    expect(result['@type']).toBe('BreadcrumbList')
    const items = result['itemListElement'] as Array<Record<string, unknown>>
    expect(items).toHaveLength(2)
    expect(items[0]['position']).toBe(1)
    expect(items[0]['name']).toBe('Startseite')
    expect(items[1]['position']).toBe(2)
    expect(items[1]['name']).toBe('Sterbegeld24Plus')
  })
})

describe('combineSchemas', () => {
  it('produces valid JSON with @context and @graph wrapping all schemas', () => {
    const agency = buildInsuranceAgencySchema({ name: 'Test', url: 'https://example.com' })
    const breadcrumb = buildBreadcrumbSchema([{ name: 'Home', url: 'https://example.com' }])
    const product = buildProductSchema({ name: 'Test', description: 'Desc', brand: 'Brand' })

    const combined = combineSchemas(agency, breadcrumb, product)

    // Must be valid JSON
    expect(() => JSON.parse(combined)).not.toThrow()

    const parsed = JSON.parse(combined)
    expect(parsed['@context']).toBe('https://schema.org')
    expect(Array.isArray(parsed['@graph'])).toBe(true)
    expect(parsed['@graph']).toHaveLength(3)
  })
})

// ===== buildCanonicalUrl tests =====

describe('buildCanonicalUrl', () => {
  afterEach(() => {
    // Restore env var after each test to avoid cross-test pollution.
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  it('prepends NEXT_PUBLIC_BASE_URL correctly to a path', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
    expect(buildCanonicalUrl('/sterbegeld24plus')).toBe('https://leadmonster.de/sterbegeld24plus')
  })

  it('does not produce double slashes when base has trailing slash', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de/'
    expect(buildCanonicalUrl('/faq')).toBe('https://leadmonster.de/faq')
  })

  it('prepends a leading slash to path if missing', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
    expect(buildCanonicalUrl('sterbegeld24plus/faq')).toBe(
      'https://leadmonster.de/sterbegeld24plus/faq',
    )
  })

  it('throws a descriptive error when NEXT_PUBLIC_BASE_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    expect(() => buildCanonicalUrl('/test')).toThrow(
      'NEXT_PUBLIC_BASE_URL environment variable is not set',
    )
  })
})
