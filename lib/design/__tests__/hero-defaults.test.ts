import { describe, it, expect } from 'vitest'
import {
  enrichHeroSection,
  getSterbegeldHeroDefaults,
  normalizeSterbegeldPriceInText,
  buildSterbegeldHeroHeadline,
  extractMarkdownLinks,
} from '@/lib/design/hero-defaults'
import type { HeroSection } from '@/lib/types/content'

describe('getSterbegeldHeroDefaults', () => {
  it('returns flyer copy with inviting variant', () => {
    const defaults = getSterbegeldHeroDefaults('sterbegeld24plus')
    expect(defaults.variant).toBe('inviting')
    expect(defaults.headline).toContain('Vorsorge mit Herz')
    expect(defaults.headline).toContain('/sterbegeld24plus/ratgeber/was-ist-sterbegeld')
    expect(defaults.headline_accent).toBeUndefined()
    expect(defaults.price_from).toBe('6,97€')
    expect(defaults.benefits).toHaveLength(5)
    expect(defaults.cta_anchor).toBe('/sterbegeld24plus/tarife')
  })
})

describe('buildSterbegeldHeroHeadline', () => {
  it('preserves links from DB headline in new emotional copy', () => {
    const db =
      '[Sterbegeldversicherung](/sterbegeld24plus/ratgeber/was-ist-sterbegeld) für Senioren ab 50'
    const headline = buildSterbegeldHeroHeadline('sterbegeld24plus', db)

    expect(headline).toContain('Fürsorge')
    expect(headline).toContain('[Sterbegeldversicherung](/sterbegeld24plus/ratgeber/was-ist-sterbegeld)')
    expect(headline).not.toContain('für Senioren ab 50')
    expect(headline).not.toContain('VERSICHERUNG')
  })

  it('keeps multiple DB links when present', () => {
    const db =
      '[Sterbegeldversicherung](/sterbegeld24plus/ratgeber/was-ist-sterbegeld) und [Bestattungsvorsorge](/wissen/was-ist-sterbegeld)'
    const headline = buildSterbegeldHeroHeadline('sterbegeld24plus', db)

    expect(headline).toContain('Vorsorge mit Herz')
    expect(headline).toContain('[Sterbegeldversicherung](/sterbegeld24plus/ratgeber/was-ist-sterbegeld)')
    expect(headline).toContain('[Bestattungsvorsorge](/wissen/was-ist-sterbegeld)')
  })
})

describe('extractMarkdownLinks', () => {
  it('parses markdown link syntax', () => {
    const links = extractMarkdownLinks(
      '[A](/a) text [B](/b)',
    )
    expect(links).toEqual([
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
    ])
  })
})

describe('enrichHeroSection', () => {
  const base: HeroSection = {
    type: 'hero',
    headline: 'Custom',
    subline: 'Sub',
    cta_text: 'CTA',
    cta_anchor: '#x',
  }

  it('merges sterbegeld flyer defaults when fields are missing', () => {
    const result = enrichHeroSection(base, 'sterbegeld', 'sterbegeld24plus')
    expect(result.variant).toBe('inviting')
    expect(result.headline).toContain('Vorsorge')
    expect(result.benefits?.length).toBeGreaterThan(0)
    expect(result.price_from).toBe('6,97€')
  })

  it('keeps classic variant for non-sterbegeld products', () => {
    const result = enrichHeroSection(base, 'pflege', 'pflegezusatz')
    expect(result.variant).toBe('classic')
    expect(result.benefits).toBeUndefined()
  })

  it('rewrites DB headline to emotional copy while keeping links', () => {
    const custom: HeroSection = {
      ...base,
      headline: '[Sterbegeldversicherung](/sterbegeld24plus/ratgeber/was-ist-sterbegeld) für Senioren ab 50',
    }
    const result = enrichHeroSection(custom, 'sterbegeld', 'sterbegeld24plus')
    expect(result.headline_accent).toBeUndefined()
    expect(result.headline).toContain('Fürsorge')
    expect(result.headline).toContain('/sterbegeld24plus/ratgeber/was-ist-sterbegeld')
    expect(result.headline).not.toContain('für Senioren ab 50')
  })

  it('replaces 9,99 € with 6,97 € in hero subline from DB', () => {
    const custom: HeroSection = {
      ...base,
      subline:
        'Damit Ihre Liebsten in einer schweren Zeit finanziell entlastet sind. Beitrag ab 9,99 € pro Monat — Sofortschutz bei Unfalltod ab Tag 1.',
    }
    const result = enrichHeroSection(custom, 'sterbegeld', 'sterbegeld24plus')
    expect(result.subline).toContain('6,97 €')
    expect(result.subline).not.toContain('9,99')
  })

  it('forces hero CTA to tarifrechner even when DB has #formular', () => {
    const custom: HeroSection = {
      ...base,
      cta_anchor: '#formular',
      cta_text: 'Angebot anfordern',
    }
    const result = enrichHeroSection(custom, 'sterbegeld', 'sterbegeld24plus')
    expect(result.cta_anchor).toBe('/sterbegeld24plus/tarife')
    expect(result.cta_text).toBe('Angebot anfordern')
  })

  it('uses admin hero image when section has no image_url', () => {
    const result = enrichHeroSection(base, 'sterbegeld', 'sterbegeld24plus', {
      image_url: 'https://cdn.example/admin-hero.jpg',
      image_alt: 'Admin hero',
    })
    expect(result.image_url).toBe('https://cdn.example/admin-hero.jpg')
    expect(result.image_alt).toBe('Admin hero')
  })

  it('prefers section image_url over admin hero', () => {
    const custom: HeroSection = {
      ...base,
      image_url: 'https://cdn.example/section-hero.jpg',
      image_alt: 'Section hero',
    }
    const result = enrichHeroSection(custom, 'sterbegeld', 'sterbegeld24plus', {
      image_url: 'https://cdn.example/admin-hero.jpg',
      image_alt: 'Admin hero',
    })
    expect(result.image_url).toBe('https://cdn.example/section-hero.jpg')
    expect(result.image_alt).toBe('Section hero')
  })
})

describe('normalizeSterbegeldPriceInText', () => {
  it('rewrites 9,99 € variants', () => {
    expect(normalizeSterbegeldPriceInText('Beitrag ab 9,99 € pro Monat')).toBe(
      'Beitrag ab 6,97 € pro Monat',
    )
    expect(normalizeSterbegeldPriceInText('ab 9.99€')).toBe('ab 6,97 €')
  })
})
