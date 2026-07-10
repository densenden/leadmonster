import { describe, it, expect } from 'vitest'
import { wartezeitMonateFromBesonderheiten } from '../wartezeit-monate'

describe('wartezeitMonateFromBesonderheiten', () => {
  it('reads numeric wartezeit from besonderheiten', () => {
    expect(wartezeitMonateFromBesonderheiten({ wartezeit_monate: 24 })).toBe(24)
  })

  it('falls back to 0 when missing', () => {
    expect(wartezeitMonateFromBesonderheiten({})).toBe(0)
    expect(wartezeitMonateFromBesonderheiten(null)).toBe(0)
  })
})
