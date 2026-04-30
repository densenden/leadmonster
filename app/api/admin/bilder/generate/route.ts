// POST /api/admin/bilder/generate — manually trigger image generation
// Body: { prompt, slot, altText, produktId?, blogPostId?, pageType? }
import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateImage, type ImageSlot } from '@/lib/openai/image-generator'

const SLOTS = ['hero', 'feature', 'inline', 'og', 'blog_cover'] as const

const bodySchema = z.object({
  prompt: z.string().min(8).max(2000),
  slot: z.enum(SLOTS),
  altText: z.string().min(2).max(200),
  produktId: z.string().uuid().optional(),
  blogPostId: z.string().uuid().optional(),
  pageType: z.string().max(40).optional(),
})

export async function POST(request: NextRequest) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ data: null, error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
      { status: 422 },
    )
  }

  try {
    const out = await generateImage({
      prompt: parsed.data.prompt,
      slot: parsed.data.slot as ImageSlot,
      altText: parsed.data.altText,
      produktId: parsed.data.produktId,
      blogPostId: parsed.data.blogPostId,
      pageType: parsed.data.pageType,
    })
    return Response.json({ data: out, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json(
      { data: null, error: { code: 'GENERATION_FAILED', message } },
      { status: 502 },
    )
  }
}
