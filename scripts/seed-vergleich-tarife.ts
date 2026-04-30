/**
 * Seed-Script — Anbietertarife für VergleichsRechner
 *
 * Liest eine Long-Format-CSV mit Anbieter × Geburtsjahr × Summe → Beitrag und
 * upsertet die Zeilen in `tarife` (mit anbieter_name IS NOT NULL). Idempotent
 * via UNIQUE-Constraint (produkt_id, anbieter_name, alter_von, summe).
 *
 * CSV-Format (Header in dieser Reihenfolge):
 *   anbieter_name,tarif_name,besonderheiten_json,geburtsjahr,summe_eur,beitrag_eur
 *
 * Aufruf:
 *   npx tsx scripts/seed-vergleich-tarife.ts <produkt_slug> [csv_pfad]
 *
 * Default-CSV: vergleich-tarife-seeds/<produkt_slug>.csv
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local gesetzt sein.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Produkt-Slug + CSV-Pfad aus argv (mit Defaults)
const produktSlug = process.argv[2] ?? 'sterbegeld24plus'
const csvPath =
  process.argv[3] ?? path.resolve(process.cwd(), 'vergleich-tarife-seeds', `${slugToFile(produktSlug)}.csv`)

// Produktslug → CSV-Dateiname-Stamm. sterbegeld24plus → sterbegeld
function slugToFile(slug: string): string {
  if (slug.startsWith('sterbegeld')) return 'sterbegeld'
  if (slug.startsWith('pflege')) return 'pflege'
  if (slug.startsWith('leben') || slug.startsWith('risikoleben')) return 'leben'
  if (slug.startsWith('bu') || slug.startsWith('berufsunfaehigkeit')) return 'bu'
  if (slug.startsWith('unfall')) return 'unfall'
  return slug
}

// ---------------------------------------------------------------------------
// Minimaler RFC-4180-konformer CSV-Parser
// (vermeidet eine zusätzliche Dependency wie csv-parse)
// ---------------------------------------------------------------------------

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const c = content[i]

    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cell += '"'
          i++ // doppelte Quote im Feld → ein Quote-Zeichen
        } else {
          inQuotes = false
        }
      } else {
        cell += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(cell)
        cell = ''
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && content[i + 1] === '\n') i++ // CRLF
        row.push(cell)
        cell = ''
        if (row.some(v => v !== '')) rows.push(row)
        row = []
      } else {
        cell += c
      }
    }
  }
  // Letzte Zeile, falls keine Newline am Ende
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    if (row.some(v => v !== '')) rows.push(row)
  }

  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body.map(line => {
    const obj: Record<string, string> = {}
    header.forEach((key, idx) => {
      obj[key] = line[idx] ?? ''
    })
    return obj
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seed VergleichsRechner-Tarife — Produkt: ${produktSlug}, CSV: ${csvPath}`)

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV nicht gefunden: ${csvPath}`)
    process.exit(1)
  }

  const { data: produkt, error: produktErr } = await supabase
    .from('produkte')
    .select('id, slug, typ')
    .eq('slug', produktSlug)
    .single()

  if (produktErr || !produkt) {
    console.error(`Produkt mit slug="${produktSlug}" nicht gefunden:`, produktErr?.message)
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCsv(csvContent)
  if (records.length === 0) {
    console.error('CSV ist leer.')
    process.exit(1)
  }

  const currentYear = new Date().getFullYear()
  const upserts = records.map(r => {
    const geburtsjahr = parseInt(r.geburtsjahr, 10)
    const alter = currentYear - geburtsjahr
    const beitrag = parseFloat(r.beitrag_eur)
    if (Number.isNaN(geburtsjahr) || Number.isNaN(beitrag)) {
      throw new Error(`Ungültige Zahl in CSV: ${JSON.stringify(r)}`)
    }
    return {
      produkt_id: produkt.id,
      anbieter_name: r.anbieter_name,
      tarif_name: r.tarif_name || null,
      besonderheiten: r.besonderheiten_json ? JSON.parse(r.besonderheiten_json) : {},
      alter_von: alter,
      alter_bis: alter,
      summe: parseInt(r.summe_eur, 10),
      beitrag_low: beitrag,
      beitrag_high: beitrag,
      einheit: 'eur_summe',
    }
  })

  // Chunked upsert: PostgREST hat ein Limit, daher in 200er-Chunks
  const CHUNK_SIZE = 200
  let inserted = 0
  for (let i = 0; i < upserts.length; i += CHUNK_SIZE) {
    const chunk = upserts.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase.from('tarife').upsert(chunk, {
      onConflict: 'produkt_id,anbieter_name,alter_von,summe',
    })
    if (error) {
      console.error(`Upsert-Fehler bei Chunk ${i / CHUNK_SIZE + 1}:`, error.message)
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`\r  Upsert: ${inserted}/${upserts.length}`)
  }
  process.stdout.write('\n')
  console.log(`OK: ${inserted} Anbietertarife für ${produktSlug} (Stand ${currentYear}).`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
