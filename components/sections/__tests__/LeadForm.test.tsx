// Tests for components/sections/LeadForm.tsx — structure, state machine, and form submission.
// Uses React Testing Library + mocked fetch.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadForm } from '../LeadForm'

// Default props covering the three required fields
const DEFAULT_PROPS = {
  produktId: 'prod-uuid-001',
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'sicherheit',
}

describe('LeadForm — structure and state', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Reset fetch mock before each test
    vi.stubGlobal('fetch', vi.fn())
  })

  // ---------------------------------------------------------------------------
  // Test 1: Renders all five visible fields + submit button with German labels
  // ---------------------------------------------------------------------------
  it('Test 1: renders all five visible fields and submit button with German labels', () => {
    render(<LeadForm {...DEFAULT_PROPS} />)

    // All five visible fields
    expect(screen.getByLabelText(/Vorname/i)).toBeDefined()
    expect(screen.getByLabelText(/Nachname/i)).toBeDefined()
    expect(screen.getByLabelText(/E-Mail-Adresse/i)).toBeDefined()
    expect(screen.getByLabelText(/Telefonnummer/i)).toBeDefined()
    expect(screen.getByLabelText(/Ihr Interesse/i)).toBeDefined()

    // Submit button with German label
    const button = screen.getByRole('button', { name: /Jetzt Angebot anfordern/i })
    expect(button).toBeDefined()
    expect(button.getAttribute('type')).toBe('submit')
  })

  // ---------------------------------------------------------------------------
  // Test 2: Empty email shows German required-field error; no fetch call made
  // ---------------------------------------------------------------------------
  it('Test 2: submitting with empty email shows German error message and does not call fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<LeadForm {...DEFAULT_PROPS} />)

    const button = screen.getByRole('button', { name: /Jetzt Angebot anfordern/i })
    fireEvent.click(button)

    // German error message must appear
    await waitFor(() => {
      expect(screen.getByText('Bitte geben Sie Ihre E-Mail-Adresse ein.')).toBeDefined()
    })

    // fetch must NOT have been called
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Test 3: Successful API response replaces form with German thank-you message
  // ---------------------------------------------------------------------------
  it('Test 3: successful API response replaces form with German thank-you message', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'new-lead-id' }, error: null }),
      }),
    )

    render(<LeadForm {...DEFAULT_PROPS} />)

    // Fill in the required email field
    await user.type(screen.getByLabelText(/E-Mail-Adresse/i), 'test@example.de')

    // Submit
    await user.click(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i }))

    // Thank-you message must appear
    await waitFor(() => {
      expect(screen.getByText('Vielen Dank für Ihre Anfrage!')).toBeDefined()
    })

    // The form element must no longer be in the DOM
    expect(screen.queryByRole('button', { name: /Jetzt Angebot anfordern/i })).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Test 4: Failed API response shows German error message; form still editable
  // ---------------------------------------------------------------------------
  it('Test 4: failed API response shows German error message and keeps form visible', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ data: null, error: { code: 'SERVER_ERROR' } }),
      }),
    )

    render(<LeadForm {...DEFAULT_PROPS} />)

    await user.type(screen.getByLabelText(/E-Mail-Adresse/i), 'test@example.de')
    await user.click(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i }))

    // German generic error message must appear
    await waitFor(() => {
      expect(
        screen.getByText(
          /Ein Fehler ist aufgetreten\. Bitte versuchen Sie es erneut/i,
        ),
      ).toBeDefined()
    })

    // Form must still be visible and editable — submit button is present
    expect(screen.getByRole('button')).toBeDefined()

    // Email field must still be in the DOM
    expect(screen.getByLabelText(/E-Mail-Adresse/i)).toBeDefined()
  })
})
