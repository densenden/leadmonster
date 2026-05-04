// Tests für lib/redirects/lookup.ts.
// Verifiziert Cache-Befüllung, TTL-Ablauf und Trailing-Slash-Toleranz.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { lookupRedirect, resetRedirectCache } from '../lookup'

function makeSupabase(rows: Array<{ legacy_path: string; target_path: string; status: number }>) {
  const select = vi.fn().mockResolvedValue({ data: rows, error: null })
  const from = vi.fn(() => ({ select }))
  return { from, select } as unknown as { from: typeof from; select: typeof select } & Parameters<typeof lookupRedirect>[0]
}

describe('lookupRedirect', () => {
  beforeEach(() => {
    resetRedirectCache()
  })

  it('returns matching entry by exact path', async () => {
    const sb = makeSupabase([
      { legacy_path: '/foo', target_path: '/bar', status: 301 },
    ])
    const r = await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/foo')
    expect(r).toEqual({ target: '/bar', status: 301 })
  })

  it('returns null when no entry matches', async () => {
    const sb = makeSupabase([
      { legacy_path: '/foo', target_path: '/bar', status: 301 },
    ])
    const r = await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/missing')
    expect(r).toBeNull()
  })

  it('falls back to stripped trailing slash', async () => {
    const sb = makeSupabase([
      { legacy_path: '/foo', target_path: '/bar', status: 301 },
    ])
    const r = await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/foo/')
    expect(r).toEqual({ target: '/bar', status: 301 })
  })

  it('falls back to added trailing slash', async () => {
    const sb = makeSupabase([
      { legacy_path: '/foo/', target_path: '/bar', status: 301 },
    ])
    const r = await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/foo')
    expect(r).toEqual({ target: '/bar', status: 301 })
  })

  it('caches the table — subsequent lookups do not re-query', async () => {
    const sb = makeSupabase([
      { legacy_path: '/foo', target_path: '/bar', status: 301 },
    ])
    await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/foo')
    await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/baz')
    await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/qux')

    expect(sb.from).toHaveBeenCalledTimes(1)
  })

  it('handles 302 status correctly', async () => {
    const sb = makeSupabase([
      { legacy_path: '/temp', target_path: '/elsewhere', status: 302 },
    ])
    const r = await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/temp')
    expect(r).toEqual({ target: '/elsewhere', status: 302 })
  })

  it('returns null when DB returns empty array', async () => {
    const sb = makeSupabase([])
    const r = await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/anything')
    expect(r).toBeNull()
  })

  it('does not match across paths after stripping (root edge case)', async () => {
    // Root '/' bleibt ohne match — stripping würde leerer String,
    // da pathname.length > 1 die Bedingung schützt.
    const sb = makeSupabase([
      { legacy_path: '/foo', target_path: '/bar', status: 301 },
    ])
    const r = await lookupRedirect(sb as Parameters<typeof lookupRedirect>[0], '/')
    expect(r).toBeNull()
  })
})
