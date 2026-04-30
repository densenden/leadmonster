// Tests for the admin leads Server Component page data-fetching and query logic.
// Supabase admin client is mocked — no real DB access occurs.
// LeadTable is mocked to focus tests on data-fetching and filter application.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  })),
}))

vi.mock('@/components/admin/LeadTable', () => ({
  LeadTable: (props: { leads: unknown[]; totalCount: number; currentPage: number }) =>
    React.createElement('div', { 'data-testid': 'lead-table' }, [
      React.createElement('span', { key: 'count', 'data-testid': 'total-count' }, String(props.totalCount)),
      React.createElement('span', { key: 'page', 'data-testid': 'current-page' }, String(props.currentPage)),
      React.createElement('span', { key: 'leads', 'data-testid': 'leads-count' }, String(props.leads.length)),
    ]),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLead(id: string) {
  return {
    id,
    vorname: 'Max',
    nachname: 'Mustermann',
    email: 'max@example.de',
    intent_tag: 'sicherheit',
    convexa_synced: false,
    convexa_lead_id: null,
    convexa_error: null,
    resend_sent: false,
    created_at: '2026-04-01T10:00:00.000Z',
    produkte: { name: 'Sterbegeld24Plus' },
  }
}

// produkte chain: select().order() resolves to the produkte list.
function makeProdukteChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockResolvedValue({ data: rows, error: null })
  return chain
}

// leads chain: select().order().eq()*.range() — final resolution at .range().
function makeLeadsChain(opts: {
  leads?: unknown[]
  count?: number
  onSelect?: (cols: string) => void
  onEq?: (col: string, val: unknown) => void
  onRange?: (start: number, end: number) => void
}) {
  const { leads = [], count = 0, onSelect, onEq, onRange } = opts
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn((cols: string) => {
    onSelect?.(cols)
    return chain
  })
  chain.order = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn((col: string, val: unknown) => {
    onEq?.(col, val)
    return chain
  })
  chain.range = vi.fn((start: number, end: number) => {
    onRange?.(start, end)
    return Promise.resolve({ data: leads, count, error: null })
  })
  return chain
}

function setupFromMock(opts: {
  produkte?: unknown[]
  leadsChain: ReturnType<typeof makeLeadsChain>
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'produkte') return makeProdukteChain(opts.produkte ?? [])
    return opts.leadsChain
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeadsPage — query selects required columns', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('fetches leads with all required Convexa columns and the produkte join', async () => {
    let leadsSelectArg = ''
    setupFromMock({
      produkte: [{ id: 'prod-1', name: 'Testprodukt' }],
      leadsChain: makeLeadsChain({
        leads: [makeLead('l1')],
        count: 1,
        onSelect: (cols) => { leadsSelectArg = cols },
      }),
    })

    const { default: LeadsPage } = await import('../page')
    const element = await LeadsPage({ searchParams: {} })
    render(element as React.ReactElement)

    expect(leadsSelectArg).toContain('id')
    expect(leadsSelectArg).toContain('vorname')
    expect(leadsSelectArg).toContain('nachname')
    expect(leadsSelectArg).toContain('email')
    expect(leadsSelectArg).toContain('intent_tag')
    expect(leadsSelectArg).toContain('convexa_synced')
    expect(leadsSelectArg).toContain('convexa_lead_id')
    expect(leadsSelectArg).toContain('resend_sent')
    expect(leadsSelectArg).toContain('created_at')
    expect(leadsSelectArg).toContain('produkte')
  })
})

describe('LeadsPage — pagination offset calculation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('defaults to page 1 and uses range 0–24 when searchParams.page is absent', async () => {
    let rangeStart = -1
    let rangeEnd = -1
    setupFromMock({
      leadsChain: makeLeadsChain({
        onRange: (start, end) => { rangeStart = start; rangeEnd = end },
      }),
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: {} })

    expect(rangeStart).toBe(0)
    expect(rangeEnd).toBe(24)
  })

  it('calculates range 25–49 for page 2', async () => {
    let rangeStart = -1
    let rangeEnd = -1
    setupFromMock({
      leadsChain: makeLeadsChain({
        count: 50,
        onRange: (start, end) => { rangeStart = start; rangeEnd = end },
      }),
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: { page: '2' } })

    expect(rangeStart).toBe(25)
    expect(rangeEnd).toBe(49)
  })
})

describe('LeadsPage — filter application', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('applies .eq("produkt_id", value) when searchParams.produkt is present', async () => {
    const eqCalls: Array<[string, unknown]> = []
    setupFromMock({
      produkte: [{ id: 'prod-1', name: 'Test' }],
      leadsChain: makeLeadsChain({
        onEq: (col, val) => eqCalls.push([col, val]),
      }),
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: { produkt: 'prod-1' } })

    expect(eqCalls.some(([col, val]) => col === 'produkt_id' && val === 'prod-1')).toBe(true)
  })

  it('applies .eq("convexa_synced", true) when searchParams.convexa_synced is "true"', async () => {
    const eqCalls: Array<[string, unknown]> = []
    setupFromMock({
      leadsChain: makeLeadsChain({
        onEq: (col, val) => eqCalls.push([col, val]),
      }),
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: { convexa_synced: 'true' } })

    expect(eqCalls.some(([col, val]) => col === 'convexa_synced' && val === true)).toBe(true)
  })

  it('applies .eq("convexa_synced", false) when searchParams.convexa_synced is "false"', async () => {
    const eqCalls: Array<[string, unknown]> = []
    setupFromMock({
      leadsChain: makeLeadsChain({
        onEq: (col, val) => eqCalls.push([col, val]),
      }),
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: { convexa_synced: 'false' } })

    expect(eqCalls.some(([col, val]) => col === 'convexa_synced' && val === false)).toBe(true)
  })
})

describe('LeadsPage — total count passed to LeadTable', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('passes the exact count from Supabase to LeadTable as totalCount', async () => {
    setupFromMock({
      leadsChain: makeLeadsChain({
        leads: [makeLead('l1'), makeLead('l2')],
        count: 42,
      }),
    })

    const { default: LeadsPage } = await import('../page')
    const element = await LeadsPage({ searchParams: {} })
    render(element as React.ReactElement)

    expect(screen.getByTestId('total-count').textContent).toBe('42')
    expect(screen.getByText('42 Leads gesamt')).toBeDefined()
  })
})
