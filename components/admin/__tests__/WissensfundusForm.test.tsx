// UI component tests for WissensfundusForm, DeleteConfirm, and category filter behavior.
// Tests are isolated from Supabase and Next.js router via mocks.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock 'use server' directive — server actions cannot run in jsdom.
// The form tests verify UI behavior; action calls are controlled via the action prop.
vi.mock('@/app/admin/wissensfundus/actions', () => ({
  deleteArtikel: vi.fn(),
  createArtikel: vi.fn(),
  updateArtikel: vi.fn(),
}))

// ---------------------------------------------------------------------------
// WissensfundusForm rendering tests
// ---------------------------------------------------------------------------

describe('WissensfundusForm — field rendering', () => {
  beforeEach(() => {
    vi.resetModules()
    mockPush.mockClear()
  })

  it('renders all four fields: kategorie select, thema input, inhalt textarea, tags input', async () => {
    const { WissensfundusForm } = await import('../WissensfundusForm')
    const mockAction = vi.fn().mockResolvedValue({ success: true })

    render(React.createElement(WissensfundusForm, { action: mockAction }))

    expect(screen.getByLabelText('Kategorie')).toBeDefined()
    expect(screen.getByLabelText('Thema')).toBeDefined()
    expect(screen.getByLabelText('Inhalt')).toBeDefined()
    expect(screen.getByLabelText('Tags')).toBeDefined()
  })

  it('renders the Speichern and Abbrechen buttons', async () => {
    const { WissensfundusForm } = await import('../WissensfundusForm')
    const mockAction = vi.fn().mockResolvedValue({ success: true })

    render(React.createElement(WissensfundusForm, { action: mockAction }))

    expect(screen.getByRole('button', { name: /speichern/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /abbrechen/i })).toBeDefined()
  })

  it('pre-fills fields from the artikel prop in edit mode', async () => {
    const { WissensfundusForm } = await import('../WissensfundusForm')
    const mockAction = vi.fn().mockResolvedValue({ success: true })

    const existingArtikel = {
      id: 'test-id',
      kategorie: 'pflege',
      thema: 'Pflegeversicherung',
      inhalt: 'Die Pflegeversicherung hilft bei Pflegebedürftigkeit.',
      tags: ['pflege', 'grundlagen'],
    }

    render(
      React.createElement(WissensfundusForm, { artikel: existingArtikel, action: mockAction })
    )

    const themaInput = screen.getByLabelText('Thema') as HTMLInputElement
    expect(themaInput.value).toBe('Pflegeversicherung')

    const tagsInput = screen.getByLabelText('Tags') as HTMLInputElement
    expect(tagsInput.value).toBe('pflege, grundlagen')
  })
})

// ---------------------------------------------------------------------------
// WissensfundusForm — field-level error display
// ---------------------------------------------------------------------------

