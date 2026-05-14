/**
 * Batch-Generator: erzeugt 20 Sterbegeld-Ratgeber als `entwurf` in DB.
 *
 * Setzt eine laufende Next-Dev-Instanz oder eine Vercel-Preview voraus, da
 * der eigentliche Generator das Server-Module `lib/supabase/server` mit
 * `next/headers`-Cookies braucht. Wir POSTen daher gegen die
 * INTERNAL_SECRET-protected Route /api/admin/internal/generate-batch.
 *
 * Voraussetzungen:
 *   - .env.local mit INTERNAL_SECRET + ANTHROPIC_API_KEY
 *   - lokal: `npm run dev` läuft (default Port 3000) ODER --base=https://…
 *
 * Aufruf:
 *   npx tsx scripts/generate-sterbegeld-ratgeber-batch.ts \
 *     --base=http://localhost:3000 \
 *     [--limit=5]   # für Test-Lauf mit weniger Themen
 *
 * Idempotent über Slug-UNIQUE in generierter_content — wiederholtes Ausführen
 * upsertet die bestehenden Rows.
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { STERBEGELD_RATGEBER_THEMEN } from './sterbegeld-ratgeber-themen'

loadDotenv({ path: '.env.local' })

const STERBEGELD24PLUS_ID = 'fe1e6444-eaab-42df-8fa7-72ec644c3f9f'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
const INTERNAL_SECRET = process.env.INTERNAL_SECRET
if (!SUPABASE_URL || !SUPABASE_SECRET || !INTERNAL_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY + INTERNAL_SECRET in .env.local benötigt.')
  process.exit(1)
}

function parseArg(name: string): string | undefined {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.slice(name.length + 3) : undefined
}

interface BatchResult {
  data: {
    results: Array<{ topic: string; status: 'success' | 'failed'; rowId?: string; error?: string }>
    success_count: number
    total: number
  } | null
  error: { code: string; message?: string } | null
}

async function main() {
  const base = parseArg('base') ?? 'http://localhost:3000'
  const limit = parseInt(parseArg('limit') ?? '0', 10) || STERBEGELD_RATGEBER_THEMEN.length

  const themen = STERBEGELD_RATGEBER_THEMEN.slice(0, limit)
  const topics = themen.map(t => t.slug)

  console.log(`📚 Batch-Generator: ${themen.length} Sterbegeld-Ratgeber → ${base}`)
  console.log('Themen:')
  for (const t of themen) console.log(`  - ${t.slug}: ${t.titel}`)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!)
  const { data: produkt } = await supabase
    .from('produkte')
    .select('slug, name')
    .eq('id', STERBEGELD24PLUS_ID)
    .single()
  if (!produkt) {
    console.error('Produkt sterbegeld24plus nicht gefunden.')
    process.exit(1)
  }
  console.log(`Produkt: ${produkt.name} (${produkt.slug})\n`)

  const url = `${base}/api/admin/internal/generate-batch`
  console.log(`🚀 POST ${url}\n`)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET!,
      },
      body: JSON.stringify({ produktId: STERBEGELD24PLUS_ID, topics }),
    })
  } catch (err) {
    console.error('Netzwerk-Fehler — läuft der Dev-Server?', err)
    process.exit(1)
  }

  const json = (await res.json()) as BatchResult
  if (json.error) {
    console.error(`❌ Fehler: ${json.error.code} ${json.error.message ?? ''}`)
    process.exit(1)
  }
  if (!json.data) {
    console.error('Unerwartete Antwort:', json)
    process.exit(1)
  }

  console.log(`\n✅ ${json.data.success_count}/${json.data.total} Ratgeber generiert.`)
  for (const r of json.data.results) {
    const mark = r.status === 'success' ? '✓' : '✗'
    console.log(`  ${mark} ${r.topic}${r.error ? ` — ${r.error.slice(0, 80)}` : ''}`)
  }

  console.log(`\nReview + Publizieren via ${base}/admin/produkte/${STERBEGELD24PLUS_ID}`)
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
