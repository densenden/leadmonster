import { describe, it, expect } from 'vitest'
import { resolveNavbarLogoMark, productInitialLetter } from '../navbar-logo'

describe('productInitialLetter', () => {
  it('takes the first letter', () => {
    expect(productInitialLetter('Sterbegeld24Plus')).toBe('S')
  })

  it('skips leading digits', () => {
    expect(productInitialLetter('24Plus Pflege')).toBe('P')
  })

  it('uppercases german umlauts', () => {
    expect(productInitialLetter('ärzte BU')).toBe('Ä')
  })
})

describe('resolveNavbarLogoMark', () => {
  it('hides logo by default', () => {
    expect(resolveNavbarLogoMark({
      visible: false,
      productName: 'Test',
      accentColor: '#02a9e6',
    })).toEqual({ kind: 'hidden' })
  })

  it('uses letter circle when visible without upload', () => {
    expect(resolveNavbarLogoMark({
      visible: true,
      customUrl: null,
      productName: 'Sterbegeld24Plus',
      accentColor: '#ff0000',
    })).toEqual({ kind: 'initial', letter: 'S', accentColor: '#ff0000' })
  })

  it('uses custom url when uploaded', () => {
    expect(resolveNavbarLogoMark({
      visible: true,
      customUrl: 'https://cdn.example/logo.png',
      customAlt: 'Brand',
      productName: 'X',
      accentColor: '#02a9e6',
    })).toEqual({ kind: 'custom', url: 'https://cdn.example/logo.png', alt: 'Brand' })
  })
})
