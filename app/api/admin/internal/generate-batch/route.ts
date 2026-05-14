// POST /api/admin/internal/generate-batch — Internal-Secret-protected batch
// trigger for `generateContent(produktId, topic)`. Designed to be called from
// CLI scripts (`scripts/generate-sterbegeld-ratgeber-batch.ts`) which cannot
// hold a Supabase auth session.
//
// Auth: Header `X-Internal-Secret` must match `process.env.INTERNAL_SECRET`.
// Body: { produktId: uuid, topics: string[] }
// Response: per topic { topic, status: 'success' | 'failed', rowId?, error? }
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { generateContent } from '@/lib/anthropic/generator'

// Long: generator can take 30-90s per topic; 20 topics ≈ 30 min. We cap the
// Vercel function timeout at the Pro max — fortgeschrittene Iterationen sollten
// stattdessen pro Topic einen Einzel-Call machen.
export const maxDuration = 300

const bodySchema = z.object({
  produktId: z.string().uuid(),
  topics: z.array(z.string().min(3).max(100)).min(1).max(50),
})

export async function POST(request: NextRequest) {
  const provided = request.headers.get('x-internal-secret')
  const expected = process.env.INTERNAL_SECRET
  if (!expected || !provided || provided !== expected) {
    return Response.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'INTERNAL_SECRET mismatch' } },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { code: 'INVALID_JSON' } },
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
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    )
  }

  const results: Array<{
    topic: string
    status: 'success' | 'failed'
    rowId?: string
    error?: string
  }> = []

  for (const topic of parsed.data.topics) {
    try {
      const result = await generateContent(parsed.data.produktId, topic)
      if (result.success.length > 0) {
        results.push({ topic, status: 'success', rowId: result.success[0].rowId })
      } else {
        results.push({
          topic,
          status: 'failed',
          error: result.failed[0]?.error_message ?? 'unknown',
        })
      }
    } catch (err) {
      results.push({
        topic,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const successCount = results.filter(r => r.status === 'success').length
  return Response.json(
    {
      data: { results, success_count: successCount, total: results.length },
      error: null,
    },
    { status: successCount === results.length ? 200 : 207 },
  )
}
