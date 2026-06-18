// Foto-Upload für Autoren-Profile.
// POST multipart/form-data → Sharp → WebP 600×600 → Upload "redaktion-fotos/<slug>.webp"
// Recompute schema_person + Update redaktion-Row.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { toSquareWebp } from '@/lib/images/process'
import { buildSchemaPerson } from '@/lib/redaktion/schema-person'
import { revalidateRedaktionDependents } from '@/lib/redaktion/revalidate'
import { requireAdminUser } from '@/lib/supabase/require-admin'

const BUCKET = 'redaktion-fotos'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://finanzteam26.de'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdminUser()
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const supabase = createAdminClient()

  const id = params.id
  if (!id) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })

  const { data: autor, error: fetchError } = await supabase
    .from('redaktion')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError || !autor) return NextResponse.json({ error: 'Autor nicht gefunden' }, { status: 404 })

  const form = await request.formData()
  const file = form.get('foto') as File | null
  if (!file) return NextResponse.json({ error: 'Datei "foto" fehlt' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto darf maximal 8 MB groß sein.' }, { status: 400 })
  }

  let processed
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    processed = await toSquareWebp(buf, { size: 600, maxKB: 200 })
  } catch (err) {
    return NextResponse.json({
      error: `Bildverarbeitung fehlgeschlagen: ${err instanceof Error ? err.message : err}`,
    }, { status: 422 })
  }

  const path = `${autor.slug}.webp`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, processed.buffer, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '604800',
    })
  if (uploadError) {
    return NextResponse.json({ error: `Upload-Fehler: ${uploadError.message}` }, { status: 500 })
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  // Cache-Buster gegen CDN-/Browser-Cache (Slug-Pfad bleibt stabil)
  const url = `${pub.publicUrl}?v=${Date.now()}`
  const fotoAlt = autor.foto_alt ?? `Portraitfoto ${autor.vorname} ${autor.nachname}`

  const { error: updateError } = await supabase
    .from('redaktion')
    .update({
      foto_url: url,
      foto_alt: fotoAlt,
      schema_person: buildSchemaPerson({ ...autor, foto_url: url }, BASE_URL) as unknown as Json,
    })
    .eq('id', id)
  if (updateError) {
    return NextResponse.json({ error: `DB-Update: ${updateError.message}` }, { status: 500 })
  }

  await revalidateRedaktionDependents(id, autor.slug)

  return NextResponse.json({
    ok: true,
    url,
    bytes: processed.bytes,
    width: processed.width,
    height: processed.height,
  })
}
