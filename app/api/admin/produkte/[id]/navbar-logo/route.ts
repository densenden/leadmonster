/**
 * Navbar logo upload API.
 *
 * POST   — multipart "file" → Storage bucket produkt-navbar-logos
 * DELETE — clears navbar_logo_url + navbar_logo_alt
 */
import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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
  const ext =
    file.type === 'image/png' ? 'png'
    : file.type === 'image/webp' ? 'webp'
    : file.type === 'image/svg+xml' ? 'svg'
    : 'jpg'
  const path = `${produkt.slug}/navbar-${Date.now()}.${ext}`
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
  const logoUrl = pub.publicUrl
  const logoAlt = altText || produkt.name

  const { error: updateError } = await supabase
    .from('produkte')
    .update({ navbar_logo_url: logoUrl, navbar_logo_alt: logoAlt })
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

  return Response.json({
    data: { navbar_logo_url: logoUrl, navbar_logo_alt: logoAlt },
    error: null,
  })
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
  }

  return Response.json({ data: { ok: true }, error: null })
}
