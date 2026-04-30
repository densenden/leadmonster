/**
 * Seed-All — seedt VergleichsRechner-Tarife für alle Produkte, deren CSV
 * in `vergleich-tarife-seeds/` vorliegt UND deren Slug in der DB existiert.
 *
 * Reihenfolge:
 *   1. Liste aller `.csv`-Files im seeds-Ordner.
 *   2. Pro CSV: Produkt-Slug-Lookup (CSV-Dateiname = Slug-Stamm).
 *   3. Wenn passendes Produkt aktiv → seed-vergleich-tarife.ts ausführen.
 *
 * Aufruf:
 *   npx tsx scripts/seed-all-vergleich-tarife.ts
 *
 * Idempotent: Mehrfach-Aufrufe schreiben dieselben Daten ohne Duplikate.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { spawnSync } from 'child_process'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local gesetzt sein.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SEEDS_DIR = path.resolve(process.cwd(), 'vergleich-tarife-seeds')

// CSV-Dateiname-Stamm → mögliche Produkt-Slugs (alphabetisch geordnet, das
// erste passende Produkt in der DB gewinnt).
const SLUG_CANDIDATES: Record<string, string[]> = {
  sterbegeld: ['sterbegeld24plus', 'sterbegeld'],
  pflege: ['pflegezusatz', 'pflege'],
  leben: ['risikoleben', 'leben'],
  bu: ['berufsunfaehigkeit', 'bu'],
  unfall: ['unfall'],
}

async function findProduktSlug(stem: string): Promise<string | null> {
  const candidates = SLUG_CANDIDATES[stem] ?? [stem]
  const { data } = await supabase
    .from('produkte')
    .select('slug')
    .in('slug', candidates)

  if (!data || data.length === 0) return null
  // Nimm den ersten Kandidaten in der vorgegebenen Reihenfolge, der existiert.
  const slugs = new Set(data.map(r => r.slug))
  for (const c of candidates) {
    if (slugs.has(c)) return c
  }
  return null
}

async function main() {
  if (!fs.existsSync(SEEDS_DIR)) {
    console.error(`Seeds-Ordner fehlt: ${SEEDS_DIR}`)
    process.exit(1)
  }

  const csvFiles = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.csv'))
  if (csvFiles.length === 0) {
    console.error(`Keine .csv-Files in ${SEEDS_DIR}`)
    process.exit(1)
  }

  console.log(`Gefundene CSV-Dateien: ${csvFiles.join(', ')}`)

  const summary: Array<{ csv: string; slug: string | null; status: string }> = []

  for (const csv of csvFiles) {
    const stem = path.basename(csv, '.csv')
    const slug = await findProduktSlug(stem)

    if (!slug) {
      console.warn(`  ⚠ ${csv}: Kein passendes Produkt in DB (Kandidaten: ${SLUG_CANDIDATES[stem]?.join(', ') ?? stem}). Überspringe.`)
      summary.push({ csv, slug: null, status: 'kein_produkt' })
      continue
    }

    console.log(`\n→ Seed ${csv} → Produkt "${slug}"`)
    const csvPath = path.join(SEEDS_DIR, csv)
    const result = spawnSync(
      'npx',
      ['tsx', 'scripts/seed-vergleich-tarife.ts', slug, csvPath],
      { stdio: 'inherit', cwd: process.cwd() },
    )

    if (result.status !== 0) {
      console.error(`  ✗ ${csv}: Seed fehlgeschlagen (Exit ${result.status})`)
      summary.push({ csv, slug, status: 'fehlgeschlagen' })
    } else {
      summary.push({ csv, slug, status: 'ok' })
    }
  }

  console.log('\n═══ Zusammenfassung ═══')
  for (const s of summary) {
    const icon = s.status === 'ok' ? '✓' : s.status === 'kein_produkt' ? '⊘' : '✗'
    console.log(`  ${icon} ${s.csv} → ${s.slug ?? '—'} (${s.status})`)
  }

  const failed = summary.filter(s => s.status === 'fehlgeschlagen').length
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
