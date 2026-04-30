// POST /api/generate — triggers AI content generation for a product.
// Auth-guarded; responds with HTTP 200/207/500 based on generation outcome.
// Handles full product generation (all page types) or single ratgeber article generation.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateContent } from '@/lib/anthropic/generator'

// Anthropic Claude Opus full-product generation can take 90–180s.
// Default Vercel function timeout is 60s; we extend to 300s (Pro plan max).
export const maxDuration = 300

// Extend validation to support pageType-specific generation.
// topic is optional and only used when pageType = 'ratgeber'.
const bodySchema = z.object({
  produktId: z.string().uuid(),
  pageType: z.enum(['hauptseite', 'faq', 'vergleich', 'tarif', 'ratgeber']).optional(),
  topic: z.string().min(3).max(100).optional(),
})

export async function POST(request: NextRequest) {
  // Auth check — verify a valid Supabase session using the server client.
  // getUser() validates the JWT against the Supabase auth server (safer than getSession()).
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json(
      {
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Authentifizierung erforderlich' },
      },
      { status: 401 },
    )
  }

  // Parse and validate the request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      { status: 400 },
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'produktId must be a valid UUID',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    )
  }

  const { produktId, pageType, topic } = parsed.data

  // -------------------------------------------------------------------------
  // Single ratgeber article generation — when pageType = 'ratgeber' is given
  // -------------------------------------------------------------------------
  if (pageType === 'ratgeber') {
    try {
      const result = await generateContent(produktId, topic)

      // Find the new ratgeber row in the success results
      const ratgeberResult = result.success.find(r => r.page_type === 'ratgeber')

      if (!ratgeberResult && result.failed.length > 0) {
        const firstError = result.failed[0]
        return Response.json(
          {
            data: null,
            error: {
              code: 'GENERATION_FAILED',
              message: firstError.error_message ?? 'Ratgeber konnte nicht generiert werden',
            },
          },
          { status: 500 },
        )
      }

      return Response.json(
        {
          data: {
            id: ratgeberResult?.rowId ?? null,
            slug: ratgeberResult?.slug ?? topic ?? null,
          },
          error: null,
        },
        { status: 201 },
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler bei der Generierung'
      return Response.json(
        { data: null, error: { code: 'GENERATION_FAILED', message } },
        { status: 500 },
      )
    }
  }

  // -------------------------------------------------------------------------
  // Full product generation — all page types (no pageType given)
  // -------------------------------------------------------------------------
  const result = await generateContent(produktId)
  const generatedCount = result.success.length

  // All page types succeeded
  if (result.failed.length === 0) {
    return Response.json(
      { data: { generatedCount, errors: [] }, error: null },
      { status: 200 },
    )
  }

  // Partial success — some page types failed, some succeeded
  if (result.success.length > 0) {
    return Response.json(
      { data: { generatedCount, errors: result.failed }, error: null },
      { status: 207 },
    )
  }

  // All page types failed — surface the first underlying error so the
  // operator can act on it (rate-limit, billing, schema mismatch, etc).
  const firstFailure = result.failed[0]
  const firstMessage = firstFailure?.error_message ?? 'unknown'
  return Response.json(
    {
      data: null,
      error: {
        code: 'GENERATION_FAILED',
        message: `Alle Seitentypen fehlgeschlagen. Erster Fehler: ${firstMessage}`,
        details: result.failed,
      },
    },
    { status: 500 },
  )
}
