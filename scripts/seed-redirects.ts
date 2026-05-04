/**
 * Seed: Initiale Redirects für die Single-Domain-Migration auf sterbegeld24plus.de.
 *
 * Quellen: docs/content-strategie-nischen-anbieter.md § 8
 *
 * Verwendung:
 *   npx tsx scripts/seed-redirects.ts
 *
 * Idempotent: ON CONFLICT (legacy_path) DO UPDATE — d. h. wenn der Vertrieb
 * im Admin nachträglich was geändert hat, wird das beim Re-Run wieder
 * überschrieben. Falls das nicht gewünscht: Datei vor Re-Run anpassen.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY müssen in .env.local gesetzt sein.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false },
})

interface SeedEntry {
  legacy_path: string
  target_path: string
  status?: number
  notiz?: string
}

// Initial-Mapping aus § 8.
// Sub-Pages (/sterbegeld24plus/faq etc.) bleiben unter dem alten Pfad — kein
// Redirect nötig. Nur Hauptseite + alte Marketing-Pfade.
const INITIAL_REDIRECTS: SeedEntry[] = [
  {
    legacy_path: '/muenchener-begraebnisverein/',
    target_path: '/anbieter/muenchener-begraebnisverein',
    notiz: 'Alte Anbieter-Slug-URL aus sterbegeld24plus.de',
  },
  {
    legacy_path: '/hdi/',
    target_path: '/anbieter/hdi',
    notiz: 'Alte Anbieter-Slug-URL aus sterbegeld24plus.de',
  },
  {
    legacy_path: '/ueber-uns/',
    target_path: '/redaktion/christian-wimmer',
    notiz: 'Author-Profil ersetzt alte Über-uns-Seite',
  },
  // Trailing-Slash-Variante — Middleware tolerant, aber explizit ist sicherer
  {
    legacy_path: '/ueber-uns',
    target_path: '/redaktion/christian-wimmer',
    notiz: 'Author-Profil — ohne Trailing Slash',
  },
]

async function main() {
  console.log(`→ Seede ${INITIAL_REDIRECTS.length} Initial-Redirects …`)

  const rows = INITIAL_REDIRECTS.map(r => ({
    legacy_path: r.legacy_path,
    target_path: r.target_path,
    status: r.status ?? 301,
    notiz: r.notiz ?? null,
  }))

  const { error } = await supabase
    .from('redirects')
    .upsert(rows, { onConflict: 'legacy_path' })

  if (error) {
    console.error('✗ Seed fehlgeschlagen:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${rows.length} Redirects upserted.`)
  for (const r of rows) {
    console.log(`  ${r.legacy_path} → ${r.target_path} (${r.status})`)
  }
  console.log('')
  console.log('ℹ Weitere Pfade (z. B. .html-Altlasten) idealerweise via CSV-Import')
  console.log('  unter /admin/redirects einspielen.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
