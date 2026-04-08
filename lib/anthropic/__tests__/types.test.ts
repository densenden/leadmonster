// Tests for TypeScript type contracts in lib/anthropic/types.ts.
// Verifies that the GenerationResult and PageTypeError shapes satisfy
// the required contract. All SDK calls are mocked — no real API calls.
import { describe, it, expect, vi } from 'vitest'
import type { GenerationResult, PageTypeResult, PageTypeError, PageType } from '../types'

// Mock the Anthropic SDK at module level so importing types never triggers network calls.
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}))

describe('PageTypeError shape', () => {
  it('has the required fields page_type, error_message, and attempt_count', () => {
    const err: PageTypeError = {
      page_type: 'hauptseite',
      error_message: 'Network error',
      attempt_count: 1,
    }

    expect(err.page_type).toBe('hauptseite')
    expect(err.error_message).toBe('Network error')
    expect(err.attempt_count).toBe(1)
    // slug is optional — should not be present unless set
    expect(err.slug).toBeUndefined()
  })

  it('accepts an optional slug field', () => {
    const err: PageTypeError = {
      page_type: 'ratgeber',
      slug: 'was-ist-das',
      error_message: 'Timeout',
      attempt_count: 3,
    }

    expect(err.slug).toBe('was-ist-das')
  })

  it('accepts all valid PageType values', () => {
    const validTypes: PageType[] = ['hauptseite', 'faq', 'vergleich', 'tarif', 'ratgeber']

    validTypes.forEach(pageType => {
      const err: PageTypeError = { page_type: pageType, error_message: 'err', attempt_count: 0 }
      expect(err.page_type).toBe(pageType)
    })
  })
})

describe('GenerationResult shape', () => {
  it('has success and failed arrays', () => {
    const result: GenerationResult = { success: [], failed: [] }

    expect(Array.isArray(result.success)).toBe(true)
    expect(Array.isArray(result.failed)).toBe(true)
  })

  it('success array holds PageTypeResult items', () => {
    const item: PageTypeResult = { page_type: 'faq', slug: 'faq', rowId: 'abc-123' }
    const result: GenerationResult = { success: [item], failed: [] }

    expect(result.success[0].page_type).toBe('faq')
    expect(result.success[0].slug).toBe('faq')
    expect(result.success[0].rowId).toBe('abc-123')
  })

  it('can hold mixed success and failed entries simultaneously', () => {
    const result: GenerationResult = {
      success: [{ page_type: 'hauptseite', slug: 'hauptseite', rowId: 'row-1' }],
      failed: [{ page_type: 'faq', error_message: 'Timeout', attempt_count: 3 }],
    }

    expect(result.success).toHaveLength(1)
    expect(result.failed).toHaveLength(1)
  })
})
