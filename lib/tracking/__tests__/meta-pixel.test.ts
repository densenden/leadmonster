import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  META_PIXEL_ID,
  initMetaPixel,
  trackMetaLead,
  trackMetaPageView,
  trackMetaViewContent,
  resetMetaPixelForTests,
  isMetaPixelConfigured,
} from '../meta-pixel'

describe('meta pixel helpers', () => {
  beforeEach(() => {
    resetMetaPixelForTests()
    vi.stubGlobal('document', {
      head: { appendChild: vi.fn() },
      createElement: vi.fn(() => ({ async: true, src: '' })),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the configured default pixel id', () => {
    expect(META_PIXEL_ID).toBe('374844728246470')
    expect(isMetaPixelConfigured()).toBe(true)
  })

  it('initializes fbq once and tracks PageView', () => {
    const track = vi.fn()
    const init = vi.fn()
    vi.stubGlobal('window', {
      fbq: Object.assign(
        (...args: unknown[]) => {
          if (args[0] === 'init') init(...args.slice(1))
          if (args[0] === 'track') track(...args.slice(1))
        },
        { queue: [], push: vi.fn(), loaded: true, version: '2.0' },
      ),
    })

    initMetaPixel()
    initMetaPixel()

    expect(init).toHaveBeenCalledTimes(1)
    expect(init).toHaveBeenCalledWith(META_PIXEL_ID)
    expect(track).toHaveBeenCalledWith('PageView')
  })

  it('tracks Lead conversion when pixel is initialized', () => {
    const track = vi.fn()
    vi.stubGlobal('window', {
      fbq: (...args: unknown[]) => {
        if (args[0] === 'track') track(...args.slice(1))
      },
    })
    resetMetaPixelForTests()

    trackMetaLead('preis')
    expect(track).not.toHaveBeenCalled()

    initMetaPixel()
    trackMetaLead('preis')
    expect(track).toHaveBeenCalledWith('Lead', { content_name: 'preis' })

    trackMetaLead({ contentName: 'preis', value: 19.8, currency: 'EUR' })
    expect(track).toHaveBeenCalledWith('Lead', {
      content_name: 'preis',
      value: 19.8,
      currency: 'EUR',
    })
  })

  it('tracks ViewContent when pixel is initialized', () => {
    const track = vi.fn()
    vi.stubGlobal('window', {
      fbq: (...args: unknown[]) => {
        if (args[0] === 'track') track(...args.slice(1))
      },
    })
    resetMetaPixelForTests()

    trackMetaViewContent({ contentName: 'vergleichsrechner', contentCategory: 'sterbegeld' })
    expect(track).not.toHaveBeenCalled()

    initMetaPixel()
    trackMetaViewContent({ contentName: 'vergleichsrechner', contentCategory: 'sterbegeld' })
    expect(track).toHaveBeenCalledWith('ViewContent', {
      content_name: 'vergleichsrechner',
      content_category: 'sterbegeld',
    })
  })

  it('tracks extra PageView on SPA navigation', () => {
    const track = vi.fn()
    vi.stubGlobal('window', {
      fbq: (...args: unknown[]) => {
        if (args[0] === 'track') track(...args.slice(1))
      },
    })

    initMetaPixel()
    trackMetaPageView()
    expect(track).toHaveBeenCalledTimes(2)
    expect(track).toHaveBeenNthCalledWith(1, 'PageView')
    expect(track).toHaveBeenNthCalledWith(2, 'PageView')
  })
})
