/**
 * Re-Review-Cron: prüft welche Inhalte zur Re-Review fällig sind und
 * berechnet `freshness_score`.
 *
 * Aufruf:
 *   npx tsx scripts/check-freshness.ts                # nur Reporting
 *   npx tsx scripts/check-freshness.ts --update       # update freshness_score in DB
 *   npx tsx scripts/check-freshness.ts --notify       # zusätzlich Resend-Mail an SALES
 *
 * Geplant via cron (z. B. täglich 06:00) oder via agent-os:schedule-Skill.
 *
 * Berechnung:
 *   freshness_score = (now - reviewed_at) / cadence_ms * 100
 *   - 0   = frisch reviewed
 *   - 100 = exakt am Re-Review-Termin
 *   - >100 = überfällig
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadDotenv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SALES_EMAIL = process.env.SALES_NOTIFICATION_EMAIL

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY müssen gesetzt sein')
  process.exit(1)
}

const TABLES = [
  { table: 'generierter_content', publishedFilter: { col: 'status', val: 'publiziert' }, label: 'Generierter Content' },
  { table: 'blog_posts',          publishedFilter: { col: 'status', val: 'publiziert' }, label: 'Blog' },
  { table: 'wissensfundus',       publishedFilter: { col: 'published', val: true },      label: 'Wissensfundus' },
] as const

interface DueRow {
  id: string
  title: string
  reviewed_at: string | null
  next_review_at: string | null
  freshness_score: number
  url: string
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const doUpdate = args.has('--update')
  const doNotify = args.has('--notify')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://finanzteam26.de'

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!, { auth: { persistSession: false } })

  // Cadence aus einstellungen
  const { data: setting } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'redaktion_review_intervall_tage')
    .maybeSingle()
  const cadenceMs = (Number(setting?.wert ?? '180') || 180) * 24 * 60 * 60 * 1000
  console.log(`📐 Re-Review-Cadence: ${cadenceMs / (24 * 60 * 60 * 1000)} Tage`)

  const now = Date.now()
  const allDue: { table: string; label: string; rows: DueRow[] }[] = []

  for (const { table, publishedFilter, label } of TABLES) {
    let query = supabase
      .from(table)
      .select('*')
      .lte('next_review_at', new Date().toISOString())
    query = query.eq(publishedFilter.col, publishedFilter.val as never)
    const { data, error } = await query
    if (error) {
      console.error(`✗ ${label}: ${error.message}`)
      continue
    }

    const due: DueRow[] = []
    for (const row of data ?? []) {
      const reviewedAt = (row as { reviewed_at?: string | null }).reviewed_at
      const reviewedMs = reviewedAt ? new Date(reviewedAt).getTime() : 0
      const score = reviewedMs > 0
        ? Math.round(((now - reviewedMs) / cadenceMs) * 100)
        : 999

      // URL-Bauplan je table — bewusst grob, sonst zu viel Indirektion
      const url = table === 'wissensfundus'
        ? `${baseUrl}/wissen/${(row as { slug?: string }).slug}`
        : table === 'blog_posts'
        ? `${baseUrl}/blog/${(row as { slug?: string }).slug}`
        : `${baseUrl}/admin/produkte/${(row as { produkt_id?: string }).produkt_id}/content`

      due.push({
        id: (row as { id: string }).id,
        title: ((row as { title?: string }).title)
          ?? ((row as { thema?: string }).thema)
          ?? ((row as { slug?: string }).slug)
          ?? 'Eintrag',
        reviewed_at: reviewedAt ?? null,
        next_review_at: (row as { next_review_at?: string | null }).next_review_at ?? null,
        freshness_score: score,
        url,
      })

      if (doUpdate) {
        await supabase
          .from(table)
          .update({ freshness_score: score })
          .eq('id', (row as { id: string }).id)
      }
    }

    allDue.push({ table, label, rows: due })
    console.log(`📋 ${label}: ${due.length} Einträge fällig${doUpdate ? ' (freshness_score aktualisiert)' : ''}`)
  }

  const totalDue = allDue.reduce((sum, t) => sum + t.rows.length, 0)
  if (totalDue === 0) {
    console.log('✅ Keine Inhalte zur Re-Review fällig.')
    return
  }

  if (doNotify && RESEND_API_KEY && SALES_EMAIL) {
    const html = renderReportHtml(allDue)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_ADDRESS ?? 'noreply@finanzteam26.de',
        to: SALES_EMAIL,
        subject: `[LeadMonster] ${totalDue} Inhalte zur Re-Review fällig`,
        html,
      }),
    })
    if (res.ok) console.log('📧 Resend-Mail an SALES verschickt.')
    else console.error(`✗ Resend-Fehler: ${res.status}`)
  } else if (doNotify) {
    console.warn('⚠️ --notify gesetzt, aber RESEND_API_KEY oder SALES_NOTIFICATION_EMAIL fehlt.')
  }
}

function renderReportHtml(allDue: { table: string; label: string; rows: DueRow[] }[]): string {
  const sections = allDue
    .filter(t => t.rows.length > 0)
    .map(t => `
      <h2 style="font-family: sans-serif; color: #1a365d; margin-top: 24px;">${t.label} (${t.rows.length})</h2>
      <ul style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #333;">
        ${t.rows.slice(0, 20).map(r => `
          <li>
            <a href="${r.url}" style="color: #02a9e6;">${r.title}</a>
            <span style="color: #999; font-size: 12px;">(Score: ${r.freshness_score})</span>
          </li>
        `).join('')}
      </ul>
    `).join('')
  return `
    <body style="background: #f7fafc; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px;">
        <h1 style="font-family: sans-serif; color: #1a365d;">Re-Review-Übersicht</h1>
        <p style="font-family: sans-serif; color: #666;">Diese Inhalte sind über die Re-Review-Cadence (180 Tage) hinausgewachsen und sollten geprüft werden.</p>
        ${sections}
      </div>
    </body>
  `
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
