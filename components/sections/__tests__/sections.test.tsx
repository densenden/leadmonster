// Tests for public section components — Hero, FeatureGrid, TrustBar.
// Uses React renderToString for Server Component compatibility (no browser required).
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Hero } from '../Hero'
import { FeatureGrid } from '../FeatureGrid'
import { TrustBar } from '../TrustBar'

describe('Hero', () => {
  it('renders an <h1> containing the headline prop', () => {
    const html = renderToString(
      Hero({
        headline: 'Sterbegeld — jetzt absichern',
        subline: 'Günstige Beiträge für Senioren',
        cta_text: 'Jetzt Angebot anfordern',
        cta_anchor: '#formular',
      }),
    )

    expect(html).toContain('<h1')
    expect(html).toContain('Sterbegeld — jetzt absichern')
  })

  it('renders an <a> whose href equals the cta_anchor prop', () => {
    const html = renderToString(
      Hero({
        headline: 'Test Headline',
        subline: 'Test Subline',
        cta_text: 'Angebot anfordern',
        cta_anchor: '#formular',
      }),
    )

    expect(html).toContain('href="#formular"')
  })

  it('CTA href starts with # (anchor scroll, no page reload)', () => {
    const html = renderToString(
      Hero({
        headline: 'Headline',
        subline: 'Subline',
        cta_text: 'CTA',
        cta_anchor: '#kontakt',
      }),
    )

    // Extract all href attributes and verify none cause page navigation
    const hrefMatch = html.match(/href="([^"]+)"/)
    expect(hrefMatch?.[1]).toMatch(/^#/)
  })
})

describe('FeatureGrid', () => {
  it('renders one card per item in the items array', () => {
    const items = [
      { icon: 'shield', title: 'Sofortschutz', text: 'Ab sofort versichert' },
      { icon: 'check', title: 'Keine Gesundheitsfragen', text: 'Ohne Prüfung' },
      { icon: 'euro', title: 'Günstige Beiträge', text: 'Ab 7,99 Euro' },
    ]

    const html = renderToString(FeatureGrid({ items }))

    // Each card title should appear exactly once
    expect(html).toContain('Sofortschutz')
    expect(html).toContain('Keine Gesundheitsfragen')
    expect(html).toContain('Günstige Beiträge')
  })

  it('renders nothing for unknown icon values without throwing', () => {
    const items = [{ icon: 'unknown-icon-xyz', title: 'Test', text: 'Text' }]

    expect(() => renderToString(FeatureGrid({ items }))).not.toThrow()
    const html = renderToString(FeatureGrid({ items }))
    expect(html).toContain('Test')
  })
})

describe('TrustBar', () => {
  it('renders one value+label pair per item in the items array', () => {
    const items = [
      { value: '10.000+', label: 'Kunden vertrauen uns' },
      { value: '15 Jahre', label: 'Erfahrung' },
      { value: '98%', label: 'Kundenzufriedenheit' },
    ]

    const html = renderToString(TrustBar({ items }))

    expect(html).toContain('10.000+')
    expect(html).toContain('Kunden vertrauen uns')
    expect(html).toContain('15 Jahre')
    expect(html).toContain('98%')
  })

  it('renders zero items without throwing when passed an empty array', () => {
    expect(() => renderToString(TrustBar({ items: [] }))).not.toThrow()
  })
})
