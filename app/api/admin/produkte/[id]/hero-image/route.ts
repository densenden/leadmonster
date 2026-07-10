// POST /api/admin/produkte/[id]/hero-image — generate or regenerate the hero image.
// Body: { prompt?, altText? } — both optional. If prompt is missing, the type-default is used.
// Updates produkte.hero_image_url + hero_image_alt and writes the URL into the
// hauptseite hero section if present.
import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/openai/image-generator'
import { buildHeroPrompt } from '@/lib/openai/hero-prompt'
import { mergeStyleDescriptionIntoPrompt } from '@/lib/openai/style-reference'
import { applyHeroImageToProdukt } from '@/lib/admin/apply-hero-image'

const bodySchema = z.object({
  prompt: z.string().min(8).max(2000).optional(),
  altText: z.string().min(2).max(200).optional(),
})

const patchSchema = z.object({
  bildId: z.string().uuid(),
  altText: z.string().min(2).max(200).optional(),
})

interface RouteContext {
  params: { id: string }
}

async function revalidateProduktPaths(supabase: ReturnType<typeof createAdminClient>, produktId: string) {
  const { data: produkt } = await supabase
    .from('produkte')
    .select('slug')
    .eq('id', produktId)
    .maybeSingle()

  revalidatePath(`/admin/produkte/${produktId}`)
  if (produkt?.slug) {
    revalidatePath(`/${produkt.slug}`)
    revalidatePath('/')
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: authData } = await sessionClient.auth.getUser()
  if (!authData.user) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors } },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, name')
    .eq('id', params.id)
    .maybeSingle()

  if (!produkt) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  const { data: bild } = await supabase
    .from('bilder')
    .select('id, url, alt_text')
    .eq('id', parsed.data.bildId)
    .maybeSingle()

  if (!bild?.url) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND', message: 'Bild nicht gefunden' } }, { status: 404 })
  }

  const altText = parsed.data.altText?.trim() || bild.alt_text || `Hauptbild ${produkt.name}`

  try {
    await applyHeroImageToProdukt(supabase, produkt.id, bild.url, altText)
    await revalidateProduktPaths(supabase, produkt.id)

    return Response.json({
      data: { url: bild.url, altText, bildId: bild.id },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json(
      { data: null, error: { code: 'UPDATE_FAILED', message } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: authData } = await sessionClient.auth.getUser()
  if (!authData.user) {
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
    .select('id, name, typ, style_description')
    .eq('id', params.id)
    .single()

  if (!produkt) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  // style_description vom Style-Reference-Upload — wird IMMER an den Prompt
  // angehängt (auch wenn der User einen eigenen prompt liefert), damit alle
  // Produkt-Bilder denselben Look haben.
  const styleDescription = (produkt as { style_description?: string | null }).style_description ?? null

  let prompt = parsed.data.prompt
  let styleReferenceApplied = false

  if (!prompt) {
    const { data: configRow } = await supabase
      .from('produkt_config')
      .select('zielgruppe, fokus, anbieter, argumente')
      .eq('produkt_id', produkt.id)
      .maybeSingle()
    prompt = buildHeroPrompt(produkt.typ as string, {
      zielgruppe: configRow?.zielgruppe ?? null,
      fokus: configRow?.fokus ?? null,
      anbieter: configRow?.anbieter ?? null,
      argumente:
        configRow?.argumente != null &&
        typeof configRow.argumente === 'object' &&
        !Array.isArray(configRow.argumente)
          ? (configRow.argumente as Record<string, string>)
          : null,
      styleDescription,
    })
    styleReferenceApplied = Boolean(styleDescription?.trim())
  } else {
    const merged = mergeStyleDescriptionIntoPrompt(prompt, styleDescription)
    prompt = merged.prompt
    styleReferenceApplied = merged.styleReferenceApplied
  }
  const altText = parsed.data.altText ?? `Hauptbild ${produkt.name}`

  try {
    const out = await generateImage({
      prompt,
      slot: 'hero',
      altText,
      produktId: produkt.id,
      pageType: 'hauptseite',
    })

    await applyHeroImageToProdukt(supabase, produkt.id, out.url, altText)
    await revalidateProduktPaths(supabase, produkt.id)

    return Response.json({
      data: {
        url: out.url,
        alt: altText,
        prompt,
        styleReferenceApplied,
        styleDescriptionUsed: styleDescription?.trim() ?? null,
        promptSent: prompt,
      },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return Response.json(
      { data: null, error: { code: 'GENERATION_FAILED', message } },
      { status: 502 },
    )
  }
}
