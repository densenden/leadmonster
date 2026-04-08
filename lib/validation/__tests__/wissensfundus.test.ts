// Zod schema validation tests for the Wissensfundus feature.
// These tests verify the schema boundaries independently of any UI or server logic.
import { describe, it, expect } from 'vitest'
import { wissensfundusSchema } from '../wissensfundus'

describe('wissensfundusSchema — kategorie field', () => {
  it('accepts all five valid kategorie values', () => {
    const validValues = ['sterbegeld', 'pflege', 'leben', 'unfall', 'allgemein'] as const
    for (const kategorie of validValues) {
      const result = wissensfundusSchema.safeParse({
        kategorie,
        thema: 'Test Thema',
        inhalt: 'Ein ausreichend langer Inhalt für den Test.',
        tags: [],
      })
      expect(result.success, `Expected ${kategorie} to be valid`).toBe(true)
    }
  })

  it('rejects an invalid kategorie value', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'invalid_kategorie',
      thema: 'Test Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.kategorie).toBeDefined()
    }
  })

  it('rejects an empty kategorie string', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: '',
      thema: 'Test Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('wissensfundusSchema — thema field', () => {
  it('rejects thema shorter than 3 characters', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'ab',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.thema).toBeDefined()
    }
  })

  it('accepts thema at the minimum length of 3 characters', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'abc',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects thema longer than 120 characters', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'a'.repeat(121),
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.thema).toBeDefined()
    }
  })

  it('accepts thema at the maximum length of 120 characters', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'a'.repeat(120),
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('wissensfundusSchema — inhalt field', () => {
  it('rejects inhalt shorter than 20 characters', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'Test Thema',
      inhalt: 'Zu kurz.',
      tags: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.inhalt).toBeDefined()
    }
  })

  it('accepts inhalt at exactly 20 characters', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'Test Thema',
      inhalt: 'a'.repeat(20),
      tags: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('wissensfundusSchema — tags field', () => {
  it('accepts an empty tags array', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'Test Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts tags array with up to 10 entries', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'Test Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects tags array with more than 10 entries', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'Test Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10', 't11'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.tags).toBeDefined()
    }
  })

  it('rejects tags containing empty strings', () => {
    const result = wissensfundusSchema.safeParse({
      kategorie: 'allgemein',
      thema: 'Test Thema',
      inhalt: 'Ein ausreichend langer Inhalt für den Test.',
      tags: ['valid', ''],
    })
    expect(result.success).toBe(false)
  })
})
