import { describe, it, expect } from 'vitest'
import { checkFormDwellTime, MIN_FORM_DWELL_MS } from '../form-timing'

describe('checkFormDwellTime', () => {
  const now = Date.parse('2026-07-29T12:00:00.000Z')

  it('rejects missing formLoadedAt', () => {
    const result = checkFormDwellTime(undefined, now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TOO_FAST')
  })

  it('rejects when dwell is under minimum', () => {
    const loaded = new Date(now - 500).toISOString()
    const result = checkFormDwellTime(loaded, now)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('TOO_FAST')
      expect(result.dwellMs).toBe(500)
    }
  })

  it('accepts when dwell meets minimum', () => {
    const loaded = new Date(now - MIN_FORM_DWELL_MS).toISOString()
    const result = checkFormDwellTime(loaded, now)
    expect(result).toEqual({ ok: true, dwellMs: MIN_FORM_DWELL_MS })
  })

  it('allows future timestamps (clock skew)', () => {
    const loaded = new Date(now + 10_000).toISOString()
    const result = checkFormDwellTime(loaded, now)
    expect(result).toEqual({ ok: true, dwellMs: null })
  })
})
