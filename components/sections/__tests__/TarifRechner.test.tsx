// Tests for components/sections/TarifRechner.tsx.
// Verifies the two-step calculator flow: result display, disclaimer, CTA, and LeadForm reveal.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TarifRechner } from '../TarifRechner'

// Default props for all tests — sterbegeld with three example insurers
const DEFAULT_PROPS = {
  produktTyp: 'sterbegeld' as const,
  produktName: 'Sterbegeld24Plus',
  anbieter: ['Allianz', 'AXA', 'Generali'],
  produktId: 'prod-uuid-001',
}

describe('TarifRechner — initial render (Step 1)', () => {
  it('does not show a result card on initial render', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    // The premium headline uses data-testid; it must not be present before interaction
    expect(screen.queryByTestId('premium-headline')).not.toBeInTheDocument()
  })

  it('renders the age slider with aria-label "Ihr Alter" and default value 55', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    const slider = screen.getByRole('slider', { name: /Ihr Alter/i })
    expect(slider).toBeInTheDocument()
    expect((slider as HTMLInputElement).value).toBe('55')
  })

  it('renders the sum select with default value 10000', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    expect(select).toBeInTheDocument()
    expect((select as HTMLSelectElement).value).toBe('10000')
  })

  it('does not show the LeadForm submit button on initial render', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    expect(
      screen.queryByRole('button', { name: /Jetzt Angebot anfordern/i })
    ).not.toBeInTheDocument()
  })
})

describe('TarifRechner — result reveal (Step 1 → result)', () => {
  it('shows the premium headline after selecting a sum', async () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)

    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    // Selecting sum 10000 triggers setShowResult(true)
    await userEvent.selectOptions(select, '10000')

    await waitFor(() => {
      expect(screen.getByTestId('premium-headline')).toBeInTheDocument()
    })
  })

  it('displays correct low/high values for age 65, sum 10000 (bracket 60–69: 33–45)', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)

    // Use fireEvent.change for the number input — reliable single-change update
    const numberInput = screen.getByRole('spinbutton')
    fireEvent.change(numberInput, { target: { value: '65' } })

    // Select sum 10000 to trigger result display
    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    fireEvent.change(select, { target: { value: '10000' } })

    // Result headline must appear with correct bracket values (60–69 / 10000 = low:33, high:45)
    const headline = screen.getByTestId('premium-headline')
    expect(headline).toBeInTheDocument()
    expect(headline.textContent).toContain('33')
    expect(headline.textContent).toContain('45')
    expect(headline.textContent).toContain('pro Monat')
  })

  it('displays the mandatory disclaimer text once a result is shown', async () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)

    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    await userEvent.selectOptions(select, '10000')

    await waitFor(() => {
      expect(
        screen.getByText(/Diese Berechnung dient ausschließlich zur Orientierung/i)
      ).toBeInTheDocument()
    })
  })
})

describe('TarifRechner — CTA and LeadForm reveal (Step 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reveals the LeadForm submit button after clicking the CTA', async () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)

    // Trigger result first
    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    await userEvent.selectOptions(select, '10000')

    // Wait for CTA button to appear in the DOM
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Ihren genauen Beitrag jetzt anfragen/i })
      ).toBeInTheDocument()
    })

    // Click CTA
    await userEvent.click(
      screen.getByRole('button', { name: /Ihren genauen Beitrag jetzt anfragen/i })
    )

    // LeadForm should now be visible — its submit button becomes available
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Jetzt Angebot anfordern/i })
      ).toBeInTheDocument()
    })
  })

  it('sends intent_tag="preis" in the fetch body when the LeadForm is submitted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    render(<TarifRechner {...DEFAULT_PROPS} />)

    // Step 1: trigger result
    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    await userEvent.selectOptions(select, '10000')

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Ihren genauen Beitrag jetzt anfragen/i })
      ).toBeInTheDocument()
    })

    // Step 2: click CTA to reveal form
    await userEvent.click(
      screen.getByRole('button', { name: /Ihren genauen Beitrag jetzt anfragen/i })
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i })).toBeInTheDocument()
    })

    // Fill required email field and submit
    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i)
    await userEvent.type(emailInput, 'test@example.de')

    await userEvent.click(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i }))

    // Verify the fetch was called with intent_tag: "preis" in the body
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/leads',
        expect.objectContaining({
          body: expect.stringContaining('"intent_tag":"preis"'),
        })
      )
    })
  })
})
