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

// LeadTable is mocked to focus tests on the page's data-fetching logic.
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
    confluence_synced: false,
    confluence_page_id: null,
    resend_sent: false,
    created_at: '2026-04-01T10:00:00.000Z',
    produkte: { name: 'Sterbegeld24Plus' },
  }
}

// Builds a chainable Supabase query mock for the leads query.
// The chain ends with a resolved value after calling .range().
function makeLeadsChain(leads: unknown[], count: number) {
  const chain: Record<string, unknown> = {}
  const chainFn = () => chain
  chain.select = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockResolvedValue({ data: leads, count, error: null })
  return chain
}

// Builds a chainable mock for simple single-result queries (produkte, einstellungen).
function makeSingleChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data, error: null }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeadsPage — query selects required columns', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('fetches leads with all required columns including the produkte join', async () => {
    let leadsSelectArg = ''
    let fromCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'produkte' && fromCallCount === 1) {
        return makeSingleChain([{ id: 'prod-1', name: 'Testprodukt' }])
      }
      if (table === 'einstellungen') {
        return makeSingleChain([])
      }
      // leads table
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn((cols: string) => {
        leadsSelectArg = cols
        return chain
      })
      chain.order = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.range = vi.fn().mockResolvedValue({ data: [makeLead('l1')], count: 1, error: null })
      return chain
    })

    const { default: LeadsPage } = await import('../page')
    const element = await LeadsPage({ searchParams: {} })
    render(element as React.ReactElement)

    // Verify the select string contains all required columns and the join
    expect(leadsSelectArg).toContain('id')
    expect(leadsSelectArg).toContain('vorname')
    expect(leadsSelectArg).toContain('nachname')
    expect(leadsSelectArg).toContain('email')
    expect(leadsSelectArg).toContain('intent_tag')
    expect(leadsSelectArg).toContain('confluence_synced')
    expect(leadsSelectArg).toContain('confluence_page_id')
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
    let fromCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'produkte' && fromCallCount === 1) {
        return makeSingleChain([])
      }
      if (table === 'einstellungen') {
        return makeSingleChain([])
      }
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.range = vi.fn((start: number, end: number) => {
        rangeStart = start
        rangeEnd = end
        return Promise.resolve({ data: [], count: 0, error: null })
      })
      return chain
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: {} })

    expect(rangeStart).toBe(0)
    expect(rangeEnd).toBe(24)
  })

  it('calculates range 25–49 for page 2', async () => {
    let rangeStart = -1
    let rangeEnd = -1
    let fromCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'produkte' && fromCallCount === 1) {
        return makeSingleChain([])
      }
      if (table === 'einstellungen') {
        return makeSingleChain([])
      }
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.range = vi.fn((start: number, end: number) => {
        rangeStart = start
        rangeEnd = end
        return Promise.resolve({ data: [], count: 50, error: null })
      })
      return chain
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
    const eqCalls: Array<[string, string]> = []
    let fromCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'produkte' && fromCallCount === 1) {
        return makeSingleChain([{ id: 'prod-1', name: 'Test' }])
      }
      if (table === 'einstellungen') {
        return makeSingleChain([])
      }
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn((col: string, val: string) => {
        eqCalls.push([col, val])
        return chain
      })
      chain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
      return chain
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: { produkt: 'prod-1' } })

    expect(eqCalls.some(([col, val]) => col === 'produkt_id' && val === 'prod-1')).toBe(true)
  })

  it('applies .eq("confluence_synced", true) when searchParams.confluence_synced is "true"', async () => {
    const eqCalls: Array<[string, boolean]> = []
    let fromCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'produkte' && fromCallCount === 1) {
        return makeSingleChain([])
      }
      if (table === 'einstellungen') {
        return makeSingleChain([])
      }
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn((col: string, val: boolean) => {
        eqCalls.push([col, val])
        return chain
      })
      chain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
      return chain
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: { confluence_synced: 'true' } })

    expect(eqCalls.some(([col, val]) => col === 'confluence_synced' && val === true)).toBe(true)
  })

  it('applies .eq("confluence_synced", false) when searchParams.confluence_synced is "false"', async () => {
    const eqCalls: Array<[string, boolean]> = []
    let fromCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'produkte' && fromCallCount === 1) {
        return makeSingleChain([])
      }
      if (table === 'einstellungen') {
        return makeSingleChain([])
      }
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn((col: string, val: boolean) => {
        eqCalls.push([col, val])
        return chain
      })
      chain.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
      return chain
    })

    const { default: LeadsPage } = await import('../page')
    await LeadsPage({ searchParams: { confluence_synced: 'false' } })

    expect(eqCalls.some(([col, val]) => col === 'confluence_synced' && val === false)).toBe(true)
  })
})

describe('LeadsPage — total count passed to LeadTable', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('passes the exact count from Supabase to LeadTable as totalCount', async () => {
    let fromCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'produkte' && fromCallCount === 1) {
        return makeSingleChain([])
      }
      if (table === 'einstellungen') {
        return makeSingleChain([])
      }
      return makeLeadsChain([makeLead('l1'), makeLead('l2')], 42)
    })

    const { default: LeadsPage } = await import('../page')
    const element = await LeadsPage({ searchParams: {} })
    render(element as React.ReactElement)

    expect(screen.getByTestId('total-count').textContent).toBe('42')
    // Total count string is also rendered above the table
    expect(screen.getByText('42 Leads gesamt')).toBeDefined()
  })
})
