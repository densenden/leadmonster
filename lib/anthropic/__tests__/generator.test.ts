// Tests for the generateContent function in lib/anthropic/generator.ts.
// All Anthropic SDK and Supabase calls are mocked — no real API or DB calls.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module-level mocks — vi.mock is hoisted to the top by Vitest
// ---------------------------------------------------------------------------

const mockMessagesCreate = vi.fn()
const mockFrom = vi.fn()

// Anthropic SDK must be mocked as a class (constructor) since the generator uses `new Anthropic(...)`.
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockMessagesCreate }
    },
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_PRODUCT = {
  id: 'prod-uuid-1',
  name: 'Sterbegeld24Plus',
  typ: 'sterbegeld',
  slug: 'sterbegeld24plus',
}

const VALID_CONFIG = {
  zielgruppe: ['senioren_50plus'],
  fokus: 'sicherheit',
  anbieter: ['AXA'],
  argumente: { sofortschutz: 'Ab Tag 1' },
}

function buildClaudeResponseText(pageType: string): string {
  const sections =
    pageType === 'faq'
      ? [
          {
            type: 'faq',
            items: Array.from({ length: 10 }, (_, i) => ({
              frage: `Frage ${i + 1}?`,
              antwort: `Antwort ${i + 1}.`,
            })),
          },
        ]
      : pageType === 'ratgeber'
        ? [
            {
              type: 'ratgeber',
              slug: 'was-ist-das',
              titel: 'Was ist Sterbegeld?',
              intro: 'Einführung',
              body_paragraphs: ['P1', 'P2', 'P3', 'P4'],
              cta_text: 'Jetzt anfragen',
            },
          ]
        : [
            {
              type: 'hero',
              headline: 'Test Headline',
              subline: 'Subline',
              cta_text: 'CTA',
              cta_anchor: '#formular',
            },
          ]

  return JSON.stringify({
    sections,
    meta_title: 'Sterbegeld Titel',
    meta_desc: 'Sterbegeld Beschreibung kurz.',
    schema_markup: { '@context': 'https://schema.org', '@type': 'InsuranceAgency' },
  })
}

// ---------------------------------------------------------------------------
// Shared mock setup helper
// ---------------------------------------------------------------------------

function setupDefaultSupabaseMocks(overrides: { upsertSpy?: ReturnType<typeof vi.fn> } = {}) {
  const upsertSpy =
    overrides.upsertSpy ??
    vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null }),
      }),
    })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'produkte') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: VALID_PRODUCT, error: null }),
          }),
        }),
      }
    }
    if (table === 'produkt_config') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: VALID_CONFIG, error: null }),
          }),
        }),
      }
    }
    if (table === 'wissensfundus') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ thema: 'T', inhalt: 'I', tags: ['senioren_50plus'] }],
            error: null,
          }),
        }),
      }
    }
    if (table === 'generierter_content') {
      return { upsert: upsertSpy }
    }
    return {}
  })

  return { upsertSpy }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role')
  })

  it('always resolves and never throws even when every Claude call throws', async () => {
    setupDefaultSupabaseMocks()
    mockMessagesCreate.mockRejectedValue(new Error('Network failure'))

    const { generateContent } = await import('../generator')
    const result = await generateContent('prod-uuid-1')

    expect(result).toBeDefined()
    expect(result.failed.length).toBeGreaterThan(0)
    expect(Array.isArray(result.success)).toBe(true)
  })

  it('returns product-not-found failure when product is missing from DB', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'produkte') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    const { generateContent } = await import('../generator')
    const result = await generateContent('nonexistent-uuid')

    expect(result.success).toHaveLength(0)
    expect(result.failed[0].error_message).toContain('not found')
    expect(result.failed[0].attempt_count).toBe(0)
  })

  it('upserts a row with status entwurf on successful Claude call', async () => {
    const upsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'row-abc' }, error: null }),
      }),
    })
    setupDefaultSupabaseMocks({ upsertSpy })

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: buildClaudeResponseText('hauptseite') }],
    })

    const { generateContent } = await import('../generator')
    await generateContent('prod-uuid-1')

    expect(upsertSpy).toHaveBeenCalled()
    const upsertArg = upsertSpy.mock.calls[0][0]
    expect(upsertArg.status).toBe('entwurf')
  })

  it('records malformed Claude JSON in failed array without DB write', async () => {
    const upsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null }),
      }),
    })
    setupDefaultSupabaseMocks({ upsertSpy })

    // Return invalid JSON — all 7 calls get bad JSON
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json {{{' }],
    })

    const { generateContent } = await import('../generator')
    const result = await generateContent('prod-uuid-1')

    expect(result.failed.length).toBeGreaterThan(0)
    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('retries on HTTP 429 rate limit errors and records attempt_count = 3', async () => {
    setupDefaultSupabaseMocks()

    // Always return 429 to exhaust all 3 retries
    const rateLimitError = Object.assign(new Error('Rate limit'), { status: 429 })

    // Spy on setTimeout and invoke the callback immediately to keep tests fast
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(
      (fn: TimerHandler, _delay?: number) => {
        if (typeof fn === 'function') fn()
        return 0 as unknown as ReturnType<typeof setTimeout>
      },
    )

    mockMessagesCreate.mockRejectedValue(rateLimitError)

    const { generateContent } = await import('../generator')
    const result = await generateContent('prod-uuid-1')

    vi.restoreAllMocks()

    expect(result.failed.length).toBeGreaterThan(0)
    // On 429 with 3 max attempts, attempt_count should be 3
    const hasMaxRetry = result.failed.some(f => f.attempt_count === 3)
    expect(hasMaxRetry).toBe(true)
  })

  it('runs all three ratgeber sub-calls independently when one fails', async () => {
    let claudeCallCount = 0

    const upsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null }),
      }),
    })
    setupDefaultSupabaseMocks({ upsertSpy })

    mockMessagesCreate.mockImplementation(() => {
      claudeCallCount++
      // First 4 calls are hauptseite, faq, vergleich, tarif — fail them
      if (claudeCallCount <= 4) {
        return Promise.reject(new Error('Simulated failure'))
      }
      // Calls 5, 6, 7 are the three ratgeber sub-calls — succeed
      return Promise.resolve({
        content: [{ type: 'text', text: buildClaudeResponseText('ratgeber') }],
      })
    })

    const { generateContent } = await import('../generator')
    const result = await generateContent('prod-uuid-1')

    const ratgeberSuccesses = result.success.filter(s => s.page_type === 'ratgeber')
    expect(ratgeberSuccesses).toHaveLength(3)
  })
})
