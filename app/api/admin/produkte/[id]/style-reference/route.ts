/**
 * Style-Reference-API für Produkte.
 *
 * POST   — Upload eines Beispiel-Bildes pro Produkt.
 *          Body: multipart/form-data mit field "file".
 *          Speichert das Bild in Storage (Bucket "produkt-style-references"),
 *          ruft Vision-Analyse, schreibt URL + style_description in produkte-Row.
 *
 * DELETE — Style-Reference entfernen (URL + Beschreibung beide auf NULL).
 *
 * GET    — Aktuellen Status zurück (URL + Beschreibung).
 */
import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { describeImageStyle } from '@/lib/openai/vision-style'

const BUCKET = 'produkt-style-references'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

interface RouteContext {
  params: { id: string }
}

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }
}

// ---------------------------------------------------------------------------
// GET — Status
// ---------------------------------------------------------------------------

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('produkte')
    .select('style_reference_url, style_description')
    .eq('id', params.id)
    .maybeSingle()

  if (!data) return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  return Response.json({ data, error: null })
}

// ---------------------------------------------------------------------------
// POST — Upload + Vision-Analyse
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  let file: File | null = null
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (f instanceof File) file = f
  } catch {
    return Response.json({ data: null, error: { code: 'INVALID_FORM' } }, { status: 400 })
  }

  if (!file) {
    return Response.json({ data: null, error: { code: 'NO_FILE' } }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { data: null, error: { code: 'FILE_TOO_LARGE', message: 'Maximal 10 MB.' } },
      { status: 413 },
    )
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return Response.json(
      { data: null, error: { code: 'UNSUPPORTED_MIME', message: 'PNG, JPG oder WebP erlaubt.' } },
      { status: 415 },
    )
  }

  const supabase = createAdminClient()

  // Produkt prüfen
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug')
    .eq('id', params.id)
    .maybeSingle()
  if (!produkt) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  // Upload
  await ensureBucket(supabase)
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${(produkt as { slug?: string }).slug ?? params.id}/style-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadError) {
    return Response.json(
      { data: null, error: { code: 'UPLOAD_FAILED', message: uploadError.message } },
      { status: 500 },
    )
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const styleUrl = pub.publicUrl

  // Vision-Analyse — non-fatal: wenn fehlschlägt, behalten wir die URL,
  // style_description bleibt unverändert. UI kann später manuell triggern.
  let styleDescription: string | null = null
  let visionError: string | null = null
  try {
    const result = await describeImageStyle(styleUrl)
    styleDescription = result.description
  } catch (err) {
    visionError = err instanceof Error ? err.message : String(err)
    console.warn(`[style-reference] Vision-Analyse fehlgeschlagen produkt=${params.id}:`, visionError)
  }

  const updatePayload: { style_reference_url: string; style_description?: string | null } = {
    style_reference_url: styleUrl,
  }
  if (styleDescription) updatePayload.style_description = styleDescription

  const { error: updateError } = await supabase
    .from('produkte')
    .update(updatePayload)
    .eq('id', params.id)
  if (updateError) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR', message: updateError.message } },
      { status: 500 },
    )
  }

  // ISR-Revalidation für Admin-Page
  revalidatePath(`/admin/produkte/${params.id}`)
  revalidatePath(`/admin/produkte/${params.id}/content`)

  return Response.json({
    data: {
      style_reference_url: styleUrl,
      style_description: styleDescription,
      vision_error: visionError,
    },
    error: null,
  })
}

// ---------------------------------------------------------------------------
// DELETE — Style-Reference entfernen
// ---------------------------------------------------------------------------

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('produkte')
    .update({ style_reference_url: null, style_description: null })
    .eq('id', params.id)

  if (error) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  revalidatePath(`/admin/produkte/${params.id}`)
  revalidatePath(`/admin/produkte/${params.id}/content`)
  return Response.json({ data: { ok: true }, error: null })
}
