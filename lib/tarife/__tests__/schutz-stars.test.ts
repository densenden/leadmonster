import { describe, it, expect } from 'vitest'
import { countSchutzStars, displaySchutzStars } from '../schutz-stars'

describe('displaySchutzStars', () => {
  it('adds +1 to raw score capped at 5', () => {
    expect(
      displaySchutzStars('DELA', {
        wartezeit_monate: 0,
        gp: false,
        doppelte_unfall: true,
        rueckholung: true,
        lebenslang: true,
      }),
    ).toBe(5)
  })

  it('Ideal at raw 3: deterministic 4 or 5 stars', () => {
    const b = {
      wartezeit_monate: 12,
      gp: true,
      doppelte_unfall: true,
      rueckholung: true,
      lebenslang: true,
    }
    expect(countSchutzStars(b)).toBe(3)
    const display = displaySchutzStars('Ideal', b, 'Sterbegeld pur+')
    expect(display === 4 || display === 5).toBe(true)
  })
})
