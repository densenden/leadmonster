// Component tests for ProduktForm and Badge.
// Uses React Testing Library + Vitest + jsdom environment.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

// Mock next/navigation so ProduktForm can call useRouter.
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock global fetch used in form submit handler.
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { ProduktForm } from '@/components/admin/ProduktForm'
import type { ProduktWithConfig } from '@/lib/supabase/types'
import { Badge } from '@/components/ui/Badge'

// Helper to create a Response-like mock object.
function makeResponse(status: number, data: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => data,
  }
}

describe('Badge', () => {
  it('renders neutral variant with gray styling', () => {
    render(<Badge variant="neutral">Entwurf</Badge>)
    const badge = screen.getByText('Entwurf')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('gray')
  })

  it('renders success variant with green styling', () => {
    render(<Badge variant="success">Aktiv</Badge>)
    const badge = screen.getByText('Aktiv')
    expect(badge.className).toContain('green')
  })

  it('renders danger variant with red styling', () => {
    render(<Badge variant="danger">Archiviert</Badge>)
    const badge = screen.getByText('Archiviert')
    expect(badge.className).toContain('red')
  })
})

describe('ProduktForm — create mode', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockFetch.mockClear()
  })

  it('renders all required fields in create mode', () => {
    render(<ProduktForm mode="create" />)

    expect(screen.getByLabelText(/Produktname/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/URL-Slug/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Produkttyp/i)).toBeInTheDocument()
    expect(screen.getByText(/Zielgruppe/i)).toBeInTheDocument()
    expect(screen.getByText(/Vertriebsfokus/i)).toBeInTheDocument()
    expect(screen.getByText(/Anbieter/i)).toBeInTheDocument()
    expect(screen.getByText(/Verkaufsargumente/i)).toBeInTheDocument()

    // Status field is NOT rendered in create mode
    expect(screen.queryByLabelText(/^Status$/i)).not.toBeInTheDocument()
  })

  it('shows "Produkt speichern" submit button in create mode', () => {
    render(<ProduktForm mode="create" />)
    expect(screen.getByRole('button', { name: /Produkt speichern/i })).toBeInTheDocument()
  })

  it('slug auto-populates from name when slug is pristine', async () => {
    render(<ProduktForm mode="create" />)
    const nameInput = screen.getByLabelText(/Produktname/i)
    const slugInput = screen.getByLabelText(/URL-Slug/i)

    await userEvent.type(nameInput, 'Sterbegeld Plus')

    await waitFor(() => {
      expect((slugInput as HTMLInputElement).value).toBe('sterbegeld-plus')
    })
  })

  it('stops slug auto-population after manual slug edit', async () => {
    render(<ProduktForm mode="create" />)
    const nameInput = screen.getByLabelText(/Produktname/i)
    const slugInput = screen.getByLabelText(/URL-Slug/i)

    // Manually edit the slug first.
    await userEvent.click(slugInput)
    await userEvent.type(slugInput, 'my-custom-slug')

    // Now type in the name.
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'New Product Name')

    // Slug should stay as manually typed value, not auto-generated.
    await waitFor(() => {
      expect((slugInput as HTMLInputElement).value).toBe('my-custom-slug')
    })
  })

  it('shows slug preview below slug input', async () => {
    render(<ProduktForm mode="create" />)
    const nameInput = screen.getByLabelText(/Produktname/i)

    await userEvent.type(nameInput, 'Test')

    await waitFor(() => {
      expect(screen.getByText(/\/test/i)).toBeInTheDocument()
    })
  })

  it('submit button is disabled while request is in flight', async () => {
    // Mock fetch to never resolve during this test.
    mockFetch.mockReturnValue(new Promise(() => {}))

    render(<ProduktForm mode="create" />)

    const nameInput = screen.getByLabelText(/Produktname/i)
    const slugInput = screen.getByLabelText(/URL-Slug/i)

    await userEvent.type(nameInput, 'Test Produkt')
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, 'test-produkt')

    // Select a product type.
    const typSelect = screen.getByLabelText(/Produkttyp/i)
    await userEvent.selectOptions(typSelect, 'sterbegeld')

    // Select fokus radio.
    const sicherheitRadio = screen.getByLabelText(/Sicherheit/i)
    await userEvent.click(sicherheitRadio)

    const submitButton = screen.getByRole('button', { name: /Produkt speichern/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('shows German error when slug is already taken (409 response)', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(409, { data: null, error: { code: 'SLUG_EXISTS' } }),
    )

    render(<ProduktForm mode="create" />)

    const nameInput = screen.getByLabelText(/Produktname/i)
    await userEvent.type(nameInput, 'Test')

    const typSelect = screen.getByLabelText(/Produkttyp/i)
    await userEvent.selectOptions(typSelect, 'sterbegeld')

    const sicherheitRadio = screen.getByLabelText(/Sicherheit/i)
    await userEvent.click(sicherheitRadio)

    const submitButton = screen.getByRole('button', { name: /Produkt speichern/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/bereits vergeben/i)).toBeInTheDocument()
    })
  })

  it('redirects to the new product page on successful creation', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(201, { data: { id: 'new-id-123' }, error: null }),
    )

    render(<ProduktForm mode="create" />)

    const nameInput = screen.getByLabelText(/Produktname/i)
    await userEvent.type(nameInput, 'Test')

    const typSelect = screen.getByLabelText(/Produkttyp/i)
    await userEvent.selectOptions(typSelect, 'pflege')

    const fokusRadio = screen.getByLabelText(/Bester Preis/i)
    await userEvent.click(fokusRadio)

    const submitButton = screen.getByRole('button', { name: /Produkt speichern/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/produkte/new-id-123')
    })
  })
})

