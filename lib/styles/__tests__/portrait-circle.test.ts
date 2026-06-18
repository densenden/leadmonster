import { describe, expect, it } from 'vitest'
import {
  PORTRAIT_CIRCLE_INNER,
  PORTRAIT_CIRCLE_WRAPPER,
  PORTRAIT_CROP_TOP_BIAS,
} from '../portrait-circle'

describe('portrait-circle constants', () => {
  it('crops portrait uploads with extra headroom so face sits lower', () => {
    expect(PORTRAIT_CROP_TOP_BIAS).toBeLessThan(0.5)
    expect(PORTRAIT_CROP_TOP_BIAS).toBe(0.22)
  })

  it('uses clipped wrapper + oversized inner image to lower face in circle', () => {
    expect(PORTRAIT_CIRCLE_WRAPPER).toContain('overflow-hidden')
    expect(PORTRAIT_CIRCLE_WRAPPER).toContain('rounded-full')
    expect(PORTRAIT_CIRCLE_INNER).toContain('object-cover')
    expect(PORTRAIT_CIRCLE_INNER).toContain('-translate-y-')
    expect(PORTRAIT_CIRCLE_INNER).not.toContain('object-[center_10%]')
  })
})
