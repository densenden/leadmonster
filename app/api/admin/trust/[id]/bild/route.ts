// Bild-Upload für Trust-Bausteine (Logo / Siegel / Foto).
// Logos werden NICHT zwangs-cropped — wir konvertieren in WebP, wenn raster, und
// nehmen SVG roh. So bleibt das transparente Logo-Format intakt.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import sharp from 'sharp'
import { revalidatePath } from 'next/cache'

const BUCKET = 'trust-assets'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const { data: baustein } = await supabase
    .from('trust_baustein')
    .select('id, slug, typ')
    .eq('id', params.id)
    .single()
  if (!baustein) return NextResponse.json({ error: 'Trust-Baustein nicht gefunden' }, { status: 404 })

  const form = await request.formData()
  const file = form.get('bild') as File | null
  if (!file) return NextResponse.json({ error: 'Datei "bild" fehlt' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Bild darf maximal 5 MB groß sein.' }, { status: 400 })
  }

  const isSvg = file.type === 'image/svg+xml'
  const srcBuffer = Buffer.from(await file.arrayBuffer())

  let outBuffer: Buffer
  let contentType: string
  let extension: string
  if (isSvg) {
    outBuffer = srcBuffer
    contentType = 'image/svg+xml'
    extension = 'svg'
  } else {
    // Logos: kein Crop, nur Resize-Cap auf 800px Seitenlänge + WebP.
    outBuffer = await sharp(srcBuffer)
      .rotate()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer()
    contentType = 'image/webp'
    extension = 'webp'
  }

  const path = `${baustein.slug}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, outBuffer, { contentType, upsert: true, cacheControl: '604800' })
  if (uploadError) {
    return NextResponse.json({ error: `Upload-Fehler: ${uploadError.message}` }, { status: 500 })
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const url = `${pub.publicUrl}?v=${Date.now()}`

  await supabase.from('trust_baustein').update({ bild_url: url }).eq('id', params.id)
  revalidatePath('/admin/trust')
  return NextResponse.json({ ok: true, url })
}
