// Tests for components/sections/FAQ.tsx — accordion Q&A component.
// Uses React Testing Library for DOM interaction tests.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FAQ } from '../FAQ'

const sampleItems = [
  { frage: 'Was ist Sterbegeld?', antwort: 'Sterbegeld ist eine Versicherungsleistung.' },
  { frage: 'Wer kann sich versichern?', antwort: 'Personen ab 18 Jahren.' },
  { frage: 'Wie hoch ist der Beitrag?', antwort: 'Ab 7,99 Euro monatlich.' },
]

describe('FAQ component', () => {
  it('renders the correct number of <details> elements for the items array', () => {
    render(<FAQ items={sampleItems} />)
    const detailsElements = document.querySelectorAll('details')
    expect(detailsElements).toHaveLength(sampleItems.length)
  })

  it('renders each frage verbatim inside an <h3> element', () => {
    render(<FAQ items={sampleItems} />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(sampleItems.length)
    expect(headings[0].textContent).toBe('Was ist Sterbegeld?')
    expect(headings[1].textContent).toBe('Wer kann sich versichern?')
    expect(headings[2].textContent).toBe('Wie hoch ist der Beitrag?')
  })

  it('renders each antwort verbatim without truncation', () => {
    render(<FAQ items={sampleItems} />)
    // All answers must appear in the DOM verbatim
    expect(screen.getByText('Sterbegeld ist eine Versicherungsleistung.')).toBeDefined()
    expect(screen.getByText('Personen ab 18 Jahren.')).toBeDefined()
    expect(screen.getByText('Ab 7,99 Euro monatlich.')).toBeDefined()
  })

  it('all <details> start in closed state (no open attribute)', () => {
    render(<FAQ items={sampleItems} />)
    const detailsElements = document.querySelectorAll('details')
    detailsElements.forEach(el => {
      expect(el.hasAttribute('open')).toBe(false)
    })
  })

  it('toggles <details> open state when <summary> is clicked', async () => {
    const user = userEvent.setup()
    render(<FAQ items={[{ frage: 'Was ist Sterbegeld?', antwort: 'Eine Versicherung.' }]} />)

    const details = document.querySelector('details')!
    expect(details.open).toBe(false)

    const summary = details.querySelector('summary')!
    await user.click(summary)

    // jsdom toggles the open attribute on <details> when summary is clicked
    expect(details.open).toBe(true)
  })

  it('applies motion-reduce class to animated elements', () => {
    render(<FAQ items={sampleItems} />)
    // The chevron span must carry the motion-reduce transition-none class
    const chevrons = document.querySelectorAll('[aria-hidden="true"]')
    expect(chevrons.length).toBeGreaterThan(0)
    chevrons.forEach(el => {
      expect(el.classList.toString()).toContain('motion-reduce')
    })
  })

  it('question <summary> has minimum 44px touch target via min-h class', () => {
    render(<FAQ items={sampleItems} />)
    const summaries = document.querySelectorAll('summary')
    summaries.forEach(el => {
      // min-h-[44px] is applied as a class string
      expect(el.className).toContain('min-h-[44px]')
    })
  })

  it('renders an accessible aria-label on the section wrapper', () => {
    render(<FAQ items={sampleItems} />)
    const section = screen.getByRole('region', { name: 'Häufige Fragen' })
    expect(section).toBeDefined()
  })
})
