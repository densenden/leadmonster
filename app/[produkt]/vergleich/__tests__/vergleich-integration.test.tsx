// Integration tests — DB tarife shape → rendered insurer rows.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Vergleich } from '@/components/sections/Vergleich'
import { mapTarifeToVergleichOffers } from '@/lib/tarife/vergleich-static'
import type { AnbieterTarif } from '@/lib/tarife/lookup'

const dbTarife: AnbieterTarif[] = [
  {
    anbieter_name: 'DELA',
    tarif_name: 'sorgenfrei Leben',
    beitrag_eur: 17.14,
    besonderheiten: { wartezeit_monate: 0, gp: false, doppelte_unfall: true },
    badges: [],
  },
  {
    anbieter_name: 'Allianz',
    tarif_name: 'Bestattungsschutzbrief',
    beitrag_eur: 19.8,
    besonderheiten: { wartezeit_monate: 12, gp: true, doppelte_unfall: true },
    badges: [],
  },
]

describe('Vergleich integration — DB tarife → rendered insurer rows', () => {
  it('renders one row per insurer from tarife table mapping', () => {
    const anbieter = mapTarifeToVergleichOffers(dbTarife)

    render(
      <Vergleich
        anbieter={anbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    expect(screen.getByText('DELA')).toBeDefined()
    expect(screen.getByText('Allianz')).toBeDefined()
  })

  it('renders check icon when gp=false and minus when gp=true', () => {
    const anbieter = mapTarifeToVergleichOffers(dbTarife)

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

  it('renders beitrag from DB as formatted monthly premium', () => {
    const anbieter = mapTarifeToVergleichOffers(dbTarife)

    render(
      <Vergleich
        anbieter={anbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    expect(screen.getByText('ab 17,14 €/Monat')).toBeDefined()
    expect(screen.getByText('ab 19,80 €/Monat')).toBeDefined()
  })
})
