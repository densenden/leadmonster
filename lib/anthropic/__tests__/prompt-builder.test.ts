// Tests for the four-layer prompt composition in lib/anthropic/prompt-builder.ts.
// Verifies layer inclusion, JSON-only instruction, and Wissensfundus tag filtering.
import { describe, it, expect } from 'vitest'
import {
  buildWissensfundusBlock,
  buildProduktDnaBlock,
  buildVertriebssteuerungBlock,
  composePrompt,
  type WissensfundusRow,
} from '../prompt-builder'

describe('buildWissensfundusBlock', () => {
  it('includes rows whose tags match the product config tags', () => {
    const rows: WissensfundusRow[] = [
      { thema: 'Was ist Sterbegeld', inhalt: 'Sterbegeld ist...', tags: ['senioren_50plus'] },
      { thema: 'Allgemein', inhalt: 'Allgemeiner Text', tags: ['familien'] },
    ]

    const result = buildWissensfundusBlock(rows, ['senioren_50plus'])
    expect(result).toContain('Was ist Sterbegeld')
    expect(result).not.toContain('Allgemein')
  })

  it('includes rows with no tags as they are universally relevant', () => {
    const rows: WissensfundusRow[] = [
      { thema: 'Universell', inhalt: 'Immer relevant', tags: null },
      { thema: 'Spezifisch', inhalt: 'Nur für familien', tags: ['familien'] },
    ]

    const result = buildWissensfundusBlock(rows, ['senioren_50plus'])
    expect(result).toContain('Universell')
    expect(result).not.toContain('Spezifisch')
  })

  it('returns empty string when no rows match', () => {
    const rows: WissensfundusRow[] = [
      { thema: 'Familien', inhalt: 'Text', tags: ['familien'] },
    ]

    const result = buildWissensfundusBlock(rows, ['senioren_50plus'])
    expect(result).toBe('')
  })

  it('includes rows with empty tags array as universally relevant', () => {
    const rows: WissensfundusRow[] = [
      { thema: 'Leer', inhalt: 'Kein Tag', tags: [] },
    ]
    const result = buildWissensfundusBlock(rows, ['senioren_50plus'])
    expect(result).toContain('Leer')
  })
})

describe('buildProduktDnaBlock', () => {
  it('includes product name, type, insurers, and selling points', () => {
    const result = buildProduktDnaBlock(
      { name: 'Sterbegeld24Plus', typ: 'sterbegeld' },
      {
        anbieter: ['AXA', 'Allianz'],
        argumente: { sofortschutz: 'Sofort ab Tag 1 versichert' },
      },
    )

    expect(result).toContain('Sterbegeld24Plus')
    expect(result).toContain('sterbegeld')
    expect(result).toContain('AXA')
    expect(result).toContain('Allianz')
    expect(result).toContain('sofortschutz')
  })
})

describe('buildVertriebssteuerungBlock', () => {
  it('includes target audience and focus text for sicherheit', () => {
    const result = buildVertriebssteuerungBlock({
      zielgruppe: ['senioren_50plus', 'familien'],
      fokus: 'sicherheit',
    })

    expect(result).toContain('senioren_50plus')
    expect(result).toContain('Sicherheit')
  })

  it('includes preis-focus framing for fokus=preis', () => {
    const result = buildVertriebssteuerungBlock({ zielgruppe: [], fokus: 'preis' })
    expect(result).toContain('Preis')
  })

  it('defaults to Sofortschutz framing for unknown fokus', () => {
    const result = buildVertriebssteuerungBlock({ zielgruppe: [], fokus: null })
    expect(result).toContain('Sofortschutz')
  })
})

describe('composePrompt', () => {
  it('includes all four layers and the JSON-only instruction', () => {
    const layers = {
      wissensfundus: '## Wissensfundus\n\n### Thema\nInhalt',
      produktDna: '## Produkt-DNA\n\nProduktname: Test',
      vertriebssteuerung: '## Vertriebssteuerung\n\nZielgruppe: Senioren',
    }

    const { system, user } = composePrompt('hauptseite', layers)

    // System prompt must declare the SEO copywriter role
    expect(system).toContain('SEO-Texter')
    expect(system).toContain('JSON')

    // User message must include all layers
    expect(user).toContain('Wissensfundus')
    expect(user).toContain('Produkt-DNA')
    expect(user).toContain('Vertriebssteuerung')

    // Final JSON-only instruction must appear
    expect(user).toContain('JSON')
    expect(user).toContain('Markdown-Fences')
    expect(user).toContain('hauptseite')
  })

  it('omits empty wissensfundus block from the user message', () => {
    const layers = {
      wissensfundus: '',
      produktDna: '## Produkt-DNA',
      vertriebssteuerung: '## Vertriebssteuerung',
    }

    const { user } = composePrompt('faq', layers)
    expect(user).not.toContain('Wissensfundus')
    expect(user).toContain('Produkt-DNA')
  })
})
