// Tests for components/sections/Vergleich.tsx — comparison table component.
// Component renders one row per insurer (AnbieterOffer); columns are fixed criteria.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Vergleich, type AnbieterOffer } from '../Vergleich'

const sampleAnbieter: AnbieterOffer[] = [
  {
    name: 'AXA',
    wartezeit: 'Keine bei Unfalltod',
    gesundheitsfragen: 'Vereinfacht',
    garantierte_aufnahme: true,
    beitrag_beispiel: 'ab 7,99 €/Monat',
    besonderheit: 'Direktauszahlung in 24h',
  },
  {
    name: 'Allianz',
    wartezeit: '6 Monate',
    gesundheitsfragen: 'Ja',
    garantierte_aufnahme: false,
    beitrag_beispiel: 'ab 9,50 €/Monat',
    besonderheit: 'Familienbonus',
  },
  {
    name: 'Zurich',
    wartezeit: '12 Monate',
    gesundheitsfragen: 'Nein',
    garantierte_aufnahme: true,
    beitrag_beispiel: 'auf Anfrage',
    besonderheit: 'Beratungs-Hotline',
  },
]

describe('Vergleich component', () => {
  it('renders one row per insurer with the insurer name', () => {
    render(
      <Vergleich
        anbieter={sampleAnbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    expect(screen.getByText('AXA')).toBeDefined()
    expect(screen.getByText('Allianz')).toBeDefined()
    expect(screen.getByText('Zurich')).toBeDefined()
  })

  it('boolean garantierte_aufnahme=true renders a checkmark with aria-label="Ja"', () => {
    render(
      <Vergleich
        anbieter={[sampleAnbieter[0]]}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const jaIcon = document.querySelector('svg[aria-label="Ja"]')
    expect(jaIcon).not.toBeNull()
  })

  it('boolean garantierte_aufnahme=false renders a minus with aria-label="Nein"', () => {
    render(
      <Vergleich
        anbieter={[sampleAnbieter[1]]}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const neinIcon = document.querySelector('svg[aria-label="Nein"]')
    expect(neinIcon).not.toBeNull()
  })

  it('renders beitrag_beispiel string value as plain text', () => {
    render(
      <Vergleich
        anbieter={[sampleAnbieter[0]]}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    expect(screen.getByText('ab 7,99 €/Monat')).toBeDefined()
  })

  it('wrapping container has overflow-x-auto class for horizontal scrolling', () => {
    const { container } = render(
      <Vergleich
        anbieter={sampleAnbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('overflow-x-auto')
  })

  it('disclaimer renders with the generatedAt date', () => {
    render(
      <Vergleich
        anbieter={sampleAnbieter}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const disclaimer = screen.getByText(/Alle Angaben ohne Gewähr\. Stand: 02\.04\.2026\./)
    expect(disclaimer).toBeDefined()
  })
})
