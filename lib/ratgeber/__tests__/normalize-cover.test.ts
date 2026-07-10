import { describe, it, expect } from 'vitest'
import { resolveRatgeberCover, sanitizeRatgeberSectionImages } from '../normalize'
import type { RatgeberSection } from '@/lib/types/ratgeber'

const HERO = 'https://xxx.supabase.co/storage/v1/object/public/produkt-bilder/hero-hauptbild-x.png'
const DEDICATED = 'https://xxx.supabase.co/storage/v1/object/public/produkt-bilder/ratgeber-kosten.png'

describe('resolveRatgeberCover', () => {
  it('uses curated Unsplash when cover reuses product hero', () => {
    const result = resolveRatgeberCover(
      { cover_image_url: HERO },
      { hero_image_url: HERO, hero_image_alt: 'Hero' },
      'kosten-leistungen',
    )
    expect(result.cover_image_url).toContain('images.unsplash.com')
    expect(result.cover_image_alt).toContain('Taschenrechner')
  })

  it('falls back to intro.image_url before curated cover', () => {
    const introUrl = 'https://xxx.supabase.co/storage/v1/object/public/produkt-bilder/intro-cover.png'
    const result = resolveRatgeberCover(
      {
        sections: [{ type: 'intro', text: 'Lead', image_url: introUrl, image_alt: 'Intro' }],
      },
      { hero_image_url: HERO, hero_image_alt: null },
      'kosten-leistungen',
    )
    expect(result.cover_image_url).toBe(introUrl)
    expect(result.cover_image_alt).toBe('Intro')
  })

  it('ignores stale unsplash intro url and uses curated cover', () => {
    const dead = 'https://images.unsplash.com/photo-1567096038228-7d57aacd33b1?w=1600'
    const result = resolveRatgeberCover(
      {
        sections: [{ type: 'intro', text: 'Lead', image_url: dead, image_alt: 'Dead' }],
      },
      { hero_image_url: null, hero_image_alt: null },
      'was-ist-sterbegeld',
    )
    expect(result.cover_image_url).toContain('images.unsplash.com/photo-1450101499163')
  })

  it('prefers dedicated cover over intro', () => {
    const result = resolveRatgeberCover(
      {
        cover_image_url: DEDICATED,
        cover_image_alt: 'Dedicated',
        sections: [{ type: 'intro', text: 'x', image_url: 'https://other.png' }],
      },
      { hero_image_url: HERO, hero_image_alt: null },
      'kosten-leistungen',
    )
    expect(result.cover_image_url).toBe(DEDICATED)
  })
})

describe('sanitizeRatgeberSectionImages', () => {
  it('replaces stale unsplash image_text url with curated cover', () => {
    const dead = 'https://images.unsplash.com/photo-1567096038228-7d57aacd33b1?w=1600'
    const sections: RatgeberSection[] = [
      { type: 'intro', text: 'Lead' },
      {
        type: 'image_text',
        image_url: dead,
        image_alt: 'Dead',
        image_side: 'left',
        heading: 'Test',
        body: 'Body',
      },
    ]
    const out = sanitizeRatgeberSectionImages('was-ist-sterbegeld', sections)
    const imageText = out.find(s => s.type === 'image_text')
    expect(imageText && 'image_url' in imageText ? imageText.image_url : '').toContain(
      'photo-1450101499163',
    )
  })

  it('keeps supabase-hosted section images', () => {
    const stored = 'https://xxx.supabase.co/storage/v1/object/public/produkt-bilder/cover.png'
    const sections: RatgeberSection[] = [
      {
        type: 'image_text',
        image_url: stored,
        image_alt: 'Stored',
        image_side: 'right',
        heading: 'Test',
        body: 'Body',
      },
    ]
    const out = sanitizeRatgeberSectionImages('was-ist-sterbegeld', sections)
    expect(out[0] && 'image_url' in out[0] ? out[0].image_url : '').toBe(stored)
  })
})
