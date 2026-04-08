// TypeScript type contracts for the AI content generation pipeline.
// These interfaces describe the per-page-type success/error result shape
// returned by generateContent so callers can surface partial failures.

export type PageType = 'hauptseite' | 'faq' | 'vergleich' | 'tarif' | 'ratgeber'

export interface PageTypeResult {
  page_type: PageType
  slug: string
  rowId: string
}

export interface PageTypeError {
  page_type: PageType
  slug?: string
  error_message: string
  attempt_count: number
}

// GenerationResult is the return value of generateContent — it always resolves
// and never throws. Both arrays may be populated when some page types succeed
// while others fail (partial-failure mode).
export interface GenerationResult {
  success: PageTypeResult[]
  failed: PageTypeError[]
}
