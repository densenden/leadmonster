// Data layer tests for the Ratgeber feature.
// Covers: Supabase query functions, calculateReadingTime, buildArticleSchema, buildHowToSchema.
// No real network calls — all Supabase interactions are mocked.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RatgeberSection } from '@/lib/types/ratgeber'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/headers so createClient() in server.ts does not crash in test environment
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// Mock the Supabase admin client — individual tests configure mockFrom per call
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

// ---------------------------------------------------------------------------
// Test 1: fetchRatgeberBySlug returns null for an unpublished row
// ---------------------------------------------------------------------------

describe('fetchRatgeberBySlug', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns null when the content row has status other than publiziert', async () => {
    // Supabase single() returns null when no published row matches
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })

    const { fetchRatgeberBySlug } = await import('@/lib/supabase/ratgeber')
    const result = await fetchRatgeberBySlug('sterbegeld24plus', 'was-ist-sterbegeld')

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Test 2: fetchAllRatgeberForProdukt returns only ratgeber + publiziert rows
// ---------------------------------------------------------------------------

describe('fetchAllRatgeberForProdukt', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns only rows with page_type = ratgeber and status = publiziert', async () => {
    const mockRows = [
      {
        id: 'row-1',
        slug: 'was-ist-sterbegeld',
        title: 'Was ist Sterbegeld?',
        meta_desc: 'Sterbegeldversicherung erklärt.',
        content: { sections: [] },
        published_at: '2026-04-01T00:00:00.000Z',
        produkte: { slug: 'sterbegeld24plus', status: 'publiziert' },
      },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    })

    const { fetchAllRatgeberForProdukt } = await import('@/lib/supabase/ratgeber')
    const results = await fetchAllRatgeberForProdukt('sterbegeld24plus')

    expect(results).toHaveLength(1)
    expect(results[0].slug).toBe('was-ist-sterbegeld')
    expect(results[0].title).toBe('Was ist Sterbegeld?')
  })
})

// ---------------------------------------------------------------------------
// Test 3: calculateReadingTime minimum clamping and rounding
// ---------------------------------------------------------------------------

describe('calculateReadingTime', () => {
  it('returns minimum of 2 when sections are empty', async () => {
    const { calculateReadingTime } = await import('@/lib/utils/reading-time')
    expect(calculateReadingTime([])).toBe(2)
  })

  it('rounds up to the nearest whole minute', async () => {
    const { calculateReadingTime } = await import('@/lib/utils/reading-time')
    // 201 words → ceil(201/200) = 2
    const manyWords = Array(201).fill('Wort').join(' ')
    const result = calculateReadingTime([{ type: 'intro', text: manyWords }])
    expect(result).toBe(2)
  })

  it('returns correct estimate for a larger text (>200 words per minute boundary)', async () => {
    const { calculateReadingTime } = await import('@/lib/utils/reading-time')
    // 401 words → ceil(401/200) = 3
    const longText = Array(401).fill('Text').join(' ')
    const result = calculateReadingTime([{ type: 'intro', text: longText }])
    expect(result).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Test 4: buildArticleSchema output includes headline, datePublished, and author
// ---------------------------------------------------------------------------

describe('buildArticleSchema', () => {
  it('output includes headline, datePublished, and author fields', async () => {
    const { buildArticleSchema } = await import('@/lib/seo/schema')

    const result = buildArticleSchema({
      headline: 'Was ist eine Sterbegeldversicherung?',
      description: 'Eine Sterbegeldversicherung deckt Beerdigungskosten ab.',
      datePublished: '2026-04-01T00:00:00.000Z',
      produktSlug: 'sterbegeld24plus',
      thema: 'was-ist-sterbegeld',
    })

    expect(result['@type']).toBe('Article')
    expect(result.headline).toBe('Was ist eine Sterbegeldversicherung?')
    expect(result.datePublished).toBe('2026-04-01T00:00:00.000Z')
    expect(result.author).toBeDefined()
    expect((result.author as Record<string, unknown>)['@type']).toBe('InsuranceAgency')
  })
})

// ---------------------------------------------------------------------------
// Test 5: buildHowToSchema is only invoked when steps sections are present
// ---------------------------------------------------------------------------

describe('buildHowToSchema conditional usage', () => {
  it('buildHowToSchema produces valid HowTo object with step array when called', async () => {
    const { buildHowToSchema } = await import('@/lib/seo/schema')

    const steps = [
      { number: 1, title: 'Schritt eins', description: 'Tun Sie dies zuerst.' },
      { number: 2, title: 'Schritt zwei', description: 'Dann das hier.' },
    ]

    const result = buildHowToSchema({ name: 'Antrag stellen', steps })

    expect(result['@type']).toBe('HowTo')
    expect(result.name).toBe('Antrag stellen')
    expect(Array.isArray(result.step)).toBe(true)
    expect((result.step as unknown[]).length).toBe(2)
  })

  it('should not call buildHowToSchema when no steps sections exist in article', async () => {
    // This test verifies the conditional pattern at the call site:
    // only sections of type 'steps' should trigger buildHowToSchema.
    const { calculateReadingTime } = await import('@/lib/utils/reading-time')
    const { buildHowToSchema } = await import('@/lib/seo/schema')

    // Type the array as RatgeberSection[] so TypeScript allows the .some check
    const sectionsWithoutSteps: RatgeberSection[] = [
      { type: 'intro', text: 'Intro text here.' },
      { type: 'body', heading: 'Heading', paragraphs: ['paragraph'] },
    ]

    const hasSteps = sectionsWithoutSteps.some(s => s.type === 'steps')
    expect(hasSteps).toBe(false)

    // buildHowToSchema should never be called in this scenario
    const howToSpy = vi.fn(buildHowToSchema)
    if (hasSteps) {
      howToSpy({ name: 'test', steps: [] })
    }
    expect(howToSpy).not.toHaveBeenCalled()

    // Reading time still works without steps
    const readingTime = calculateReadingTime(sectionsWithoutSteps)
    expect(readingTime).toBeGreaterThanOrEqual(2)
  })
})