describe('WissensfundusForm — field-level error display', () => {
  beforeEach(() => {
    vi.resetModules()
    mockPush.mockClear()
  })

  it('shows field error for thema when thema is too short on submit', async () => {
    const { WissensfundusForm } = await import('../WissensfundusForm')
    const mockAction = vi.fn().mockResolvedValue({ success: true })

    render(React.createElement(WissensfundusForm, { action: mockAction }))

    // Set thema to a too-short value (client-side Zod will catch this)
    const themaInput = screen.getByLabelText('Thema')
    fireEvent.change(themaInput, { target: { value: 'ab' } })

    const inhaltTextarea = screen.getByLabelText('Inhalt')
    fireEvent.change(inhaltTextarea, { target: { value: 'Ausreichend langer Inhalt hier.' } })

    fireEvent.submit(screen.getByRole('button', { name: /speichern/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/mindestens 3 Zeichen/i)).toBeDefined()
    })

    // Action should NOT have been called because validation failed client-side
    expect(mockAction).not.toHaveBeenCalled()
  })

  it('shows server-returned fieldErrors for thema when action returns them', async () => {
    const { WissensfundusForm } = await import('../WissensfundusForm')
    const mockAction = vi.fn().mockResolvedValue({
      success: false,
      fieldErrors: { thema: ['Thema ist bereits vergeben.'] },
    })

    render(React.createElement(WissensfundusForm, { action: mockAction }))

    // Fill valid values so client-side Zod passes
    fireEvent.change(screen.getByLabelText('Thema'), {
      target: { value: 'Gültiges Thema Label' },
    })
    fireEvent.change(screen.getByLabelText('Inhalt'), {
      target: { value: 'Ausreichend langer Inhalt für den Test der Fehlermeldung.' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /speichern/i }).closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Thema ist bereits vergeben.')).toBeDefined()
    })
  })

  it('navigates to list on successful submission', async () => {
    const { WissensfundusForm } = await import('../WissensfundusForm')
    const mockAction = vi.fn().mockResolvedValue({ success: true })

    render(React.createElement(WissensfundusForm, { action: mockAction }))

    fireEvent.change(screen.getByLabelText('Thema'), {
      target: { value: 'Gültiges Thema' },
    })
    fireEvent.change(screen.getByLabelText('Inhalt'), {
      target: { value: 'Ausreichend langer Inhalt für Validierung hier.' },
    })

    fireEvent.submit(screen.getByRole('button', { name: /speichern/i }).closest('form')!)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/wissensfundus')
    })
  })

  it('navigates to list when Abbrechen is clicked', async () => {
    const { WissensfundusForm } = await import('../WissensfundusForm')
    const mockAction = vi.fn().mockResolvedValue({ success: true })

    render(React.createElement(WissensfundusForm, { action: mockAction }))

    fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }))

    expect(mockPush).toHaveBeenCalledWith('/admin/wissensfundus')
  })
})

// ---------------------------------------------------------------------------
// DeleteConfirm — inline confirmation toggle
// ---------------------------------------------------------------------------

describe('DeleteConfirm — confirmation toggle', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('shows only the Löschen button by default', async () => {
    const { DeleteConfirm } = await import(
      '@/app/admin/(protected)/wissensfundus/_components/DeleteConfirm'
    )

    render(React.createElement(DeleteConfirm, { id: 'test-id' }))

    expect(screen.getByRole('button', { name: /löschen/i })).toBeDefined()
    expect(screen.queryByText('Artikel wirklich löschen?')).toBeNull()
  })

  it('shows confirmation prompt when Löschen is clicked', async () => {
    const { DeleteConfirm } = await import(
      '@/app/admin/(protected)/wissensfundus/_components/DeleteConfirm'
    )

    render(React.createElement(DeleteConfirm, { id: 'test-id' }))

    fireEvent.click(screen.getByRole('button', { name: /löschen/i }))

    expect(screen.getByText('Artikel wirklich löschen?')).toBeDefined()
    expect(screen.getByRole('button', { name: /bestätigen/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /abbrechen/i })).toBeDefined()
  })

  it('hides confirmation prompt when Abbrechen is clicked', async () => {
    const { DeleteConfirm } = await import(
      '@/app/admin/(protected)/wissensfundus/_components/DeleteConfirm'
    )

    render(React.createElement(DeleteConfirm, { id: 'test-id' }))

    fireEvent.click(screen.getByRole('button', { name: /löschen/i }))
    expect(screen.getByText('Artikel wirklich löschen?')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /abbrechen/i }))

    await waitFor(() => {
      expect(screen.queryByText('Artikel wirklich löschen?')).toBeNull()
    })
  })

  it('calls deleteArtikel with the correct id when Bestätigen is clicked', async () => {
    const { deleteArtikel } = await import('@/app/admin/wissensfundus/actions')
    const mockDeleteFn = vi.mocked(deleteArtikel)
    mockDeleteFn.mockResolvedValue({ success: true })

    const { DeleteConfirm } = await import(
      '@/app/admin/(protected)/wissensfundus/_components/DeleteConfirm'
    )

    render(React.createElement(DeleteConfirm, { id: 'article-uuid-789' }))

    fireEvent.click(screen.getByRole('button', { name: /löschen/i }))
    fireEvent.click(screen.getByRole('button', { name: /bestätigen/i }))

    await waitFor(() => {
      expect(mockDeleteFn).toHaveBeenCalledWith('article-uuid-789')
    })
  })
})
