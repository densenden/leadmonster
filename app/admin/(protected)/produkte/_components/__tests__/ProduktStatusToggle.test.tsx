// Tests for ProduktStatusToggle — sole status control on the product list.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProduktStatusToggle } from '../ProduktStatusToggle'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockConfirm = vi.fn()
const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'confirm', { writable: true, value: mockConfirm })
  vi.stubGlobal('fetch', mockFetch)
})

describe('ProduktStatusToggle', () => {
  it('renders all three status pills with the current one pressed', () => {
    render(
      <ProduktStatusToggle produktId="p-1" produktName="Sterbegeld" initialStatus="aktiv" />,
    )
    expect(screen.getByRole('button', { name: 'Entwurf' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Aktiv' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Archiv' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('PATCHes status on click without confirm for entwurf/aktiv', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'p-1', status: 'entwurf' }, error: null }),
    })

    render(
      <ProduktStatusToggle produktId="p-1" produktName="Sterbegeld" initialStatus="aktiv" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockConfirm).not.toHaveBeenCalled()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/produkte/p-1/status')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ status: 'entwurf' })
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('requires confirm before archiving', async () => {
    mockConfirm.mockReturnValueOnce(false)
    render(
      <ProduktStatusToggle produktId="p-1" produktName="Sterbegeld" initialStatus="aktiv" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Archiv' }))
    expect(mockConfirm).toHaveBeenCalled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('PATCHes archiviert when user confirms', async () => {
    mockConfirm.mockReturnValueOnce(true)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'p-1', status: 'archiviert' }, error: null }),
    })

    render(
      <ProduktStatusToggle produktId="p-1" produktName="Sterbegeld" initialStatus="aktiv" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Archiv' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      status: 'archiviert',
    })
  })

  it('rolls back optimistic UI and shows error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: 'DB_ERROR' } }),
    })

    render(
      <ProduktStatusToggle produktId="p-1" produktName="X" initialStatus="aktiv" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Entwurf' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('DB_ERROR')
    })
    expect(screen.getByRole('button', { name: 'Aktiv' })).toHaveAttribute('aria-pressed', 'true')
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