describe('ProduktForm — edit mode', () => {
  const initialData: ProduktWithConfig = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Sterbegeld24Plus',
    slug: 'sterbegeld24plus',
    typ: 'sterbegeld',
    status: 'aktiv',
    domain: null,
    accent_color: null,
    convexa_form_token: null,
    hero_image_url: null,
    hero_image_alt: null,
    og_image_url: null,
    short_pitch: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    produkt_config: {
      id: 'config-id',
      produkt_id: '123e4567-e89b-12d3-a456-426614174000',
      zielgruppe: ['senioren_50plus'],
      fokus: 'sicherheit',
      anbieter: ['Allianz'],
      argumente: { vorteil: 'Sofortschutz' },
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    },
  }

  beforeEach(() => {
    mockPush.mockClear()
    mockFetch.mockClear()
  })

  it('shows "Änderungen speichern" button in edit mode', () => {
    render(<ProduktForm mode="edit" initialData={initialData} />)
    expect(screen.getByRole('button', { name: /Änderungen speichern/i })).toBeInTheDocument()
  })

  it('renders Status select in edit mode', () => {
    render(<ProduktForm mode="edit" initialData={initialData} />)
    expect(screen.getByLabelText(/^Status$/i)).toBeInTheDocument()
  })

  it('pre-fills fields from initialData', () => {
    render(<ProduktForm mode="edit" initialData={initialData} />)

    expect((screen.getByLabelText(/Produktname/i) as HTMLInputElement).value).toBe('Sterbegeld24Plus')
    expect((screen.getByLabelText(/URL-Slug/i) as HTMLInputElement).value).toBe('sterbegeld24plus')
  })

  it('redirects to product page on successful update (200)', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, { data: { id: initialData.id }, error: null }),
    )

    render(<ProduktForm mode="edit" initialData={initialData} />)

    const submitButton = screen.getByRole('button', { name: /Änderungen speichern/i })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(`/admin/produkte/${initialData.id}`)
    })
  })
})

describe('ProduktForm — Anbieter tag input', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('adds anbieter tag when Enter is pressed', async () => {
    render(<ProduktForm mode="create" />)

    const anbieterInput = screen.getByPlaceholderText(/Versicherer eingeben/i)
    await userEvent.type(anbieterInput, 'Allianz{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Allianz')).toBeInTheDocument()
    })
  })

  it('does not add empty anbieter tag', async () => {
    render(<ProduktForm mode="create" />)
    const anbieterInput = screen.getByPlaceholderText(/Versicherer eingeben/i)

    await userEvent.click(anbieterInput)
    fireEvent.keyDown(anbieterInput, { key: 'Enter', code: 'Enter' })

    // There should be no pill with empty text
    const pills = screen.queryAllByTestId('anbieter-pill')
    expect(pills.length).toBe(0)
  })
})
