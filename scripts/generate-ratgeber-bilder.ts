/**
 * Erzeugt pro publiziertem Ratgeber-Artikel ein eigenes Hero-Bild (gpt-image-1)
 * und speichert die URL als `cover_image_url` (+ `cover_image_alt`) in
 * generierter_content.content (top-level neben sections).
 *
 * Idempotent: Artikel mit bereits gesetzter cover_image_url werden übersprungen,
 * außer das Skript wird mit `--force` aufgerufen.
 *
 * Aufruf:
 *   npx tsx scripts/generate-ratgeber-bilder.ts [produkt_slug] [--force]
 *
 * Default-Slug: alle Ratgeber des Produkts mit slug=sterbegeld24plus.
 */
import 'dotenv/config'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { generateImage } from '../lib/openai/image-generator'
import { getBrandLook } from '../lib/openai/hero-prompt'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY müssen gesetzt sein.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const produktSlug = args.find(a => !a.startsWith('--')) ?? 'sterbegeld24plus'

interface RatgeberRow {
  id: string
  slug: string
  title: string
  meta_desc: string | null
  content: { sections?: unknown[]; cover_image_url?: string; cover_image_alt?: string } | null
}

interface ProduktRow {
  id: string
  typ: string
  name: string
}

function buildPrompt(typ: string, title: string, metaDesc: string | null): string {
  const look = getBrandLook(typ)
  // Bild-Konzept: ruhiges, narratives Editorial-Foto, das das Thema des
  // Ratgebers symbolisch fasst — KEINE Gesichter, KEIN Text.
  const themeHint = metaDesc
    ? `The article topic: "${title}". Theme summary: "${metaDesc.slice(0, 220)}"`
    : `The article topic: "${title}"`

  return (
    `Editorial storytelling photography illustrating a German lifestyle scene. ` +
    `${themeHint}. ` +
    `Color palette: ${look.palette}. Lighting: ${look.lighting}. ` +
    `Symbolic objects (choose one or two from): ${look.motifs}. ` +
    `Composition: blog-cover ratio, calm mood, magazine-feature feel, ` +
    `subject implied through hands, objects or back-views.`
  )
}

async function main() {
  // 1. Produkt-Slug auflösen
  const { data: produktData, error: produktErr } = await supabase
    .from('produkte')
    .select('id, typ, name')
    .eq('slug', produktSlug)
    .maybeSingle()

  if (produktErr || !produktData) {
    console.error(`Produkt mit slug="${produktSlug}" nicht gefunden:`, produktErr?.message)
    process.exit(1)
  }
  const produkt = produktData as unknown as ProduktRow

  // 2. Ratgeber-Artikel laden
  const { data: ratgeberData, error: ratgeberErr } = await supabase
    .from('generierter_content')
    .select('id, slug, title, meta_desc, content')
    .eq('produkt_id', produkt.id)
    .eq('page_type', 'ratgeber')
    .eq('status', 'publiziert')
    .order('slug', { ascending: true })

  if (ratgeberErr) {
    console.error('Ratgeber-Lookup fehlgeschlagen:', ratgeberErr.message)
    process.exit(1)
  }

  const ratgeber = (ratgeberData ?? []) as unknown as RatgeberRow[]
  console.log(
    `${produkt.name} (typ=${produkt.typ}) — ${ratgeber.length} publizierte Ratgeber gefunden.`,
  )

  let generated = 0
  let skipped = 0
  let failed = 0

  for (const r of ratgeber) {
    const existing = r.content?.cover_image_url
    if (existing && !FORCE) {
      console.log(`  • ${r.slug}: schon vorhanden (${existing.slice(0, 60)}…) — überspringe`)
      skipped++
      continue
    }

    const prompt = buildPrompt(produkt.typ, r.title, r.meta_desc)
    const altText = `Beitragsbild zu „${r.title}" — Sterbegeld24Plus Ratgeber`

    try {
      console.log(`  ▸ ${r.slug}: generiere Bild …`)
      const out = await generateImage({
        prompt,
        slot: 'blog_cover',
        altText,
        produktId: produkt.id,
        pageType: 'ratgeber',
        dryRun: false,
      })

      // cover_image_url + cover_image_alt in content jsonb mergen
      const nextContent = {
        ...(r.content ?? {}),
        cover_image_url: out.url,
        cover_image_alt: out.alt,
      }
      const { error: updateErr } = await supabase
        .from('generierter_content')
        .update({ content: nextContent })
        .eq('id', r.id)
      if (updateErr) {
        console.error(`    ✗ Update fehlgeschlagen: ${updateErr.message}`)
        failed++
        continue
      }
      console.log(`    ✓ gespeichert: ${out.url}`)
      generated++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    ✗ Fehler: ${msg}`)
      failed++
    }
  }

  console.log(
    `\nFertig: ${generated} generiert, ${skipped} übersprungen, ${failed} fehlgeschlagen.`,
  )
  if (failed > 0) process.exit(2)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
