// Tests for generateHowToSchema in lib/seo/schema.ts.
// Verifies the output shape for the tariff calculator HowTo JSON-LD block.
import { describe, it, expect } from 'vitest'
import { generateHowToSchema } from '@/lib/seo/schema'

describe('generateHowToSchema', () => {
  const params = {
    produktName: 'Sterbegeld24Plus',
    produktSlug: 'sterbegeld24plus',
  }

  it('returns an object with @context and @type HowTo', () => {
    const result = generateHowToSchema(params) as Record<string, unknown>
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('HowTo')
  })

  it('sets the name field to "{produktName} Beitrag berechnen"', () => {
    const result = generateHowToSchema(params) as Record<string, unknown>
    expect(result['name']).toBe('Sterbegeld24Plus Beitrag berechnen')
  })

  it('includes exactly three HowToStep entries with the correct text values', () => {
    const result = generateHowToSchema(params) as Record<string, unknown>
    const steps = result['step'] as Array<Record<string, unknown>>

    expect(steps).toHaveLength(3)

    expect(steps[0]['@type']).toBe('HowToStep')
    expect(steps[0]['name']).toBe('Alter eingeben')
    expect(steps[0]['text']).toBe('Geben Sie Ihr Alter zwischen 40 und 85 Jahren an.')

    expect(steps[1]['@type']).toBe('HowToStep')
    expect(steps[1]['name']).toBe('Wunschsumme wählen')
    expect(typeof steps[1]['text']).toBe('string')
    expect((steps[1]['text'] as string).length).toBeGreaterThan(10)

    expect(steps[2]['@type']).toBe('HowToStep')
    expect(steps[2]['name']).toBe('Beispielbeitrag ansehen und Angebot anfordern')
  })

  it('includes a tool array with one HowToTool referencing the produktName', () => {
    const result = generateHowToSchema(params) as Record<string, unknown>
    const tools = result['tool'] as Array<Record<string, unknown>>

    expect(Array.isArray(tools)).toBe(true)
    expect(tools).toHaveLength(1)
    expect(tools[0]['@type']).toBe('HowToTool')
    expect(tools[0]['name']).toBe('Sterbegeld24Plus')
  })

  it('does not include an estimatedCost field', () => {
    const result = generateHowToSchema(params) as Record<string, unknown>
    expect(result['estimatedCost']).toBeUndefined()
  })
})
