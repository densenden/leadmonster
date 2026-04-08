// Gap-filling tests for the admin leads page — addressing integration and edge cases
// not covered by the primary page.test.tsx.
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

// LeadTable spy — captures props for integration assertions.
vi.mock('@/components/admin/LeadTable', () => ({
  LeadTable: (props: { confluenceBaseUrl: string | null; confluenceSpaceKey: string | null; totalCount: number; leads: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'lead-table' }, [
      React.createElement('span', { key: 'base-url', 'data-testid': 'confluence-base-url' }, props.confluenceBaseUrl ?? ''),
      React.createElement('span', { key: 'space-key', 'data-testid': 'confluence-space-key' }, props.confluenceSpaceKey ?? ''),
      React.createElement('span', { key: 'count', 'data-testid': 'total-count' }, String(props.totalCount)),
    ]),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLeadsChain(leads: unknown[], count: number) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockResolvedValue({ data: leads, count, error: null })
  return chain
}

function makeEinstellungenChain(rows: Array<{ schluessel: string; wert: string | null }>) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
}

function makeProdukteChain(rows: Array<{ id: string; name: string }>) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LeadsPage — Confluence config integration from einstellungen', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('passes confluenceBaseUrl from einstellungen DB row to LeadTable', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'produkte') return makeProdukteChain([])
      if (table === 'einstellungen') {
        return makeEinstellungenChain([
          { schluessel: 'confluence_base_url', wert: 'https://test.atlassian.net' },
          { schluessel: 'confluence_space_key', wert: 'TEST' },
        ])
      }
      return makeLeadsChain([], 0)
    })

    const { default: LeadsPage } = await import('../page')
    const element = await LeadsPage({ searchParams: {} })
    render(element as React.ReactElement)

    expect(screen.getByTestId('confluence-base-url').textContent).toBe('https://test.atlassian.net')
    expect(screen.getByTestId('confluence-space-key').textContent).toBe('TEST')
  })

  it('passes empty confluenceBaseUrl when neither DB nor env var is set', async () => {
    // Temporarily remove env vars
    const originalBase = process.env.CONFLUENCE_BASE_URL
    const originalSpace = process.env.CONFLUENCE_SPACE_KEY
    delete process.env.CONFLUENCE_BASE_URL
    delete process.env.CONFLUENCE_SPACE_KEY

    mockFrom.mockImplementation((table: string) => {
      if (table === 'produkte') return makeProdukteChain([])
      if (table === 'einstellungen') return makeEinstellungenChain([])
      return makeLeadsChain([], 0)
    })

    const { default: LeadsPage } = await import('../page')
    const element = await LeadsPage({ searchParams: {} })
    render(element as React.ReactElement)

    // null confluenceBaseUrl renders as empty string by the spy
    expect(screen.getByTestId('confluence-base-url').textContent).toBe('')

    // Restore
    if (originalBase !== undefined) process.env.CONFLUENCE_BASE_URL = originalBase
    if (originalSpace !== undefined) process.env.CONFLUENCE_SPACE_KEY = originalSpace
  })
})

describe('LeadsPage — intent_tag filter', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('applies .eq("intent_tag", value) when searchParams.intent_tag is present', async () => {
    const eqCalls: Array<[string, string]> = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'produkte') return makeProdukteChain([])
      if (table === 'einstellungen') return makeEinstellungenChain([])
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
    await LeadsPage({ searchParams: { intent_tag: 'preis' } })

    expect(eqCalls.some(([col, val]) => col === 'intent_tag' && val === 'preis')).toBe(true)
  })

  it('does NOT apply intent_tag filter when searchParams.intent_tag is absent', async () => {
    const eqCalls: Array<[string, string]> = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'produkte') return makeProdukteChain([])
      if (table === 'einstellungen') return makeEinstellungenChain([])
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
    await LeadsPage({ searchParams: {} })

    expect(eqCalls.some(([col]) => col === 'intent_tag')).toBe(false)
  })
})
