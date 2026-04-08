// Gap-filling tests for LeadForm (Task Group 4) — end-to-end happy path.
// Verifies the complete user flow: fill all fields → submit → success state.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeadForm } from '../LeadForm'

const DEFAULT_PROPS = {
  produktId: 'prod-uuid-001',
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'sofortschutz',
}

describe('LeadForm — gap tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  // ---------------------------------------------------------------------------
  // Gap 4: End-to-end happy path — all fields filled → submitted → success state shown
  // ---------------------------------------------------------------------------
  it('Gap 4: end-to-end happy path — form filled with all fields, submitted, success shown', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'e2e-lead-uuid' }, error: null }),
      }),
    )

    render(<LeadForm {...DEFAULT_PROPS} />)

    // Fill all five visible fields
    await user.type(screen.getByLabelText(/Vorname/i), 'Maria')
    await user.type(screen.getByLabelText(/Nachname/i), 'Muster')
    await user.type(screen.getByLabelText(/E-Mail-Adresse/i), 'maria@example.de')
    await user.type(screen.getByLabelText(/Telefonnummer/i), '0151 12345678')
    await user.type(screen.getByLabelText(/Ihr Interesse/i), 'Ich hätte gerne mehr Informationen.')

    // Submit
    await user.click(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i }))

    // Success state: thank-you block appears, form is gone
    await waitFor(() => {
      expect(screen.getByText('Vielen Dank für Ihre Anfrage!')).toBeDefined()
    })
    expect(
      screen.getByText(/Wir melden uns innerhalb von 24 Stunden bei Ihnen./i),
    ).toBeDefined()

    // The form must not be in the DOM
    expect(screen.queryByRole('button')).toBeNull()

    // Fetch was called once with correct headers
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/leads')
    expect((options.headers as Record<string, string>)['X-Requested-With']).toBe('XMLHttpRequest')
  })

  // ---------------------------------------------------------------------------
  // Gap 5: Invalid email format shows German format-error message, no fetch called
  // ---------------------------------------------------------------------------
  it('Gap 5: invalid email format shows German format error, no fetch called', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<LeadForm {...DEFAULT_PROPS} />)

    // Type an invalid email
    await user.type(screen.getByLabelText(/E-Mail-Adresse/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
      ).toBeDefined()
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Gap 6: Network error (fetch throws) shows German error message; form stays editable
  // ---------------------------------------------------------------------------
  it('Gap 6: network error shows German error message and form remains editable', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))

    render(<LeadForm {...DEFAULT_PROPS} />)

    await user.type(screen.getByLabelText(/E-Mail-Adresse/i), 'anna@example.de')
    await user.click(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Ein Fehler ist aufgetreten\. Bitte versuchen Sie es erneut/i),
      ).toBeDefined()
    })

    // Form is still editable
    expect(screen.getByLabelText(/E-Mail-Adresse/i)).toBeDefined()
    expect(screen.getByRole('button')).toBeDefined()
  })
})
