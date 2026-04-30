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
  confluence_synced: boolean
  confluence_page_id: string | null
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
    confluence_synced: overrides.confluence_synced ?? false,
    confluence_page_id: overrides.confluence_page_id ?? null,
    resend_sent: overrides.resend_sent ?? false,
    created_at: overrides.created_at ?? '2026-04-01T10:00:00.000Z',
    produkte: overrides.produkte !== undefined ? overrides.produkte : { name: 'Sterbegeld24Plus' },
    // Convexa + UTM + VergleichsRechner fields (April 2026 schema additions)
    convexa_synced: false,
    convexa_lead_id: null,
    convexa_error: null,
    source_url: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    gewuenschter_anbieter: null,
  }
}

const DEFAULT_PROPS = {
  produkte: [{ id: 'prod-1', name: 'Sterbegeld24Plus' }],
  currentPage: 1,
  totalPages: 1,
  totalCount: 1,
  currentFilters: {},
  confluenceBaseUrl: 'https://mycompany.atlassian.net',
  confluenceSpaceKey: 'LEADS',
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

    // All three selects must be present with correct name attributes
    expect(document.querySelector('select[name="produkt"]')).toBeTruthy()
    expect(document.querySelector('select[name="confluence_synced"]')).toBeTruthy()
    expect(document.querySelector('select[name="intent_tag"]')).toBeTruthy()
  })

  it('reflects active filter values via defaultValue on each select', () => {
    const { container } = render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead()],
        currentFilters: {
          produkt: 'prod-1',
          confluence_synced: 'false',
          intent_tag: 'sicherheit',
        },
      }),
    )

    const produktSelect = container.querySelector('select[name="produkt"]') as HTMLSelectElement
    const syncSelect = container.querySelector('select[name="confluence_synced"]') as HTMLSelectElement
    const intentSelect = container.querySelector('select[name="intent_tag"]') as HTMLSelectElement

    // React sets defaultValue which becomes the selected attribute on option
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

describe('LeadTable — Confluence external link', () => {
  it('renders the Confluence link for a lead with a non-null confluence_page_id', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead({ confluence_page_id: 'page-123', confluence_synced: true })],
      }),
    )

    const links = Array.from(document.querySelectorAll('a[target="_blank"]'))
    expect(links.length).toBeGreaterThan(0)
    const confluenceLink = links.find((a) => a.getAttribute('href')?.includes('page-123'))
    expect(confluenceLink).toBeTruthy()
    expect(confluenceLink?.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('does not render the Confluence link when confluence_page_id is null', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead({ confluence_page_id: null, confluence_synced: false })],
      }),
    )

    const externalLinks = document.querySelectorAll('a[target="_blank"]')
    expect(externalLinks.length).toBe(0)
  })
})

describe('LeadTable — re-sync form', () => {
  it('renders the re-sync form for a lead with confluence_synced === false', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead({ id: 'lead-42', confluence_synced: false })],
      }),
    )

    const resyncForm = document.querySelector('form[action="/api/confluence"]')
    expect(resyncForm).toBeTruthy()

    const leadIdInput = resyncForm?.querySelector('input[name="leadId"]') as HTMLInputElement
    expect(leadIdInput?.value).toBe('lead-42')

    const actionInput = resyncForm?.querySelector('input[name="action"]') as HTMLInputElement
    expect(actionInput?.value).toBe('resync')
  })

  it('does not render the re-sync form when confluence_synced === true', () => {
    render(
      React.createElement(LeadTable, {
        ...DEFAULT_PROPS,
        leads: [makeLead({ confluence_synced: true, confluence_page_id: 'page-99' })],
      }),
    )

    const resyncForm = document.querySelector('form[action="/api/confluence"]')
    expect(resyncForm).toBeNull()
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
    // The table element must NOT be rendered in the empty state
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

    // "Zurück" link should not appear on page 1
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
