import { describe, it, expect, vi, beforeEach } from 'vitest'

const { revalidatePathMock, fromMock, eqMock, orMock } = vi.hoisted(() => {
  const eqMock = vi.fn()
  const orMock = vi.fn()
  const selectMock = vi.fn(() => ({ eq: eqMock, or: orMock }))
  const fromMock = vi.fn(() => ({ select: selectMock }))
  const revalidatePathMock = vi.fn()
  return { revalidatePathMock, fromMock, eqMock, orMock }
})

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock }),
}))

import { revalidateRedaktionDependents } from '@/lib/redaktion/revalidate'

describe('revalidateRedaktionDependents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqMock.mockReturnValue({ data: [], error: null })
    orMock.mockReturnValue({ data: [], error: null })
  })

  it('revalidates redaktion profile and product home when autor is standard author', async () => {
    eqMock.mockReturnValueOnce({
      data: [{ slug: 'sterbegeld24plus' }],
      error: null,
    })

    await revalidateRedaktionDependents('autor-1', 'christian-wimmer')

    expect(revalidatePathMock).toHaveBeenCalledWith('/redaktion')
    expect(revalidatePathMock).toHaveBeenCalledWith('/redaktion/christian-wimmer')
    expect(revalidatePathMock).toHaveBeenCalledWith('/')
  })

  it('revalidates ratgeber article paths linked to the autor', async () => {
    eqMock.mockReturnValueOnce({ data: [], error: null })
    orMock.mockReturnValueOnce({
      data: [{
        slug: 'sterbegeld-kosten',
        page_type: 'ratgeber',
        produkte: { slug: 'sterbegeld24plus' },
      }],
      error: null,
    })
    orMock.mockReturnValueOnce({ data: [], error: null })
    orMock.mockReturnValueOnce({ data: [], error: null })

    await revalidateRedaktionDependents('autor-1', 'christian-wimmer')

    expect(revalidatePathMock).toHaveBeenCalledWith('/sterbegeld24plus/ratgeber/sterbegeld-kosten')
  })
})
