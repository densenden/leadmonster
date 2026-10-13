// Gap tests for TarifRechner and LeadForm — critical paths not covered by primary tests.
// Covers: age/number input sync, clamping, LeadForm backward compatibility,
// component behavior when no result is available.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TarifRechner } from '../TarifRechner'
import { LeadForm } from '../LeadForm'
import { fillRequiredLeadFormFields } from './lead-form-test-helpers'

const DEFAULT_PROPS = {
  produktTyp: 'sterbegeld' as const,
  produktName: 'Sterbegeld24Plus',
  anbieter: ['Allianz', 'AXA'],
  produktId: 'prod-uuid-001',
}

// ---------------------------------------------------------------------------
// Gap 1: Slider and number input sync
// ---------------------------------------------------------------------------

describe('TarifRechner — slider/number input synchronisation', () => {
  it('updating the range slider also updates the number input value', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    const slider = screen.getByRole('slider', { name: /Ihr Alter/i })
    const numberInput = screen.getByRole('spinbutton')

    fireEvent.change(slider, { target: { value: '70' } })

    expect((numberInput as HTMLInputElement).value).toBe('70')
  })

  it('updating the number input also updates the slider value', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    const slider = screen.getByRole('slider', { name: /Ihr Alter/i })
    const numberInput = screen.getByRole('spinbutton')

    fireEvent.change(numberInput, { target: { value: '60' } })

    expect((slider as HTMLInputElement).value).toBe('60')
  })
})

// ---------------------------------------------------------------------------
// Gap 2: Clamping boundary enforcement
// ---------------------------------------------------------------------------

describe('TarifRechner — age clamping', () => {
  it('clamps age to 40 when value below minimum is entered', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    const numberInput = screen.getByRole('spinbutton')

    fireEvent.change(numberInput, { target: { value: '20' } })

    expect((numberInput as HTMLInputElement).value).toBe('40')
  })

  it('clamps age to 85 when value above maximum is entered', () => {
    render(<TarifRechner {...DEFAULT_PROPS} />)
    const numberInput = screen.getByRole('spinbutton')

    fireEvent.change(numberInput, { target: { value: '99' } })

    expect((numberInput as HTMLInputElement).value).toBe('85')
  })
})

// ---------------------------------------------------------------------------
// Gap 3: Component when no tariff data is available (e.g. pflege type)
// ---------------------------------------------------------------------------

describe('TarifRechner — no result available', () => {
  it('does not show result or CTA when product type has no tariff data (e.g. pflege)', async () => {
    render(
      <TarifRechner
        produktTyp="pflege"
        produktName="Pflegeabsicherung"
        anbieter={['Allianz']}
        produktId="prod-uuid-002"
      />
    )

    // Trigger result reveal by changing sum
    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    fireEvent.change(select, { target: { value: '10000' } })

    // No result data exists for pflege — headline and CTA must not appear
    expect(screen.queryByTestId('premium-headline')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Ihren genauen Beitrag jetzt anfragen/i })
    ).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Gap 4: LeadForm backward compatibility (intentTag omitted)
// ---------------------------------------------------------------------------

describe('LeadForm — backward compatibility without intentTag', () => {
  it('renders and submits correctly when intentTag is not provided', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'new-lead-id' }, error: null }),
    })
    vi.stubGlobal('fetch', fetchMock)

    // Render without intentTag — should not throw a TypeScript or runtime error
    render(<LeadForm produktId="prod-uuid-001" zielgruppeTag="senioren_50plus" />)

    expect(screen.getByLabelText(/E-Mail-Adresse/i)).toBeInTheDocument()

    await fillRequiredLeadFormFields(user)
    await user.click(screen.getByRole('button', { name: /Jetzt Angebot anfordern/i }))

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url]) => typeof url === 'string' && url.includes('/api/leads'),
        ),
      ).toBe(true)
    })

    const leadCall = fetchMock.mock.calls.find(
      ([url]) => typeof url === 'string' && url.includes('/api/leads'),
    )
    const body = JSON.parse(leadCall![1].body)
    expect(body.produktId).toBe('prod-uuid-001')
    expect(body.geburtsdatum).toBe('1960-05-15')
  })
})

// ---------------------------------------------------------------------------
// Gap 5: Result card shows premium range without insurer name badges
// ---------------------------------------------------------------------------

describe('TarifRechner — result card', () => {
  it('does not render insurer name badges in the result card', async () => {
    render(
      <TarifRechner
        {...DEFAULT_PROPS}
        anbieter={['Allianz', 'AXA', 'Generali', 'HDI', 'Zurich']}
      />,
    )

    const select = screen.getByRole('combobox', { name: /Gewünschte Versicherungssumme/i })
    fireEvent.change(select, { target: { value: '10000' } })

    await waitFor(() => {
      expect(screen.getByTestId('premium-headline')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Beispielanbieter')).not.toBeInTheDocument()
    expect(screen.queryByText('Allianz')).not.toBeInTheDocument()
  })
})
