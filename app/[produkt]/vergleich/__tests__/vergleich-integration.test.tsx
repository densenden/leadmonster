// Integration tests for Vergleich — DB content shape → rendered insurer rows.
// New schema: vergleich section contains { type: 'vergleich', anbieter: AnbieterOffer[] }
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Vergleich, type AnbieterOffer } from '@/components/sections/Vergleich'

// Simulate the shape that the vergleich page extracts from generierter_content.content
const dbContentShape = {
  sections: [
    {
      type: 'vergleich',
      anbieter: [
        {
          name: 'AXA',
          wartezeit: 'Keine bei Unfalltod',
          gesundheitsfragen: 'Vereinfacht',
          garantierte_aufnahme: true,
          beitrag_beispiel: '7,99 €/Monat',
          besonderheit: 'Direktauszahlung in 24h',
        },
        {
          name: 'Allianz',
          wartezeit: '6 Monate',
          gesundheitsfragen: 'Ja',
          garantierte_aufnahme: false,
          beitrag_beispiel: '9,50 €/Monat',
          besonderheit: 'Familienbonus',
        },
      ],
    },
  ],
}

function extractAnbieter(content: typeof dbContentShape): AnbieterOffer[] {
  const vergleichSection = content.sections.find(s => s.type === 'vergleich')
  return (vergleichSection?.anbieter ?? []) as AnbieterOffer[]
}

describe('Vergleich integration — DB content shape → rendered insurer rows', () => {
  it('renders one row per insurer extracted from DB content', () => {
    const anbieter = extractAnbieter(dbContentShape)

    render(
      <Vergleich
        anbieter={anbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    expect(screen.getByText('AXA')).toBeDefined()
    expect(screen.getByText('Allianz')).toBeDefined()
  })

  it('renders check icon for AXA garantierte_aufnahme=true and minus for Allianz=false', () => {
    const anbieter = extractAnbieter(dbContentShape)

    render(
      <Vergleich
        anbieter={anbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const checkIcons = document.querySelectorAll('svg[aria-label="Ja"]')
    const minusIcons = document.querySelectorAll('svg[aria-label="Nein"]')

    expect(checkIcons.length).toBe(1)
    expect(minusIcons.length).toBe(1)
  })

  it('renders beitrag_beispiel strings as plain text in cells', () => {
    const anbieter = extractAnbieter(dbContentShape)

    render(
      <Vergleich
        anbieter={anbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    expect(screen.getByText('7,99 €/Monat')).toBeDefined()
    expect(screen.getByText('9,50 €/Monat')).toBeDefined()
  })
})
