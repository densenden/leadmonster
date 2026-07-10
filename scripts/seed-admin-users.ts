/**
 * Legt Admin-User für Kai + Christian an. Idempotent: prüft via
 * supabase.auth.admin.listUsers(), ob die User existieren — sonst createUser
 * mit email_confirm=true.
 *
 * Passwörter werden interaktiv per CLI-Argument (--password=…) oder via
 * env-Var INITIAL_PASSWORD übergeben. NICHT in dieses File hardcoden.
 *
 * Aufruf-Beispiele:
 *   INITIAL_PASSWORD='xxx' npx tsx scripts/seed-admin-users.ts
 *   npx tsx scripts/seed-admin-users.ts --password='xxx'
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadDotenv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY fehlen.')
  process.exit(1)
}

function parseArg(name: string): string | undefined {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.slice(name.length + 3) : undefined
}

const ADMIN_USERS = [
  {
    email: 'kai.schmied@finanzteam26.de',
    displayName: 'Kai Schmied (Geschäftsleitung)',
  },
  {
    email: 'info@christian-wimmer.eu',
    displayName: 'Christian Wimmer (Vertrieb)',
  },
] as const

async function ensureUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  email: string,
  password: string,
  displayName: string,
) {
  // Existiert User schon? listUsers paginiert; default page=1, perPage=50.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) {
    console.error(`  ✗ listUsers fehlgeschlagen: ${listErr.message}`)
    return
  }

  const existing = list.users.find((u: { email?: string | null; id: string }) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    console.log(`  ⓘ ${email} existiert bereits (id=${existing.id.slice(0, 8)}…) — überspringe Anlage.`)
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) {
    console.error(`  ✗ createUser ${email}: ${error.message}`)
    return
  }
  console.log(`  ✓ ${email} angelegt (id=${data.user?.id.slice(0, 8)}…).`)
}

async function main() {
  const password = parseArg('password') ?? process.env.INITIAL_PASSWORD
  if (!password || password.length < 12) {
    console.error('Bitte --password=<min 12 Zeichen> oder INITIAL_PASSWORD setzen.')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('🔐 Lege Admin-User an (idempotent)…')
  for (const u of ADMIN_USERS) {
    await ensureUser(supabase, u.email, password, u.displayName)
  }

  console.log('\nFertig. Passwort kommunizieren — niemals in Git committen.')
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
