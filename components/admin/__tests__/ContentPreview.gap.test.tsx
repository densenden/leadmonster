// Gap tests for ContentPreview — covers editorial workflow and ratgeber row independence.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

Object.defineProperty(global, 'confirm', {
  writable: true,
  value: vi.fn().mockReturnValue(true),
})

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(id: string, overrides: Partial<{
  title: string
  meta_title: string
  status: 'entwurf' | 'review' | 'publiziert'
}> = {}) {
  return {
    id,
    produkt_id: 'prod-1',
    page_type: 'hauptseite' as const,
    slug: null,
    title: overrides.title ?? 'Originaltitel',
    meta_title: overrides.meta_title ?? 'Kurzer Titel',
    meta_desc: 'Beschreibung',
    content: null,
    schema_markup: null,
    status: overrides.status ?? ('entwurf' as const),
    generated_at: '2026-04-07T10:00:00.000Z',
    published_at: null,
  }
}

// ---------------------------------------------------------------------------
// Gap tests
// ---------------------------------------------------------------------------

describe('ContentPreview — editorial workflow (edit → save → status advance)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockRefresh.mockReset()
  })

  it('calls fetch PATCH with correct meta_title at exactly 60 chars and calls router.refresh on success', async () => {
    const sixtyCharTitle = 'a'.repeat(60)
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'row-1' }, error: null }),
    } as Response)

    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, { row: makeRow('row-1'), produktId: 'prod-1' })
    )

    const metaTitleInput = screen.getByLabelText('Meta-Titel')
    fireEvent.change(metaTitleInput, { target: { value: sixtyCharTitle } })

    const saveButton = screen.getByRole('button', { name: /speichern/i })
    expect((saveButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/admin/content/row-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining(sixtyCharTitle),
        }),
      )
    })

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('calls router.refresh after a successful status advance to publiziert', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'row-1', status: 'publiziert' }, error: null }),
    } as Response)

    const { ContentPreview } = await import('../ContentPreview')
    render(
      React.createElement(ContentPreview, {
        row: makeRow('row-1', { status: 'review' }),
        produktId: 'prod-1',
      })
    )

    // 'review' → 'publiziert' button
    const publishButton = screen.getByRole('button', { name: /publizieren/i })
    fireEvent.click(publishButton)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/admin/content/row-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('publiziert'),
        }),
      )
    })

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})

describe('ContentPreview — two ratgeber rows are independent (no shared state)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('changing the title in row-A does not affect row-B', async () => {
    const { ContentPreview } = await import('../ContentPreview')

    const rowA = { ...makeRow('row-a'), title: 'Titel A' }
    const rowB = { ...makeRow('row-b'), title: 'Titel B' }

    const { container } = render(
      React.createElement(
        'div',
        null,
        React.createElement(ContentPreview, { row: rowA, produktId: 'prod-1' }),
        React.createElement(ContentPreview, { row: rowB, produktId: 'prod-1' }),
      )
    )

    const titleInputs = container.querySelectorAll('input[id^="title-"]')
    expect(titleInputs).toHaveLength(2)

    const inputA = titleInputs[0] as HTMLInputElement
    const inputB = titleInputs[1] as HTMLInputElement

    expect(inputA.value).toBe('Titel A')
    expect(inputB.value).toBe('Titel B')

    // Change only row-A's title
    fireEvent.change(inputA, { target: { value: 'Geänderter Titel A' } })

    expect(inputA.value).toBe('Geänderter Titel A')
    // row-B should be unaffected
    expect(inputB.value).toBe('Titel B')
  })
})
