import { describe, it, expect } from 'vitest'
import { getAnbieterLogoSrc } from '../logos'

describe('getAnbieterLogoSrc', () => {
  it('resolves known provider names', () => {
    expect(getAnbieterLogoSrc('Allianz')).toBe('/images/anbieter/allianz.png')
    expect(getAnbieterLogoSrc('DELA')).toBe('/images/anbieter/dela.png')
    expect(getAnbieterLogoSrc('Ideal')).toBe('/images/anbieter/ideal.png')
    expect(getAnbieterLogoSrc('LV1871')).toBe('/images/anbieter/lv1871.png')
    expect(getAnbieterLogoSrc('Hannoversche')).toBe('/images/anbieter/hannoversche.png')
  })

  it('returns null for providers without a logo asset', () => {
    expect(getAnbieterLogoSrc('November')).toBeNull()
  })
})
