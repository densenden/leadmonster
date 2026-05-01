/**
 * Importiert Christian Wimmers Pressefoto von sterbegeld24plus.de
 * → Sharp Crop 1:1 + WebP 600×600 (≤200 KB)
 * → Upload nach Bucket "redaktion-fotos/<slug>.webp"
 * → Update `redaktion.foto_url` + `schema_person`
 *
 * Verwendung:
 *   npx tsx scripts/import-redaktion-foto.ts
 *   npx tsx scripts/import-redaktion-foto.ts --slug=christian-wimmer --src=https://...
 *
 * Idempotent: überschreibt bei jedem Lauf.
 */
import { createClient } from '@supabase/supabase-js'
import { toSquareWebp } from '../lib/images/process'
import { buildSchemaPerson } from '../lib/redaktion/schema-person'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.sterbegeld24plus.de'

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY müssen in .env.local gesetzt sein.')
  process.exit(1)
}

const BUCKET = 'redaktion-fotos'

interface ImportArgs {
  slug: string
  src: string
}

function parseArgs(): ImportArgs {
  const args: Record<string, string> = {}
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.+)$/)
    if (m) args[m[1]] = m[2]
  }
  return {
    slug: args.slug ?? 'christian-wimmer',
    src: args.src ?? 'https://www.sterbegeld24plus.de/wp-content/uploads/2023/12/foto_kontakt_web_small.jpg',
  }
}

async function main() {
  const { slug, src } = parseArgs()
  console.log(`→ Lade Foto für ${slug} von ${src} …`)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { persistSession: false },
  })

  // 1) Quell-Bild fetchen
  const res = await fetch(src, {
    headers: { 'User-Agent': 'Mozilla/5.0 LeadMonster Foto-Import' },
  })
  if (!res.ok) {
    console.error(`✗ Fetch fehlgeschlagen: ${res.status} ${res.statusText}`)
    process.exit(1)
  }
  const srcBuffer = Buffer.from(await res.arrayBuffer())
  console.log(`  ✓ Source-Bytes: ${srcBuffer.length}`)

  // 2) Sharp-Pipeline
  const processed = await toSquareWebp(srcBuffer, { size: 600, maxKB: 200 })
  console.log(`  ✓ Processed: ${processed.width}×${processed.height} WebP, ${(processed.bytes / 1024).toFixed(1)} KB`)

  // 3) Upload in Storage
  const path = `${slug}.webp`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, processed.buffer, {
      contentType: 'image/webp',
      upsert: true,
      cacheControl: '604800', // 7 days
    })
  if (uploadError) {
    console.error('✗ Upload fehlgeschlagen:', uploadError.message)
    process.exit(1)
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  console.log(`  ✓ Public URL: ${pub.publicUrl}`)

  // 4) Update redaktion-Row + schema_person
  const { data: existing, error: fetchError } = await supabase
    .from('redaktion')
    .select('*')
    .eq('slug', slug)
    .single()

  if (fetchError || !existing) {
    console.error(`✗ Redaktion mit slug "${slug}" nicht gefunden. Erst seed-redaktion.ts laufen lassen.`)
    process.exit(1)
  }

  const updated = {
    ...existing,
    foto_url: pub.publicUrl,
    foto_alt: existing.foto_alt ?? `Portraitfoto ${existing.vorname} ${existing.nachname}`,
  }

  const { error: updateError } = await supabase
    .from('redaktion')
    .update({
      foto_url: updated.foto_url,
      foto_alt: updated.foto_alt,
      schema_person: buildSchemaPerson(updated, BASE_URL),
    })
    .eq('id', existing.id)

  if (updateError) {
    console.error('✗ Redaktion-Update fehlgeschlagen:', updateError.message)
    process.exit(1)
  }

  console.log(`✓ ${slug}: foto_url + schema_person aktualisiert.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
