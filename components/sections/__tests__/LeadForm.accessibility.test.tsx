// Accessibility tests for components/sections/LeadForm.tsx.
// Verifies label association, tap-target sizes, and ARIA attributes.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeadForm } from '../LeadForm'

const DEFAULT_PROPS = {
  produktId: 'prod-uuid-001',
  zielgruppeTag: 'senioren_50plus',
  intentTag: 'sicherheit',
}

describe('LeadForm — accessibility', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  // ---------------------------------------------------------------------------
  // Test 1: All inputs and textarea have corresponding labels with matching htmlFor/id
  // ---------------------------------------------------------------------------
  it('Test 1: all input and textarea elements have a corresponding label with matching htmlFor/id', () => {
    const { container } = render(<LeadForm {...DEFAULT_PROPS} />)

    // Collect all interactive fields (inputs excluding honeypot, textarea)
    const visibleInputs = Array.from(container.querySelectorAll('input')).filter(
      el => el.getAttribute('name') !== 'website' && el.getAttribute('tabIndex') !== '-1',
    )
    const textareas = Array.from(container.querySelectorAll('textarea'))
    const allFields = [...visibleInputs, ...textareas]

    // Every field must have a matching label via htmlFor → id association
    allFields.forEach(field => {
      const fieldId = field.getAttribute('id')
      expect(fieldId, `Field is missing an id attribute`).toBeTruthy()

      const label = container.querySelector(`label[for="${fieldId}"]`)
      expect(label, `No <label> found with for="${fieldId}"`).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Test 2: Submit button has minimum height class for 44px tap target
  // ---------------------------------------------------------------------------
  it('Test 2: submit button carries min-h-[44px] class for 44px minimum tap target', () => {
    render(<LeadForm {...DEFAULT_PROPS} />)

    const button = screen.getByRole('button', { name: /Jetzt Angebot anfordern/i })
    expect(button.className).toContain('min-h-[44px]')
  })

  // ---------------------------------------------------------------------------
  // Test 3: Email field has aria-required="true" and aria-describedby="email-error"
  // ---------------------------------------------------------------------------
  it('Test 3: email input has aria-required="true" and aria-describedby="email-error"', () => {
    render(<LeadForm {...DEFAULT_PROPS} />)

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i)
    expect(emailInput.getAttribute('aria-required')).toBe('true')
    expect(emailInput.getAttribute('aria-describedby')).toBe('email-error')
  })
})
