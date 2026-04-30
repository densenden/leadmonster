// POST /api/admin/produkte/[id]/hero-image — generate or regenerate the hero image.
// Body: { prompt?, altText? } — both optional. If prompt is missing, the type-default is used.
// Updates produkte.hero_image_url + hero_image_alt and writes the URL into the
// hauptseite hero section if present.
import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateImage, defaultHeroPrompt } from '@/lib/openai/image-generator'

const bodySchema = z.object({
  prompt: z.string().min(8).max(2000).optional(),
  altText: z.string().min(2).max(200).optional(),
})

interface RouteContext {
  params: { id: string }
}

interface SectionLike {
  type: string
  [k: string]: unknown
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, name, typ')
    .eq('id', params.id)
    .single()

  if (!produkt) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  const prompt = parsed.data.prompt ?? defaultHeroPrompt(produkt.typ as string)
  const altText = parsed.data.altText ?? `Hauptbild ${produkt.name}`

  try {
    const out = await generateImage({
      prompt,
      slot: 'hero',
      altText,
      produktId: produkt.id,
      pageType: 'hauptseite',
    })

    await supabase
      .from('produkte')
      .update({ hero_image_url: out.url, hero_image_alt: altText })
      .eq('id', produkt.id)

    // Also push URL into the hauptseite hero section if it exists.
    const { data: hauptseiteRow } = await supabase
      .from('generierter_content')
      .select('id, content')
      .eq('produkt_id', produkt.id)
      .eq('page_type', 'hauptseite')
      .maybeSingle()

    if (hauptseiteRow) {
      const content = hauptseiteRow.content as { sections?: SectionLike[] } | null
      if (content?.sections) {
        const newSections = content.sections.map(s =>
          s.type === 'hero' ? { ...s, image_url: out.url, image_alt: altText } : s,
        )
        await supabase
          .from('generierter_content')
          .update({ content: { ...content, sections: newSections } as unknown as never })
          .eq('id', hauptseiteRow.id)
      }
    }

    return Response.json({ data: { url: out.url, alt: altText, prompt }, error: null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json(
      { data: null, error: { code: 'GENERATION_FAILED', message } },
      { status: 502 },
    )
  }
}
