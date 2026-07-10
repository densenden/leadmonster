import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND')
  }),
}))

vi.mock('@/components/admin/LeadDetailView', () => ({
  LeadDetailView: (props: { lead: { email: string } }) =>
    React.createElement('div', { 'data-testid': 'lead-detail' }, props.lead.email),
}))

function makeDetailChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  return chain
}

describe('LeadDetailPage', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
  })

  it('fetches lead by id and renders LeadDetail', async () => {
    mockFrom.mockReturnValue(
      makeDetailChain({
        data: { id: 'lead-1', email: 'max@example.de' },
        error: null,
      }),
    )

    const { default: LeadDetailPage } = await import('../page')
    const element = await LeadDetailPage({ params: { id: 'lead-1' } })
    render(element as React.ReactElement)

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(screen.getByTestId('lead-detail').textContent).toBe('max@example.de')
  })

  it('calls notFound when lead is missing', async () => {
    mockFrom.mockReturnValue(makeDetailChain({ data: null, error: null }))

    const { notFound } = await import('next/navigation')
    const { default: LeadDetailPage } = await import('../page')

    await expect(LeadDetailPage({ params: { id: 'missing' } })).rejects.toThrow('NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})
