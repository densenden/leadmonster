// Tests for the Schema.org JSON-LD helper in lib/seo/schema.ts.
// Verifies that buildSchemaMarkup produces the correct @type for each page type
// and always injects the canonical URL.
import { describe, it, expect } from 'vitest'
import { buildSchemaMarkup, SchemaValidationError } from '../schema'

describe('buildSchemaMarkup', () => {
  it('hauptseite has @type InsuranceAgency and the canonical URL', () => {
    const result = buildSchemaMarkup('hauptseite', {
      canonicalUrl: 'https://leadmonster.de/sterbegeld24plus',
      produktName: 'Sterbegeld24Plus',
    })

    expect(result['@type']).toBe('InsuranceAgency')
    expect(result['url']).toBe('https://leadmonster.de/sterbegeld24plus')
    expect(result['@context']).toBe('https://schema.org')
  })

  it('faq has @type FAQPage and maps faqItems to Question entities', () => {
    const result = buildSchemaMarkup('faq', {
      canonicalUrl: 'https://leadmonster.de/sterbegeld24plus/faq',
      faqItems: [
        { frage: 'Was ist Sterbegeld?', antwort: 'Sterbegeld ist eine Versicherung.' },
      ],
    })

    expect(result['@type']).toBe('FAQPage')
    expect(result['url']).toBe('https://leadmonster.de/sterbegeld24plus/faq')
    const mainEntity = result['mainEntity'] as Array<Record<string, unknown>>
    expect(mainEntity[0]['@type']).toBe('Question')
    expect(mainEntity[0]['name']).toBe('Was ist Sterbegeld?')
  })

  it('ratgeber has @type Article', () => {
    const result = buildSchemaMarkup('ratgeber', {
      canonicalUrl: 'https://leadmonster.de/sterbegeld24plus/ratgeber/was-ist-das',
      artikel: { titel: 'Was ist Sterbegeld?', intro: 'Eine Einführung.' },
    })

    expect(result['@type']).toBe('Article')
    expect(result['url']).toBe('https://leadmonster.de/sterbegeld24plus/ratgeber/was-ist-das')
  })

  it('vergleich has @type ItemList', () => {
    const result = buildSchemaMarkup('vergleich', {
      canonicalUrl: 'https://leadmonster.de/sterbegeld24plus/vergleich',
      anbieter: [{ name: 'AXA', preis_ab: '7.99' }],
    })

    expect(result['@type']).toBe('ItemList')
  })

  it('tarif has @type Product', () => {
    const result = buildSchemaMarkup('tarif', {
      canonicalUrl: 'https://leadmonster.de/sterbegeld24plus/tarife',
      produktName: 'Sterbegeld24Plus',
      tarifMin: 5.99,
    })

    expect(result['@type']).toBe('Product')
  })

  it('throws SchemaValidationError when canonicalUrl is empty string', () => {
    expect(() =>
      buildSchemaMarkup('hauptseite', { canonicalUrl: '' }),
    ).toThrow(SchemaValidationError)
  })
})
