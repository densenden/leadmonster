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
      rows.push({
        slug,
        kategorie: (meta.kategorie as string) || kat,
        thema: (meta.thema as string) || slug,
        inhalt: body.trim(),
        tags: (meta.tags as string[]) || [],
        link_phrases: (meta.link_phrases as string[]) || [],
        published: meta.published !== false,
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

  for (const row of rows) {
    const { error } = await supabase
      .from('wissensfundus')
      .upsert(row, { onConflict: 'slug' })
    if (error) {
      console.error(`❌  ${row.slug}:`, error.message)
    } else {
      console.log(`✅  ${row.kategorie}/${row.slug}`)
    }
  }
  console.log('🎉 fertig')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
