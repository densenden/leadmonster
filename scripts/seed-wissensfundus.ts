/**
 * Seed-Skript: synchronisiert die Markdown-Dateien aus dem Ordner
 * `wissensfundus-seeds` (rekursiv) in die DB-Tabelle `wissensfundus`.
 *
 * Aufruf:
 *   npx tsx scripts/seed-wissensfundus.ts
 *   npx tsx scripts/seed-wissensfundus.ts --kategorie=pflege   (nur eine Kategorie)
 *
 * Frontmatter-Schema (siehe wissensfundus-seeds/README.md):
 *   ---
 *   slug: ...
 *   kategorie: ...
 *   thema: ...
 *   tags: [...]
 *   link_phrases: [...]
 *   published: true
 *   ---
 *
 * Idempotent — upsert nach slug.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadDotenv({ path: '.env.local' })

const SEEDS_DIR = join(process.cwd(), 'wissensfundus-seeds')

// Sehr einfacher YAML-Frontmatter-Parser. Externe Bibliothek wäre hier Overkill.
function parseFrontmatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { meta: {}, body: raw }
  const meta: Record<string, unknown> = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    let value: string = line.slice(idx + 1).trim()
    // Arrays in der Form ['a', 'b'] oder [a, b]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim()
      meta[key] = inner
        ? inner
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
        : []
      continue
    }
    if (value === 'true' || value === 'false') {
      meta[key] = value === 'true'
      continue
    }
    // Strings ggf. ohne Quotes
    meta[key] = value.replace(/^['"]|['"]$/g, '')
  }
  return { meta, body: m[2] }
}

interface SeedRow {
  slug: string
  kategorie: string
  thema: string
  inhalt: string
  tags: string[]
  link_phrases: string[]
  published: boolean
  wortzahl: number
  autor_id?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  next_review_at?: string | null
}

function countWords(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_~`\-|]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

function collectSeeds(filterKategorie?: string): SeedRow[] {
  const rows: SeedRow[] = []
  const kategorien = readdirSync(SEEDS_DIR).filter(name => {
    const p = join(SEEDS_DIR, name)
    return statSync(p).isDirectory() && (!filterKategorie || name === filterKategorie)
  })

  for (const kat of kategorien) {
    const dir = join(SEEDS_DIR, kat)
    const files = readdirSync(dir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const raw = readFileSync(join(dir, file), 'utf-8')
      const { meta, body } = parseFrontmatter(raw)
      const slug = (meta.slug as string) || basename(file, '.md')
      const inhalt = body.trim()
      rows.push({
        slug,
        kategorie: (meta.kategorie as string) || kat,
        thema: (meta.thema as string) || slug,
        inhalt,
        tags: (meta.tags as string[]) || [],
        link_phrases: (meta.link_phrases as string[]) || [],
        published: meta.published !== false,
        wortzahl: countWords(inhalt),
      })
    }
  }
  return rows
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY müssen gesetzt sein')
  }

  const arg = process.argv.find(a => a.startsWith('--kategorie='))
  const filter = arg ? arg.split('=')[1] : undefined

  const rows = collectSeeds(filter)
  console.log(`📚 ${rows.length} Wissensfundus-Einträge gefunden${filter ? ` (Filter: ${filter})` : ''}`)

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Default-Author + Cadence aus DB ziehen
  const { data: christian } = await supabase
    .from('redaktion')
    .select('id')
    .eq('slug', 'christian-wimmer')
    .maybeSingle()
  const autorId = christian?.id ?? null
  const { data: cadence } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'redaktion_review_intervall_tage')
    .maybeSingle()
  const days = Number(cadence?.wert ?? '180') || 180
  const now = new Date()
  const reviewedAt = now.toISOString()
  const nextReviewAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

  let okCount = 0
  let warnCount = 0
  for (const row of rows) {
    const enriched: SeedRow = {
      ...row,
      autor_id: autorId,
      reviewed_by: autorId,
      reviewed_at: reviewedAt,
      next_review_at: nextReviewAt,
    }
    const { error } = await supabase
      .from('wissensfundus')
      .upsert(enriched, { onConflict: 'slug' })
    if (error) {
      console.error(`❌  ${row.slug}:`, error.message)
    } else {
      okCount++
      const flag = row.wortzahl < 800 && row.published ? '⚠️ <800 Wörter' : ''
      if (flag) warnCount++
      console.log(`✅  ${row.kategorie}/${row.slug} (${row.wortzahl} W) ${flag}`)
    }
  }
  console.log(`🎉 ${okCount}/${rows.length} okay, ${warnCount} unter SEO-Mindestlänge`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
