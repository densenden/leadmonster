// Tests for Zod validation schemas in lib/anthropic/schemas.ts.
// Verifies that valid payloads pass and invalid ones are rejected
// before any DB write can occur.
import { describe, it, expect } from 'vitest'
import {
  HauptseiteResponseSchema,
  FaqResponseSchema,
  PageResponseSchemas,
  FaqSectionSchema,
} from '../schemas'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function validHauptseitePayload() {
  return {
    sections: [
      {
        type: 'hero',
        headline: 'Sterbegeld absichern',
        subline: 'Günstig und zuverlässig',
        cta_text: 'Jetzt anfragen',
        cta_anchor: '#formular',
      },
    ],
    meta_title: 'Sterbegeld 2024 – Günstig absichern',
    meta_desc: 'Sterbegeld günstig vergleichen. Jetzt Angebot anfordern.',
    schema_markup: { '@context': 'https://schema.org', '@type': 'InsuranceAgency' },
  }
}

function faqItemsFixture(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    frage: `Frage ${i + 1}?`,
    antwort: `Antwort ${i + 1}.`,
  }))
}

function validFaqPayload() {
  return {
    sections: [
      { type: 'faq', items: faqItemsFixture(10) },
    ],
    meta_title: 'Häufige Fragen zum Sterbegeld',
    meta_desc: 'Alle wichtigen Fragen und Antworten zum Thema Sterbegeld.',
    schema_markup: { '@context': 'https://schema.org', '@type': 'FAQPage' },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HauptseiteResponseSchema', () => {
  it('accepts a valid hauptseite payload', () => {
    const result = HauptseiteResponseSchema.safeParse(validHauptseitePayload())
    expect(result.success).toBe(true)
  })

  it('rejects a payload missing the sections field', () => {
    const payload = { meta_title: 'Test', meta_desc: 'Test', schema_markup: {} }
    const result = HauptseiteResponseSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects meta_title longer than 60 characters', () => {
    const payload = {
      ...validHauptseitePayload(),
      meta_title: 'A'.repeat(61),
    }
    const result = HauptseiteResponseSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects meta_desc longer than 160 characters', () => {
    const payload = {
      ...validHauptseitePayload(),
      meta_desc: 'B'.repeat(161),
    }
    const result = HauptseiteResponseSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})

describe('FaqResponseSchema', () => {
  it('accepts a valid faq payload with exactly 10 items', () => {
    const result = FaqResponseSchema.safeParse(validFaqPayload())
    expect(result.success).toBe(true)
  })

  it('rejects an faq section with fewer than 10 items', () => {
    const payload = {
      sections: [{ type: 'faq', items: faqItemsFixture(5) }],
      meta_title: 'FAQ',
      meta_desc: 'FAQ',
      schema_markup: {},
    }
    const result = FaqResponseSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects an faq section with more than 10 items', () => {
    const payload = {
      sections: [{ type: 'faq', items: faqItemsFixture(11) }],
      meta_title: 'FAQ',
      meta_desc: 'FAQ',
      schema_markup: {},
    }
    const result = FaqResponseSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})

describe('PageResponseSchemas map', () => {
  it('provides schemas for all five page types', () => {
    const keys = Object.keys(PageResponseSchemas)
    expect(keys).toContain('hauptseite')
    expect(keys).toContain('faq')
    expect(keys).toContain('vergleich')
    expect(keys).toContain('tarif')
    expect(keys).toContain('ratgeber')
  })
})

describe('FaqSectionSchema', () => {
  it('parses valid faq section with exactly 10 items', () => {
    const result = FaqSectionSchema.safeParse({
      type: 'faq',
      items: faqItemsFixture(10),
    })
    expect(result.success).toBe(true)
  })
})
