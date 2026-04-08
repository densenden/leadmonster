// Tests for components/sections/Vergleich.tsx — comparison table component.
// Uses React Testing Library; all tests are pure presentational (no Supabase).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Vergleich } from '../Vergleich'

const sampleAnbieter = ['AXA', 'Allianz', 'Zurich']
const sampleCriteria = [
  {
    label: 'Sofortleistung',
    values: { AXA: true, Allianz: false, Zurich: true } as Record<string, string | boolean>,
  },
  {
    label: 'Monatsbeitrag',
    values: { AXA: 'ab 7,99 €', Allianz: 'ab 9,50 €', Zurich: 'auf Anfrage' } as Record<string, string | boolean>,
  },
]

describe('Vergleich component', () => {
  it('renders one <th scope="col"> per insurer name', () => {
    render(
      <Vergleich
        anbieter={sampleAnbieter}
        criteria={sampleCriteria}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const colHeaders = document
      .querySelectorAll('th[scope="col"]')
    // There is one col header for "Kriterium" plus one per insurer
    const insurer = Array.from(colHeaders).filter(th => sampleAnbieter.includes(th.textContent ?? ''))
    expect(insurer).toHaveLength(sampleAnbieter.length)
    expect(insurer[0].textContent).toBe('AXA')
    expect(insurer[1].textContent).toBe('Allianz')
    expect(insurer[2].textContent).toBe('Zurich')
  })

  it('boolean true renders an SVG element with aria-label="Ja"', () => {
    render(
      <Vergleich
        anbieter={['AXA']}
        criteria={[{ label: 'Sofortleistung', values: { AXA: true } }]}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const jaIcon = document.querySelector('svg[aria-label="Ja"]')
    expect(jaIcon).not.toBeNull()
  })

  it('boolean false renders an element with aria-label="Nein"', () => {
    render(
      <Vergleich
        anbieter={['Allianz']}
        criteria={[{ label: 'Sofortleistung', values: { Allianz: false } }]}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const neinIcon = document.querySelector('svg[aria-label="Nein"]')
    expect(neinIcon).not.toBeNull()
  })

  it('string value renders as plain text inside a <td>', () => {
    render(
      <Vergleich
        anbieter={['AXA']}
        criteria={[{ label: 'Monatsbeitrag', values: { AXA: 'ab 7,99 €' } }]}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const cell = screen.getByText('ab 7,99 €')
    expect(cell).toBeDefined()
    // The text is inside a <td> via a <span>
    expect(cell.tagName.toLowerCase()).toBe('span')
    expect(cell.closest('td')).not.toBeNull()
  })

  it('wrapping div has overflow-x-auto class', () => {
    const { container } = render(
      <Vergleich
        anbieter={sampleAnbieter}
        criteria={sampleCriteria}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('overflow-x-auto')
  })

  it('disclaimer renders with the generatedAt string', () => {
    render(
      <Vergleich
        anbieter={sampleAnbieter}
        criteria={sampleCriteria}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const disclaimer = screen.getByText(/Alle Angaben ohne Gewähr\. Stand: 02\.04\.2026\./)
    expect(disclaimer).toBeDefined()
  })
})
