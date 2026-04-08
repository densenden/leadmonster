// Unit tests for lib/tarif-data.ts
// Covers: getAgeBracket lookup, boundary correctness, out-of-range handling, structural completeness.
import { describe, it, expect } from 'vitest'
import { getAgeBracket, TARIF_DATA } from '@/lib/tarif-data'

// ---------------------------------------------------------------------------
// getAgeBracket — core lookup
// ---------------------------------------------------------------------------

describe('getAgeBracket', () => {
  it('returns the correct low/high pair for sterbegeld age 55 sum 10000', () => {
    const result = getAgeBracket('sterbegeld', 55, 10000)
    expect(result).toEqual({ low: 18, high: 26 })
  })

  it('resolves age 50 to the 50–59 bracket, not the 40–49 bracket', () => {
    // Boundary: 50 is exactly at minAge of the second bracket.
    const result = getAgeBracket('sterbegeld', 50, 10000)
    // 50–59 bracket has { low: 18, high: 26 } for sum 10000
    expect(result).toEqual({ low: 18, high: 26 })

    // Confirm the 40–49 bracket gives different values for the same sum
    const resultAge49 = getAgeBracket('sterbegeld', 49, 10000)
    expect(resultAge49).toEqual({ low: 15, high: 22 })

    // The two results must differ, proving the bracket boundary is respected
    expect(result).not.toEqual(resultAge49)
  })

  it('returns undefined for age 39 (below minimum supported age)', () => {
    expect(getAgeBracket('sterbegeld', 39, 10000)).toBeUndefined()
  })

  it('returns undefined for age 86 (above maximum supported age)', () => {
    expect(getAgeBracket('sterbegeld', 86, 10000)).toBeUndefined()
  })

  it('returns undefined for a sum key not in the SumMap (e.g. 6000)', () => {
    // 6000 is not one of the five defined tiers
    expect(getAgeBracket('sterbegeld', 55, 6000)).toBeUndefined()
  })

  it('returns undefined for pflege because no brackets are populated yet', () => {
    expect(getAgeBracket('pflege', 55, 10000)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// TARIF_DATA structural completeness
// ---------------------------------------------------------------------------

describe('TARIF_DATA — sterbegeld structural completeness', () => {
  const EXPECTED_SUMS = [5000, 7500, 10000, 12500, 15000]

  it('has exactly five age brackets for sterbegeld', () => {
    expect(TARIF_DATA.sterbegeld).toHaveLength(5)
  })

  it('every sterbegeld bracket contains all five sum tiers with numeric low/high values', () => {
    for (const bracket of TARIF_DATA.sterbegeld) {
      for (const sum of EXPECTED_SUMS) {
        const range = bracket.sums[sum]
        expect(range, `sum ${sum} missing in bracket ${bracket.minAge}–${bracket.maxAge}`).toBeDefined()
        expect(typeof range.low).toBe('number')
        expect(typeof range.high).toBe('number')
        expect(range.high).toBeGreaterThan(range.low)
      }
    }
  })

  it('placeholder product types (pflege, leben, unfall) are empty arrays', () => {
    expect(TARIF_DATA.pflege).toEqual([])
    expect(TARIF_DATA.leben).toEqual([])
    expect(TARIF_DATA.unfall).toEqual([])
  })
})
