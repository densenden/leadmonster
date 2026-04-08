// Zod schema tests for the Produkt validation schemas.
// Covers required fields, enum constraints, optional fields, and record types.
import { describe, it, expect } from 'vitest'
import { produktSchema, produktUpdateSchema } from '@/lib/validations/produkt'

describe('produktSchema', () => {
  it('accepts a valid full payload', () => {
    const result = produktSchema.safeParse({
      name: 'Sterbegeld24Plus',
      slug: 'sterbegeld24plus',
      typ: 'sterbegeld',
      status: 'entwurf',
      zielgruppe: ['senioren_50plus', 'familien'],
      fokus: 'sicherheit',
      anbieter: ['Allianz', 'Zurich'],
      argumente: { vorteil1: 'Sofortschutz', vorteil2: 'Günstige Prämie' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects payload missing required field: name', () => {
    const result = produktSchema.safeParse({
      slug: 'sterbegeld24plus',
      typ: 'sterbegeld',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields.name).toBeDefined()
    }
  })

  it('rejects payload missing required field: slug', () => {
    const result = produktSchema.safeParse({
      name: 'Sterbegeld24Plus',
      typ: 'sterbegeld',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields.slug).toBeDefined()
    }
  })

  it('rejects payload missing required field: typ', () => {
    const result = produktSchema.safeParse({
      name: 'Sterbegeld24Plus',
      slug: 'sterbegeld24plus',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields.typ).toBeDefined()
    }
  })

  it('rejects slug with uppercase letters', () => {
    const result = produktSchema.safeParse({
      name: 'Test',
      slug: 'TestSlug',
      typ: 'sterbegeld',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields.slug).toBeDefined()
    }
  })

  it('rejects slug with spaces', () => {
    const result = produktSchema.safeParse({
      name: 'Test',
      slug: 'test slug',
      typ: 'sterbegeld',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields.slug).toBeDefined()
    }
  })

  it('accepts valid slug with hyphens and numbers', () => {
    const result = produktSchema.safeParse({
      name: 'Test Produkt',
      slug: 'test-produkt-24',
      typ: 'pflege',
    })
    expect(result.success).toBe(true)
  })

  it('status field is optional and defaults to absent in schema', () => {
    const result = produktSchema.safeParse({
      name: 'Pflege Plus',
      slug: 'pflege-plus',
      typ: 'pflege',
    })
    expect(result.success).toBe(true)
  })

  it('status field accepts all valid enum values', () => {
    const statuses = ['entwurf', 'aktiv', 'archiviert'] as const
    for (const status of statuses) {
      const result = produktSchema.safeParse({
        name: 'Test',
        slug: 'test',
        typ: 'unfall',
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status enum value', () => {
    const result = produktSchema.safeParse({
      name: 'Test',
      slug: 'test',
      typ: 'unfall',
      status: 'gelöscht',
    })
    expect(result.success).toBe(false)
  })

  it('argumente accepts arbitrary Record<string, string>', () => {
    const result = produktSchema.safeParse({
      name: 'Test',
      slug: 'test',
      typ: 'leben',
      argumente: { key1: 'value1', key2: 'value2', someKey: 'someValue' },
    })
    expect(result.success).toBe(true)
  })

  it('argumente rejects non-string values in record', () => {
    const result = produktSchema.safeParse({
      name: 'Test',
      slug: 'test',
      typ: 'leben',
      argumente: { key1: 123 },
    })
    expect(result.success).toBe(false)
  })
})

describe('produktUpdateSchema', () => {
  it('requires id as uuid for PATCH', () => {
    const resultMissingId = produktUpdateSchema.safeParse({
      name: 'Test',
      slug: 'test',
      typ: 'sterbegeld',
    })
    expect(resultMissingId.success).toBe(false)

    const resultWithId = produktUpdateSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test',
      slug: 'test',
      typ: 'sterbegeld',
    })
    expect(resultWithId.success).toBe(true)
  })

  it('rejects non-uuid id', () => {
    const result = produktUpdateSchema.safeParse({
      id: 'not-a-uuid',
      name: 'Test',
      slug: 'test',
      typ: 'sterbegeld',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields.id).toBeDefined()
    }
  })
})
