// Tests für lib/openai/hero-prompt.ts + section-prompt.ts.
// Verifiziert das neue Storytelling-Template, Brand-Look-Konsistenz,
// die strikte No-Faces-Regel und die Style-Reference-Integration.
import { describe, it, expect } from 'vitest'
import { buildHeroPrompt, defaultHeroPrompt, getBrandLook } from '../hero-prompt'
import { buildSectionPrompt, defaultSlotForSection } from '../section-prompt'

describe('buildHeroPrompt', () => {
  it('liefert für jedes Produkttyp eine Brand-Palette + Lichtstimmung', () => {
    for (const typ of ['sterbegeld', 'pflege', 'leben', 'bu', 'unfall']) {
      const prompt = buildHeroPrompt(typ)
      expect(prompt.toLowerCase()).toContain('color palette')
      expect(prompt.toLowerCase()).toContain('lighting')
      // Strict no-faces rule must always be present
      expect(prompt).toMatch(/no clearly visible human faces/i)
      expect(prompt).toMatch(/no front-facing portraits/i)
    }
  })

  it('integriert styleDescription wenn gesetzt', () => {
    const prompt = buildHeroPrompt('sterbegeld', {
      styleDescription: 'soft watercolor illustration, warm earth tones',
    })
    expect(prompt).toContain('Visual style direction: soft watercolor illustration')
  })

  it('fügt Zielgruppe als implied subject mit no-faces-Wording an', () => {
    const prompt = buildHeroPrompt('sterbegeld', { zielgruppe: ['senioren_50plus'] })
    expect(prompt).toContain('Implied subject:')
    expect(prompt).toContain('hands, silhouettes')
  })

  it('fügt fokus als mood an', () => {
    const prompt = buildHeroPrompt('sterbegeld', { fokus: 'sicherheit' })
    expect(prompt).toContain('Mood:')
    expect(prompt).toContain('reassuring')
  })

  it('lässt anbieter explizit weg (Brand-Logos verboten)', () => {
    const prompt = buildHeroPrompt('sterbegeld', { anbieter: ['Allianz', 'AXA'] })
    expect(prompt).not.toContain('Allianz')
    expect(prompt).not.toContain('AXA')
  })
})

describe('defaultHeroPrompt', () => {
  it('liefert Brand-Look auch ohne Optionen', () => {
    const prompt = defaultHeroPrompt('sterbegeld')
    expect(prompt).toContain('Color palette')
    expect(prompt).toContain('No visible faces')
  })

  it('fällt bei unbekanntem Typ auf sterbegeld-Look zurück', () => {
    const prompt = defaultHeroPrompt('exotic-typ')
    const sterbegeld = defaultHeroPrompt('sterbegeld')
    // Both should contain the same color-palette phrase from sterbegeld
    expect(prompt).toContain('sage green')
    expect(sterbegeld).toContain('sage green')
  })
})

describe('getBrandLook', () => {
  it('liefert eine Brand-Look-Konfig pro Produkttyp', () => {
    const sterbegeld = getBrandLook('sterbegeld')
    expect(sterbegeld.palette).toBeTruthy()
    expect(sterbegeld.lighting).toBeTruthy()
    expect(sterbegeld.motifs).toBeTruthy()
  })

  it('Brand-Looks unterscheiden sich pro Produkttyp', () => {
    expect(getBrandLook('sterbegeld').palette).not.toBe(getBrandLook('pflege').palette)
    expect(getBrandLook('leben').palette).not.toBe(getBrandLook('bu').palette)
  })
})

describe('buildSectionPrompt', () => {
  it('schreibt Brand-Look UND Section-Beat in den Prompt', () => {
    const prompt = buildSectionPrompt({
      produktTyp: 'sterbegeld',
      sectionType: 'features',
      slot: 'feature',
    })
    // Brand-look (vom Produkttyp)
    expect(prompt.toLowerCase()).toContain('color palette')
    // Section-Beat (für features)
    expect(prompt.toLowerCase()).toContain('iconic object')
    // Slot-Composition (für feature)
    expect(prompt.toLowerCase()).toContain('square composition')
  })

  it('No-Faces-Regel ist immer in der Section-Prompt', () => {
    const prompt = buildSectionPrompt({
      produktTyp: 'pflege',
      sectionType: 'body',
      slot: 'inline',
    })
    expect(prompt).toMatch(/no clearly visible human faces/i)
    expect(prompt).toMatch(/hands, silhouettes/i)
  })

  it('Section-Beats unterscheiden sich pro Section-Type', () => {
    const a = buildSectionPrompt({ produktTyp: 'sterbegeld', sectionType: 'features', slot: 'feature' })
    const b = buildSectionPrompt({ produktTyp: 'sterbegeld', sectionType: 'faq', slot: 'inline' })
    const c = buildSectionPrompt({ produktTyp: 'sterbegeld', sectionType: 'vergleich', slot: 'inline' })
    // jeder Beat hat einen unverwechselbaren Anker
    expect(a).toContain('iconic object')
    expect(b).toContain('notebook')
    expect(c).toContain('parallel objects')
  })

  it('integriert contextHint als Specific-Topic', () => {
    const prompt = buildSectionPrompt({
      produktTyp: 'sterbegeld',
      sectionType: 'body',
      slot: 'inline',
      contextHint: 'Wartezeit bei Unfalltod',
    })
    expect(prompt).toContain('Specific topic: Wartezeit bei Unfalltod')
  })

  it('Brand-Look bleibt konsistent über Sections desselben Produkts', () => {
    const a = buildSectionPrompt({ produktTyp: 'sterbegeld', sectionType: 'features', slot: 'feature' })
    const b = buildSectionPrompt({ produktTyp: 'sterbegeld', sectionType: 'faq', slot: 'inline' })
    // Beide nutzen dieselbe Palette
    expect(a).toContain('sage green')
    expect(b).toContain('sage green')
  })

  it('integriert styleDescription wenn gesetzt', () => {
    const prompt = buildSectionPrompt({
      produktTyp: 'sterbegeld',
      sectionType: 'body',
      slot: 'inline',
      styleDescription: 'documentary photography, muted film grain',
    })
    expect(prompt).toContain('Visual style direction (from product reference): documentary photography')
  })
})

describe('defaultSlotForSection', () => {
  it('mappt section-types auf sinnvolle Default-Slots', () => {
    expect(defaultSlotForSection('hero')).toBe('hero')
    expect(defaultSlotForSection('intro')).toBe('hero')
    expect(defaultSlotForSection('features')).toBe('feature')
    expect(defaultSlotForSection('feature_grid')).toBe('feature')
    expect(defaultSlotForSection('blog_post')).toBe('blog_cover')
    expect(defaultSlotForSection('body')).toBe('inline')
    expect(defaultSlotForSection('faq')).toBe('inline')
  })
})
