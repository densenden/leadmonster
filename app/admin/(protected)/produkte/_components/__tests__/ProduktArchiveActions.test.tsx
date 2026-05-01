// Tests für ProduktArchiveActions — Soft-Delete-UX.
// Verifiziert die zwei Modi (Archivieren vs. Wiederherstellen + Endgültig löschen)
// und stellt sicher, dass die korrekten HTTP-Methoden + Bodies gefeuert werden.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProduktArchiveActions } from '../ProduktArchiveActions'

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

describe('ProduktArchiveActions — status NICHT archiviert', () => {
  it('zeigt nur einen "Archivieren"-Button für aktive Produkte', () => {
    render(<ProduktArchiveActions id="p-1" name="Sterbegeld" status="aktiv" />)
    expect(screen.getByText('Archivieren')).toBeInTheDocument()
    expect(screen.queryByText('Wiederherstellen')).not.toBeInTheDocument()
    expect(screen.queryByText('Endgültig löschen')).not.toBeInTheDocument()
  })

  it('zeigt "Archivieren" auch für entwurf-Produkte', () => {
    render(<ProduktArchiveActions id="p-1" name="X" status="entwurf" />)
    expect(screen.getByText('Archivieren')).toBeInTheDocument()
  })

  it('Klick auf Archivieren erfordert Bestätigung und sendet PATCH /status mit archiviert', async () => {
    mockConfirm.mockReturnValueOnce(true)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'p-1', status: 'archiviert' }, error: null }),
    })

    render(<ProduktArchiveActions id="p-1" name="Sterbegeld" status="aktiv" />)
    fireEvent.click(screen.getByText('Archivieren'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockConfirm).toHaveBeenCalled()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/produkte/p-1/status')
    expect((init as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ status: 'archiviert' })
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('bricht Archivieren ab, wenn der User Cancel klickt', () => {
    mockConfirm.mockReturnValueOnce(false)
    render(<ProduktArchiveActions id="p-1" name="X" status="aktiv" />)
    fireEvent.click(screen.getByText('Archivieren'))
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('ProduktArchiveActions — status archiviert', () => {
  it('zeigt zwei Buttons: Wiederherstellen + Endgültig löschen', () => {
    render(<ProduktArchiveActions id="p-1" name="X" status="archiviert" />)
    expect(screen.getByText('Wiederherstellen')).toBeInTheDocument()
    expect(screen.getByText('Endgültig löschen')).toBeInTheDocument()
    expect(screen.queryByText('Archivieren')).not.toBeInTheDocument()
  })

  it('Wiederherstellen sendet PATCH /status mit entwurf, ohne Confirm-Dialog', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'p-1', status: 'entwurf' }, error: null }),
    })

    render(<ProduktArchiveActions id="p-1" name="X" status="archiviert" />)
    fireEvent.click(screen.getByText('Wiederherstellen'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockConfirm).not.toHaveBeenCalled()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/produkte/p-1/status')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ status: 'entwurf' })
  })

  it('Endgültig löschen erfordert Confirm und sendet DELETE', async () => {
    mockConfirm.mockReturnValueOnce(true)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'p-1' }, error: null }),
    })

    render(<ProduktArchiveActions id="p-1" name="Sterbegeld" status="archiviert" />)
    fireEvent.click(screen.getByText('Endgültig löschen'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    expect(mockConfirm).toHaveBeenCalled()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/admin/produkte/p-1')
    expect((init as RequestInit).method).toBe('DELETE')
  })

  it('bricht Endgültig löschen ab, wenn Cancel', () => {
    mockConfirm.mockReturnValueOnce(false)
    render(<ProduktArchiveActions id="p-1" name="X" status="archiviert" />)
    fireEvent.click(screen.getByText('Endgültig löschen'))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('zeigt Fehlermeldung, wenn DELETE 500 zurückgibt', async () => {
    mockConfirm.mockReturnValueOnce(true)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'DB ist down' } }),
    })

    render(<ProduktArchiveActions id="p-1" name="X" status="archiviert" />)
    fireEvent.click(screen.getByText('Endgültig löschen'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('DB ist down')
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
