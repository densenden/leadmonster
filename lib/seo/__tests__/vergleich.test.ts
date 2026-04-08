// Tests for generateVergleichSchema in lib/seo/schema.ts.
// Verifies that the function produces a valid ItemList + BreadcrumbList @graph structure.
// No Supabase calls — pure unit tests with mock input data.
import { describe, it, expect } from 'vitest'
import { generateVergleichSchema } from '../schema'

const baseInput = {
  anbieter: ['AXA', 'Allianz', 'Zurich'],
  produktName: 'Sterbegeld24Plus',
  produktTyp: 'Sterbegeldversicherung',
  produktSlug: 'sterbegeld24plus',
  criteria: [
    {
      label: 'Sofortleistung',
      values: { AXA: true, Allianz: false, Zurich: true },
    },
    {
      label: 'Monatsbeitrag',
      values: { AXA: 'ab 7,99 €', Allianz: 'ab 9,50 €', Zurich: 'auf Anfrage' },
    },
  ],
}

describe('generateVergleichSchema', () => {
  it('returns a top-level @graph containing BreadcrumbList and ItemList', () => {
    const schema = generateVergleichSchema(baseInput)
    const result = schema as Record<string, unknown>

    expect(result['@context']).toBe('https://schema.org')
    const graph = result['@graph'] as Array<Record<string, unknown>>
    expect(Array.isArray(graph)).toBe(true)

    const types = graph.map(node => node['@type'])
    expect(types).toContain('BreadcrumbList')
    expect(types).toContain('ItemList')
  })

  it('ItemList wraps one Product per insurer', () => {
    const schema = generateVergleichSchema(baseInput)
    const graph = (schema as Record<string, unknown>)['@graph'] as Array<Record<string, unknown>>
    const itemList = graph.find(n => n['@type'] === 'ItemList') as Record<string, unknown>

    const items = itemList['itemListElement'] as Array<Record<string, unknown>>
    expect(items).toHaveLength(3)

    const firstItem = items[0]['item'] as Record<string, unknown>
    expect(firstItem['@type']).toBe('Product')
  })

  it('each Product has name, description, offers.@type and offers.category', () => {
    const schema = generateVergleichSchema(baseInput)
    const graph = (schema as Record<string, unknown>)['@graph'] as Array<Record<string, unknown>>
    const itemList = graph.find(n => n['@type'] === 'ItemList') as Record<string, unknown>
    const items = itemList['itemListElement'] as Array<Record<string, unknown>>

    // AXA is first — check all required fields
    const axaProduct = items[0]['item'] as Record<string, unknown>
    expect(axaProduct['name']).toBe('AXA')
    // description is truthy criteria labels joined — AXA has Sofortleistung = true
    expect(typeof axaProduct['description']).toBe('string')
    expect(axaProduct['description']).toContain('Sofortleistung')

    const offers = axaProduct['offers'] as Record<string, unknown>
    expect(offers['@type']).toBe('Offer')
    expect(offers['category']).toBe('Sterbegeldversicherung')
  })

  it('BreadcrumbList has exactly three entries: Startseite → Produktname → Vergleich', () => {
    const schema = generateVergleichSchema(baseInput)
    const graph = (schema as Record<string, unknown>)['@graph'] as Array<Record<string, unknown>>
    const breadcrumb = graph.find(n => n['@type'] === 'BreadcrumbList') as Record<string, unknown>

    const items = breadcrumb['itemListElement'] as Array<Record<string, unknown>>
    expect(items).toHaveLength(3)

    expect(items[0]['name']).toBe('Startseite')
    expect(items[0]['position']).toBe(1)

    expect(items[1]['name']).toBe('Sterbegeld24Plus')
    expect(items[1]['position']).toBe(2)

    expect(items[2]['name']).toBe('Vergleich')
    expect(items[2]['position']).toBe(3)
  })
})
