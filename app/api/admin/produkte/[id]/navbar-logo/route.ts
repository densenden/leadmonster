/**
 * Navbar logo upload API.
 *
 * POST   — multipart "file" → Storage bucket produkt-navbar-logos
 *         also sets navbar_logo_visible=true (upload without show was a common bug)
 * PATCH  — JSON { visible: boolean } → toggle navbar_logo_visible
 * DELETE — clears navbar_logo_url + navbar_logo_alt
 */
import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NotSquareImageError, prepareSquareIcon } from '@/lib/branding/prepare-square-icon'

const BUCKET = 'produkt-navbar-logos'
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

interface RouteContext {
  params: { id: string }
}

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  let file: File | null = null
  let altText = ''
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (f instanceof File) file = f
    altText = String(form.get('alt') ?? '').trim()
  } catch {
    return Response.json({ data: null, error: { code: 'INVALID_FORM' } }, { status: 400 })
  }

  if (!file) {
    return Response.json({ data: null, error: { code: 'NO_FILE' } }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { data: null, error: { code: 'FILE_TOO_LARGE', message: 'Maximal 2 MB.' } },
      { status: 413 },
    )
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return Response.json(
      { data: null, error: { code: 'UNSUPPORTED_MIME', message: 'PNG, JPG, WebP oder SVG erlaubt.' } },
      { status: 415 },
    )
  }

  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug, name')
    .eq('id', params.id)
    .maybeSingle()
  if (!produkt) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  await ensureBucket(supabase)
  const raw = Buffer.from(await file.arrayBuffer())

  let prepared: { buffer: Buffer; contentType: string; ext: string }
  try {
    // Must be square 1:1 — wide wordmarks are not allowed as product icons.
    prepared = await prepareSquareIcon(raw, file.type)
  } catch (err) {
    if (err instanceof NotSquareImageError) {
      return Response.json(
        { data: null, error: { code: 'NOT_SQUARE', message: err.message } },
        { status: 400 },
      )
    }
    throw err
  }

  const path = `${produkt.slug}/navbar-${Date.now()}.${prepared.ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, prepared.buffer, { contentType: prepared.contentType, upsert: true })
  if (uploadError) {
    return Response.json(
      { data: null, error: { code: 'UPLOAD_FAILED', message: uploadError.message } },
      { status: 500 },
    )
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const logoUrl = pub.publicUrl
  const logoAlt = altText || produkt.name

  const { error: updateError } = await supabase
    .from('produkte')
    .update({
      navbar_logo_url: logoUrl,
      navbar_logo_alt: logoAlt,
      // Upload means "show this logo" — otherwise admin preview shows it but public page hides it.
      navbar_logo_visible: true,
    })
    .eq('id', params.id)
  if (updateError) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR', message: updateError.message } },
      { status: 500 },
    )
  }

  revalidatePath(`/admin/produkte/${params.id}`)
  revalidatePath(`/${produkt.slug}`)
  revalidatePath('/')
  revalidatePath(`/api/produkte/${produkt.slug}/icon`)

  return Response.json({
    data: {
      navbar_logo_url: logoUrl,
      navbar_logo_alt: logoAlt,
      navbar_logo_visible: true,
    },
    error: null,
  })
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  let visible: boolean | undefined
  try {
    const body = await request.json()
    if (typeof body?.visible === 'boolean') visible = body.visible
  } catch {
    return Response.json({ data: null, error: { code: 'INVALID_JSON' } }, { status: 400 })
  }
  if (visible === undefined) {
    return Response.json(
      { data: null, error: { code: 'INVALID_BODY', message: 'Expected { visible: boolean }.' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, slug')
    .eq('id', params.id)
    .maybeSingle()
  if (!produkt) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  const { error } = await supabase
    .from('produkte')
    .update({ navbar_logo_visible: visible })
    .eq('id', params.id)
  if (error) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  revalidatePath(`/admin/produkte/${params.id}`)
  revalidatePath(`/${produkt.slug}`)
  revalidatePath('/')
  revalidatePath(`/api/produkte/${produkt.slug}/icon`)

  return Response.json({ data: { navbar_logo_visible: visible }, error: null })
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })

  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('slug')
    .eq('id', params.id)
    .maybeSingle()

  const { error } = await supabase
    .from('produkte')
    .update({ navbar_logo_url: null, navbar_logo_alt: null })
    .eq('id', params.id)

  if (error) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  revalidatePath(`/admin/produkte/${params.id}`)
  if (produkt?.slug) {
    revalidatePath(`/${produkt.slug}`)
    revalidatePath('/')
    revalidatePath(`/api/produkte/${produkt.slug}/icon`)
  }

  return Response.json({ data: { ok: true }, error: null })
}
