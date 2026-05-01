// Tests für RatgeberRenderer.
// Verifiziert v. a. das MD-Rendering in body-paragraphs/intro/steps —
// der Auto-Cross-Linker (lib/linker/auto-link.ts) injiziert Markdown-Links
// in den Generator-Output, die hier als echte <a>-Tags landen müssen.
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { RatgeberSection } from '@/lib/types/ratgeber'
import { RatgeberRenderer } from '../ratgeber-renderer'

vi.mock('@/components/sections/LeadForm', () => ({
  LeadForm: () => <div data-testid="leadform-stub" />,
}))

const PROPS = {
  articleSlug: 'sterbegeld-wartezeit',
  produktSlug: 'sterbegeld24plus',
  produktId: 'prod-uuid-1',
  zielgruppeTag: 'senioren_50plus',
}

describe('RatgeberRenderer — MD-Rendering', () => {
  it('rendert Markdown-Link im body-paragraph als echten <a>', () => {
    const sections: RatgeberSection[] = [
      {
        type: 'body',
        heading: 'Wartezeit verstehen',
        paragraphs: [
          'Mehr Details zum Thema [Sterbegeld](/wissen/was-ist-sterbegeld) finden Sie hier.',
        ],
      },
    ]
    const { container } = render(<RatgeberRenderer {...PROPS} sections={sections} />)

    const link = container.querySelector('a[href="/wissen/was-ist-sterbegeld"]')
    expect(link).not.toBeNull()
    expect(link?.textContent).toBe('Sterbegeld')
    expect(container.textContent).not.toContain('[Sterbegeld](/wissen')
  })

  it('rendert Markdown-Link in intro als echten <a>', () => {
    const sections: RatgeberSection[] = [
      { type: 'intro', text: 'Ein Überblick zum [Unfalltod](/wissen/unfalltod) als Auslöser.' },
    ]
    const { container } = render(<RatgeberRenderer {...PROPS} sections={sections} />)
    expect(container.querySelector('a[href="/wissen/unfalltod"]')).not.toBeNull()
  })

  it('rendert Markdown-Link in steps.description als echten <a>', () => {
    const sections: RatgeberSection[] = [
      {
        type: 'steps',
        heading: 'In drei Schritten',
        items: [
          {
            number: 1,
            title: 'Antrag stellen',
            description: 'Mit der [Gesundheitsprüfung](/wissen/gesundheitspruefung) starten.',
          },
        ],
      },
    ]
    const { container } = render(<RatgeberRenderer {...PROPS} sections={sections} />)
    expect(container.querySelector('a[href="/wissen/gesundheitspruefung"]')).not.toBeNull()
  })

  it('rendert reinen Text ohne Markdown unverändert', () => {
    const sections: RatgeberSection[] = [
      { type: 'body', heading: 'H', paragraphs: ['Reiner Text ohne Links.'] },
    ]
    const { container } = render(<RatgeberRenderer {...PROPS} sections={sections} />)
    expect(container.textContent).toContain('Reiner Text ohne Links.')
    expect(container.querySelectorAll('a').length).toBe(0)
  })

  it('rendert Markdown-Link in steps-Description (Bug-Fix)', () => {
    const sections: RatgeberSection[] = [
      {
        type: 'steps',
        heading: 'Schritte',
        items: [
          {
            number: 1,
            title: 'Eins',
            description: '[Wartezeit](/wissen/wartezeit) verstehen',
          },
        ],
      },
    ]
    const { container } = render(<RatgeberRenderer {...PROPS} sections={sections} />)
    expect(container.querySelector('a[href="/wissen/wartezeit"]')).not.toBeNull()
  })
})
