/**
 * Run full ratgeber pipeline via production API + local enrich/post-process.
 * Use when local Anthropic credits are empty but Vercel production can generate.
 *
 *   npx tsx scripts/run-ratgeber-pipeline-remote.ts --env=production
 *   npx tsx scripts/run-ratgeber-pipeline-remote.ts --slug=kosten-leistungen
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { enrichRatgeberPipelineSections } from '@/lib/ratgeber/enrich'
import {
  getTitleForSlug,
  needsRatgeberPipelineRegeneration,
  normalizeRatgeberSections,
} from '@/lib/ratgeber/normalize'
import type { RatgeberSection } from '@/lib/types/ratgeber'
import type { Json } from '@/lib/supabase/types'

loadDotenv({ path: '.env.local' })
const envFile =
  process.argv.find(a => a.startsWith('--env='))?.slice('--env='.length) === 'production'
    ? '.env.production.local'
    : '.env.vercel.production'
loadDotenv({ path: envFile })

const PRODUKT_ID = 'fe1e6444-eaab-42df-8fa7-72ec644c3f9f'
const DEFAULT_BASE = 'https://leadmonster-kappa.vercel.app'

function parseArg(name: string): string | undefined {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.slice(name.length + 3) : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

async function generateRemote(base: string, secret: string, slug: string): Promise<boolean> {
  const res = await fetch(`${base}/api/admin/internal/generate-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': secret,
    },
    body: JSON.stringify({ produktId: PRODUKT_ID, topics: [slug] }),
  })
  const json = (await res.json()) as {
    data?: { results: Array<{ topic: string; status: string; error?: string }> }
  }
  const row = json.data?.results?.[0]
  if (!row || row.status !== 'success') {
    console.error(`  ✗ API: ${row?.error ?? res.status}`)
    return false
  }
  return true
}

async function main() {
  const base = parseArg('base') ?? DEFAULT_BASE
  const onlySlug = parseArg('slug')
  const forceAll = hasFlag('all')
  const secret = process.env.INTERNAL_SECRET?.trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!secret || !url || !key) {
    console.error('Need INTERNAL_SECRET + Supabase env')
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const { data: rows, error } = await supabase
    .from('generierter_content')
    .select('id, slug, title, content, status, published_at')
    .eq('produkt_id', PRODUKT_ID)
    .eq('page_type', 'ratgeber')
    .order('slug')

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  let targets = rows ?? []
  if (onlySlug) targets = targets.filter(r => r.slug === onlySlug)
  else if (!forceAll) targets = targets.filter(r => needsRatgeberPipelineRegeneration(r))

  console.log(`\n=== Remote pipeline: ${targets.length} article(s) via ${base} ===\n`)

  const failures: string[] = []

  for (const row of targets) {
    const slug = row.slug ?? ''
    if (!slug) continue
    console.log(`▶ ${slug}`)

    const ok = await generateRemote(base, secret, slug)
    if (!ok) {
      failures.push(slug)
      continue
    }
    console.log('  ✓ generated')

    const { data: fresh } = await supabase
      .from('generierter_content')
      .select('content, status, published_at')
      .eq('id', row.id)
      .single()

    const baseSections = normalizeRatgeberSections(
      (fresh?.content as { sections?: unknown[] } | null)?.sections,
    )
    const enriched = enrichRatgeberPipelineSections(slug, baseSections as RatgeberSection[])
    const now = new Date().toISOString()
    const keepPublished = row.status === 'publiziert' || fresh?.status === 'publiziert'

    await supabase
      .from('generierter_content')
      .update({
        title: getTitleForSlug(slug),
        content: {
          ...(fresh?.content as Record<string, unknown>),
          sections: enriched,
        } as unknown as Json,
        status: keepPublished ? 'publiziert' : row.status,
        published_at: keepPublished ? (row.published_at ?? fresh?.published_at ?? now) : row.published_at,
        updated_at: now,
      })
      .eq('id', row.id)

    console.log(`  ✓ enriched (${enriched.length} sections)`)
  }

  console.log('\nDone:', targets.length - failures.length, '/', targets.length)
  if (failures.length) console.log('Failed:', failures.join(', '))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
