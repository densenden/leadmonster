/**
 * Deletes and re-invites admin users so Supabase sends fresh invite emails.
 *
 * Usage:
 *   npx tsx scripts/recreate-admin-users.ts
 *   npx tsx scripts/recreate-admin-users.ts --base-url=https://leadmonster-kappa.vercel.app
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseEmailRedirectUrl } from '../lib/supabase/auth-redirect-url'

loadDotenv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY are required.')
  process.exit(1)
}

function parseArg(name: string): string | undefined {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.slice(name.length + 3) : undefined
}

const ADMIN_USERS = [
  { email: 'kai.schmied@finanzteam26.de', displayName: 'Kai Schmied (Geschäftsleitung)' },
  { email: 'info@christian-wimmer.eu', displayName: 'Christian Wimmer (Vertrieb)' },
] as const

async function main() {
  const baseUrl = parseArg('base-url') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://leadmonster-kappa.vercel.app'
  const redirectTo = getSupabaseEmailRedirectUrl('/auth/callback?next=/admin/login/update-password', {
    requestOrigin: baseUrl,
    nodeEnv: 'production',
  })

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Redirect URL for invite emails: ${redirectTo}\n`)

  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listErr) {
    console.error('listUsers failed:', listErr.message)
    process.exit(1)
  }

  for (const admin of ADMIN_USERS) {
    const existing = list.users.find(u => u.email?.toLowerCase() === admin.email.toLowerCase())

    if (existing) {
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(existing.id)
      if (deleteErr) {
        console.error(`✗ delete ${admin.email}: ${deleteErr.message}`)
        continue
      }
      console.log(`✓ deleted ${admin.email}`)
    } else {
      console.log(`ⓘ ${admin.email} not found — creating fresh invite`)
    }

    const { data, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(admin.email, {
      redirectTo,
      data: { display_name: admin.displayName },
    })

    if (inviteErr) {
      console.error(`✗ invite ${admin.email}: ${inviteErr.message}`)
      continue
    }

    console.log(`✓ invite sent to ${admin.email} (id=${data.user?.id?.slice(0, 8)}…)`)
  }

  console.log('\nDone. Users should receive Supabase invite emails shortly.')
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
