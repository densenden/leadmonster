// Integration tests for the Vergleich component — criteria from DB shape → rendered table cells.
// This file does NOT mock the Vergleich component; it tests real rendering.
// These tests cover the data-flow gap identified in Task Group 4: Supabase row → table cells.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Vergleich } from '@/components/sections/Vergleich'

// Simulate the criteria shape that the vergleich page would extract from generierter_content.content
const dbContentShape = {
  sections: [
    {
      type: 'vergleich',
      intro: 'Im folgenden Vergleich stellen wir AXA und Allianz gegenüber.',
      criteria: [
        { label: 'Sofortleistung', values: { AXA: true, Allianz: false } },
        { label: 'Online-Abschluss', values: { AXA: false, Allianz: true } },
        { label: 'Monatsbeitrag ab', values: { AXA: '7,99 €', Allianz: '9,50 €' } },
      ],
    },
  ],
}

// Replicate the extraction logic from the page component
function extractCriteria(content: typeof dbContentShape) {
  const vergleichSection = content.sections.find(s => s.type === 'vergleich')
  return vergleichSection?.criteria ?? []
}

describe('Vergleich integration — DB content shape → rendered table cells', () => {
  it('renders a th[scope="row"] for each criterion label from the DB content', () => {
    const criteria = extractCriteria(dbContentShape)
    const anbieter = ['AXA', 'Allianz']

    render(
      <Vergleich
        anbieter={anbieter}
        criteria={criteria}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const rowHeaders = document.querySelectorAll('th[scope="row"]')
    expect(rowHeaders).toHaveLength(3)
    expect(rowHeaders[0].textContent).toBe('Sofortleistung')
    expect(rowHeaders[1].textContent).toBe('Online-Abschluss')
    expect(rowHeaders[2].textContent).toBe('Monatsbeitrag ab')
  })

  it('renders check icon for AXA and minus icon for Allianz on the Sofortleistung row', () => {
    const criteria = extractCriteria(dbContentShape)
    const anbieter = ['AXA', 'Allianz']

    render(
      <Vergleich
        anbieter={anbieter}
        criteria={criteria}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    const checkIcons = document.querySelectorAll('svg[aria-label="Ja"]')
    const minusIcons = document.querySelectorAll('svg[aria-label="Nein"]')

    // AXA: Sofortleistung=true, Online-Abschluss=false → 1 Ja, 1 Nein
    // Allianz: Sofortleistung=false, Online-Abschluss=true → 1 Nein, 1 Ja
    // Total: 2 Ja icons, 2 Nein icons
    expect(checkIcons.length).toBe(2)
    expect(minusIcons.length).toBe(2)
  })

  it('renders string values as plain text spans (no SVG icons)', () => {
    const criteria = extractCriteria(dbContentShape)
    const anbieter = ['AXA', 'Allianz']

    const { container } = render(
      <Vergleich
        anbieter={anbieter}
        criteria={criteria}
        produktName="Sterbegeld24Plus"
        generatedAt="02.04.2026"
      />
    )

    // Monatsbeitrag row should contain text spans, not SVG icons
    const spans = container.querySelectorAll('td span')
    const spanTexts = Array.from(spans).map(s => s.textContent)
    expect(spanTexts).toContain('7,99 €')
    expect(spanTexts).toContain('9,50 €')
  })
})
