// Tests for the ContentPreview client component.
// fetch and next/navigation are mocked to isolate component behavior.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import type { GenerierterContent } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRefresh = vi.fn()
const mockConfirm = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock window.confirm before component import
Object.defineProperty(global, 'confirm', {
  writable: true,
  value: mockConfirm,
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<{
  id: string
  title: string
  meta_title: string
  meta_desc: string
  status: 'entwurf' | 'review' | 'publiziert'
  content: Record<string, unknown>
}>): GenerierterContent {
  return {
    id: overrides.id ?? 'row-1',
    produkt_id: 'prod-1',
    page_type: 'hauptseite' as const,
    slug: null,
    title: overrides.title ?? 'Originaltitel',
    meta_title: overrides.meta_title ?? 'Kurzer Meta-Titel',
    meta_desc: overrides.meta_desc ?? 'Kurze Beschreibung für die Seite',
    content: overrides.content ?? null,
    schema_markup: null,
    status: overrides.status ?? ('entwurf' as const),
    generated_at: '2026-04-07T10:00:00.000Z',
    published_at: null,
    created_at: '2026-04-07T10:00:00.000Z',
    updated_at: '2026-04-07T10:00:00.000Z',
  } as unknown as GenerierterContent
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContentPreview — layout', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders both the preview column and the editor column', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({}),
        produktId: 'prod-1',
      })
    )

    // Left column label
    expect(screen.getByText('Vorschau')).toBeDefined()
    // Right column labels
    expect(screen.getByLabelText('Seitentitel')).toBeDefined()
    expect(screen.getByLabelText('Meta-Titel')).toBeDefined()
    expect(screen.getByLabelText('Meta-Beschreibung')).toBeDefined()
  })
})

describe('ContentPreview — Multi-Line + Array-Editing', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('rendert lange Strings als <textarea>', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    const longText = 'A'.repeat(120)
    render(
      React.createElement(ContentPreview, {
        row: makeRow({
          content: { sections: [{ type: 'body', heading: 'H', text: longText }] },
        }),
        produktId: 'prod-1',
      }),
    )
    // <details> aufklappen
    fireEvent.click(screen.getByText(/^body$/))
    const textarea = screen.getByDisplayValue(longText)
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('rendert kurze Strings ohne bekannte Long-Form-Keys als <input>', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({
          content: { sections: [{ type: 'hero', headline: 'Kurzer Titel', cta_text: 'Jetzt' }] },
        }),
        produktId: 'prod-1',
      }),
    )
    fireEvent.click(screen.getByText(/^hero$/))
    const input = screen.getByDisplayValue('Kurzer Titel')
    expect(input.tagName).toBe('INPUT')
  })

  it('rendert string-Arrays als Liste editierbarer Textareas mit Hinzufügen-Button', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({
          content: {
            sections: [
              {
                type: 'body',
                heading: 'Section',
                paragraphs: ['Erster Absatz', 'Zweiter Absatz'],
              },
            ],
          },
        }),
        produktId: 'prod-1',
      }),
    )
    fireEvent.click(screen.getByText(/^body$/))

    expect(screen.getByDisplayValue('Erster Absatz')).toBeDefined()
    expect(screen.getByDisplayValue('Zweiter Absatz')).toBeDefined()
    expect(screen.getByText(/paragraphs \(2\)/)).toBeDefined()
    expect(screen.getByText(/Eintrag hinzufügen/)).toBeDefined()
  })

  it('Klick auf "Eintrag hinzufügen" fügt eine leere Zeile hinzu', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({
          content: {
            sections: [{ type: 'body', heading: 'S', paragraphs: ['Eins'] }],
          },
        }),
        produktId: 'prod-1',
      }),
    )
    fireEvent.click(screen.getByText(/^body$/))
    expect(screen.getByText(/paragraphs \(1\)/)).toBeDefined()

    fireEvent.click(screen.getByText(/Eintrag hinzufügen/))
    expect(screen.getByText(/paragraphs \(2\)/)).toBeDefined()
  })

  it('rendert Listen von Objekten (steps.items) als verschachtelte Editoren', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({
          content: {
            sections: [
              {
                type: 'steps',
                heading: 'Schritte',
                items: [
                  { number: 1, title: 'Antrag', description: 'Antrag stellen' },
                ],
              },
            ],
          },
        }),
        produktId: 'prod-1',
      }),
    )
    fireEvent.click(screen.getByText(/^steps$/))

    expect(screen.getByDisplayValue('Antrag')).toBeDefined()
    expect(screen.getByDisplayValue('Antrag stellen')).toBeDefined()
    expect(screen.getByText(/Eintrag 1/)).toBeDefined()
  })
})

describe('ContentPreview — meta_title character counter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('turns the counter and input border red when meta_title exceeds 60 chars', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({}),
        produktId: 'prod-1',
      })
    )

    const metaTitleInput = screen.getByLabelText('Meta-Titel') as HTMLInputElement
    fireEvent.change(metaTitleInput, { target: { value: 'a'.repeat(61) } })

    // The counter should show 61 / 60 Zeichen
    await waitFor(() => {
      expect(screen.getByText('61 / 60 Zeichen')).toBeDefined()
    })

    // The input should have the red border class
    expect(metaTitleInput.classList.contains('border-red-600')).toBe(true)
  })
})

describe('ContentPreview — meta_desc character counter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('turns the counter and textarea border red when meta_desc exceeds 160 chars', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({}),
        produktId: 'prod-1',
      })
    )

    const metaDescTextarea = screen.getByLabelText('Meta-Beschreibung') as HTMLTextAreaElement
    fireEvent.change(metaDescTextarea, { target: { value: 'b'.repeat(161) } })

    await waitFor(() => {
      expect(screen.getByText('161 / 160 Zeichen')).toBeDefined()
    })

    expect(metaDescTextarea.classList.contains('border-red-600')).toBe(true)
  })
})

describe('ContentPreview — Speichern button dirty state', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('Speichern button is disabled when form has no unsaved changes', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({}),
        produktId: 'prod-1',
      })
    )

    const saveButton = screen.getByRole('button', { name: /speichern/i })
    expect((saveButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('Speichern button becomes enabled after a field is changed', async () => {
    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({}),
        produktId: 'prod-1',
      })
    )

    const titleInput = screen.getByLabelText('Seitentitel')
    fireEvent.change(titleInput, { target: { value: 'Neuer Titel' } })

    const saveButton = screen.getByRole('button', { name: /speichern/i })
    expect((saveButton as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('ContentPreview — Regenerieren dirty state warning', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('shows confirm dialog before regenerating when form is dirty', async () => {
    // confirm returns false so fetch is not called
    mockConfirm.mockReturnValue(false)
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: {}, error: null }),
    } as Response)

    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow({}),
        produktId: 'prod-1',
      })
    )

    // Make form dirty
    fireEvent.change(screen.getByLabelText('Seitentitel'), {
      target: { value: 'Geänderter Titel' },
    })

    fireEvent.click(screen.getByRole('button', { name: /regenerieren/i }))

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('Nicht gespeicherte Änderungen')
    )
    // fetch should NOT be called because user cancelled
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
