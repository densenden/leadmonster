/**
 * Creates admin users and sends Supabase password-setup emails.
 * Falls back to generateLink when invite email rate limit is hit.
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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const baseUrl = parseArg('base-url') ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://leadmonster-kappa.vercel.app'
  const redirectTo = getSupabaseEmailRedirectUrl('/auth/callback?next=/admin/login/update-password', {
    requestOrigin: baseUrl,
    nodeEnv: 'production',
  })

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Redirect URL: ${redirectTo}\n`)

  for (const admin of ADMIN_USERS) {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = list?.users.find(u => u.email?.toLowerCase() === admin.email.toLowerCase())

    if (!existing) {
      const { error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: admin.email,
        options: { redirectTo, data: { display_name: admin.displayName } },
      })
      if (linkErr) {
        console.error(`✗ create via generateLink ${admin.email}: ${linkErr.message}`)
        continue
      }
      console.log(`✓ created ${admin.email} (via generateLink)`)
    } else {
      console.log(`ⓘ ${admin.email} already exists`)
    }

    await sleep(3000)

    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(admin.email, {
      redirectTo,
      data: { display_name: admin.displayName },
    })

    if (!inviteErr) {
      console.log(`✓ invite email sent to ${admin.email}`)
      continue
    }

    if (inviteErr.message.includes('rate limit')) {
      console.warn(`⚠ invite rate-limited for ${admin.email}, trying recovery email...`)
      await sleep(5000)

      const anon = createClient(SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error: recoveryErr } = await anon.auth.resetPasswordForEmail(admin.email, { redirectTo })

      if (recoveryErr) {
        console.error(`✗ recovery email ${admin.email}: ${recoveryErr.message}`)
      } else {
        console.log(`✓ recovery email sent to ${admin.email}`)
      }
      continue
    }

    console.error(`✗ invite ${admin.email}: ${inviteErr.message}`)
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
