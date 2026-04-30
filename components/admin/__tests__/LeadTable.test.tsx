// Tests for the LeadTable Server Component — pure render tests using static prop fixtures.
// No mocks required: all interactions are rendered as plain HTML (links, forms).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { LeadTable } from '../LeadTable'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLead(overrides: Partial<{
  id: string
  vorname: string | null
  nachname: string | null
  email: string
  intent_tag: string | null
  convexa_synced: boolean
  convexa_lead_id: string | null
  convexa_error: string | null
  resend_sent: boolean
  created_at: string
  produkte: { name: string } | null
}> = {}) {
  return {
    id: overrides.id ?? 'lead-1',
    vorname: overrides.vorname ?? 'Max',
    nachname: overrides.nachname ?? 'Mustermann',
    email: overrides.email ?? 'max@example.de',
    intent_tag: overrides.intent_tag ?? 'sicherheit',
    convexa_synced: overrides.convexa_synced ?? false,
    convexa_lead_id: overrides.convexa_lead_id ?? null,
    convexa_error: overrides.convexa_error ?? null,
    resend_sent: overrides.resend_sent ?? false,
    created_at: overrides.created_at ?? '2026-04-01T10:00:00.000Z',
    produkte: overrides.produkte !== undefined ? overrides.produkte : { name: 'Sterbegeld24Plus' },
  }
}

const DEFAULT_PROPS = {
  produkte: [{ id: 'prod-1', name: 'Sterbegeld24Plus' }],
  currentPage: 1,
  totalPages: 1,
  totalCount: 1,
  currentFilters: {},
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeadTable — filter form', () => {
  it('renders the filter form with method="get" and all three select controls', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead()],
      }),
    )

    const form = document.querySelector('form[method="get"]')
    expect(form).toBeTruthy()
    expect(form?.getAttribute('action')).toBe('/admin/leads')

    expect(document.querySelector('select[name="produkt"]')).toBeTruthy()
    expect(document.querySelector('select[name="convexa_synced"]')).toBeTruthy()
    expect(document.querySelector('select[name="intent_tag"]')).toBeTruthy()
  })

  it('reflects active filter values via defaultValue on each select', () => {
    const { container } = render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead()],
        currentFilters: {
          produkt: 'prod-1',
          convexa_synced: 'false',
          intent_tag: 'sicherheit',
        },
      }),
    )

    const produktSelect = container.querySelector('select[name="produkt"]') as HTMLSelectElement
    const syncSelect = container.querySelector('select[name="convexa_synced"]') as HTMLSelectElement
    const intentSelect = container.querySelector('select[name="intent_tag"]') as HTMLSelectElement

    expect(produktSelect?.value).toBe('prod-1')
    expect(syncSelect?.value).toBe('false')
    expect(intentSelect?.value).toBe('sicherheit')
  })

  it('renders the Zurücksetzen link with href "/admin/leads" (no query params)', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead()],
        currentFilters: { produkt: 'prod-1' },
      }),
    )

    const resetLinks = Array.from(document.querySelectorAll('a')).filter(
      (a) => a.getAttribute('href') === '/admin/leads',
    )
    expect(resetLinks.length).toBeGreaterThan(0)
  })
})

describe('LeadTable — Convexa sync indicators', () => {
  it('shows a "Ja" badge in the table row when convexa_synced is true', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead({ convexa_synced: true, convexa_lead_id: 'cvx-1' })],
      }),
    )

    // "Ja" appears as both an <option> text and a badge — narrow the search to
    // badge spans inside <td> cells.
    const cellBadges = Array.from(
      document.querySelectorAll('td span'),
    ).map((el) => el.textContent?.trim())
    expect(cellBadges).toContain('Ja')
  })

  it('shows "Fehler" tooltip when convexa_error is set', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead({ convexa_synced: false, convexa_error: 'CONVEXA_NOT_CONFIGURED' })],
      }),
    )

    const errorSpan = screen.getByText('Fehler')
    expect(errorSpan.getAttribute('title')).toBe('CONVEXA_NOT_CONFIGURED')
  })
})

describe('LeadTable — empty state', () => {
  it('renders the empty state message and reset link when leads array is empty', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [],
        totalCount: 0,
      }),
    )

    expect(screen.getByText('Keine Leads gefunden.')).toBeDefined()
    expect(document.querySelector('table')).toBeNull()
  })
})

describe('LeadTable — pagination', () => {
  it('renders "Zurück" link absent on page 1', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead()],
        currentPage: 1,
        totalPages: 3,
        totalCount: 75,
      }),
    )

    const zurueckLinks = Array.from(document.querySelectorAll('a')).filter(
      (a) => a.textContent?.trim() === 'Zurück',
    )
    expect(zurueckLinks.length).toBe(0)
  })

  it('renders "Weiter" link absent on the last page', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead()],
        currentPage: 3,
        totalPages: 3,
        totalCount: 75,
      }),
    )

    const weiterLinks = Array.from(document.querySelectorAll('a')).filter(
      (a) => a.textContent?.trim() === 'Weiter',
    )
    expect(weiterLinks.length).toBe(0)
  })

  it('preserves active filter params in the Weiter pagination link', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead()],
        currentPage: 1,
        totalPages: 3,
        totalCount: 75,
        currentFilters: { produkt: 'prod-1', intent_tag: 'sicherheit' },
      }),
    )

    const weiterLinks = Array.from(document.querySelectorAll('a')).filter(
      (a) => a.textContent?.trim() === 'Weiter',
    )
    expect(weiterLinks.length).toBe(1)

    const href = weiterLinks[0].getAttribute('href') ?? ''
    expect(href).toContain('page=2')
    expect(href).toContain('produkt=prod-1')
    expect(href).toContain('intent_tag=sicherheit')
  })
})
