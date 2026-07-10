// Tests for ProduktArchiveActions — hard delete only (status lives in ProduktStatusToggle).
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

describe('ProduktArchiveActions — status not archived', () => {
  it('renders nothing for active products', () => {
    const { container } = render(
      <ProduktArchiveActions id="p-1" name="Sterbegeld" status="aktiv" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for draft products', () => {
    const { container } = render(
      <ProduktArchiveActions id="p-1" name="X" status="entwurf" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ProduktArchiveActions — status archived', () => {
  it('shows only the hard-delete button', () => {
    render(<ProduktArchiveActions id="p-1" name="X" status="archiviert" />)
    expect(screen.getByText('Endgültig löschen')).toBeInTheDocument()
    expect(screen.queryByText('Archivieren')).not.toBeInTheDocument()
    expect(screen.queryByText('Wiederherstellen')).not.toBeInTheDocument()
  })

  it('hard delete requires confirm and sends DELETE', async () => {
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
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('aborts hard delete when user cancels', () => {
    mockConfirm.mockReturnValueOnce(false)
    render(<ProduktArchiveActions id="p-1" name="X" status="archiviert" />)
    fireEvent.click(screen.getByText('Endgültig löschen'))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows error when DELETE returns 500', async () => {
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
