import { describe, it, expect } from 'vitest'
import { resolveFilterAxes, getWartezeitFormOptions } from '../resolve-filter-axes'

describe('resolveFilterAxes', () => {
  it('uses code-default wartezeit axis when DB returns empty array', () => {
    const axes = resolveFilterAxes('sterbegeld', [])
    expect(axes.some(a => a.key === 'wartezeit_monate')).toBe(true)
    expect(axes.find(a => a.key === 'wartezeit_monate')?.show_as_column).toBe(true)
  })

  it('sterbegeld wartezeit filter includes 24 months', () => {
    const axis = resolveFilterAxes('sterbegeld', []).find(a => a.key === 'wartezeit_monate')
    const values = axis?.options.map(o => o.value) ?? []
    expect(values).toContain(24)
  })

  it('prefers non-empty DB axes over code defaults', () => {
    const dbAxes = [
      {
        key: 'berufsklasse',
        label: 'Berufsklasse',
        source: 'column' as const,
        type: 'enum_exact' as const,
        options: [{ value: 'A', label: 'A' }],
        default_value: 'A',
        show_as_column: true,
        lead_field: 'berufsklasse',
      },
    ]
    const axes = resolveFilterAxes('bu', dbAxes)
    expect(axes).toHaveLength(1)
    expect(axes[0]?.key).toBe('berufsklasse')
  })
})

describe('getWartezeitFormOptions', () => {
  it('returns numeric options for sterbegeld', () => {
    const opts = getWartezeitFormOptions('sterbegeld')
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.every(o => typeof o.value === 'number')).toBe(true)
  })

  it('returns empty array for product types without wartezeit axis', () => {
    expect(getWartezeitFormOptions('pflege')).toEqual([])
  })
})
