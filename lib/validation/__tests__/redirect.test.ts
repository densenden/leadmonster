// Tests für lib/validation/redirect.ts.
import { describe, it, expect } from 'vitest'
import { redirectSchema } from '../redirect'

describe('redirectSchema', () => {
  it('accepts valid 301 redirect', () => {
    const r = redirectSchema.safeParse({
      legacy_path: '/old',
      target_path: '/new',
      status: 301,
      notiz: 'test',
    })
    expect(r.success).toBe(true)
  })

  it('coerces status from string', () => {
    const r = redirectSchema.safeParse({
      legacy_path: '/old',
      target_path: '/new',
      status: '301',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.status).toBe(301)
  })

  it('rejects status other than 301/302', () => {
    const r = redirectSchema.safeParse({
      legacy_path: '/old',
      target_path: '/new',
      status: 200,
    })
    expect(r.success).toBe(false)
  })

  it('rejects path without leading slash', () => {
    const r = redirectSchema.safeParse({
      legacy_path: 'old',
      target_path: '/new',
      status: 301,
    })
    expect(r.success).toBe(false)
  })

  it('rejects path starting with http', () => {
    const r = redirectSchema.safeParse({
      legacy_path: 'https://other.de/old',
      target_path: '/new',
      status: 301,
    })
    expect(r.success).toBe(false)
  })

  it('rejects identical legacy and target paths', () => {
    const r = redirectSchema.safeParse({
      legacy_path: '/same',
      target_path: '/same',
      status: 301,
    })
    expect(r.success).toBe(false)
  })

  it('accepts empty notiz as null', () => {
    const r = redirectSchema.safeParse({
      legacy_path: '/old',
      target_path: '/new',
      status: 301,
      notiz: null,
    })
    expect(r.success).toBe(true)
  })

  it('rejects very long paths', () => {
    const longPath = '/' + 'a'.repeat(600)
    const r = redirectSchema.safeParse({
      legacy_path: longPath,
      target_path: '/new',
      status: 301,
    })
    expect(r.success).toBe(false)
  })
})
