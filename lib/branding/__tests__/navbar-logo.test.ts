import { describe, it, expect } from 'vitest'
import { resolveNavbarLogoMark } from '../navbar-logo'

describe('resolveNavbarLogoMark', () => {
  it('hides logo by default', () => {
    expect(resolveNavbarLogoMark({
      visible: false,
      productName: 'Test',
      accentColor: '#02a9e6',
    })).toEqual({ kind: 'hidden' })
  })

  it('uses monster when visible without upload', () => {
    expect(resolveNavbarLogoMark({
      visible: true,
      customUrl: null,
      productName: 'Sterbegeld24Plus',
      accentColor: '#ff0000',
    })).toEqual({ kind: 'monster', accentColor: '#ff0000' })
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
