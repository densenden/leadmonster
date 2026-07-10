/**
 * Full ratgeber content pipeline for sterbegeld24plus:
 *   1) Claude generateContent per slug (proper prompt + topic hint)
 *   2) Enrich with image_text / quote / info_box sections
 *   3) Auto-cross-linking + optional cover images (post-processor)
 *
 * Usage:
 *   npx tsx scripts/regenerate-ratgeber-pipeline.ts
 *   npx tsx scripts/regenerate-ratgeber-pipeline.ts --slug=sterbegeld-und-pflegezusatz
 *   npx tsx scripts/regenerate-ratgeber-pipeline.ts --all
 *   npx tsx scripts/regenerate-ratgeber-pipeline.ts --env=production --skip-images
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
    ? '.env.vercel.production'
    : '.env.production.local'
loadDotenv({ path: envFile })

// Production DB may point to OpenAI without a key — force Anthropic for CLI runs.
process.env.AI_TEXT_PROVIDER = process.env.AI_TEXT_PROVIDER ?? 'anthropic'
process.env.AI_TEXT_MODEL = process.env.AI_TEXT_MODEL ?? 'claude-sonnet-4-6'

const PRODUKT_ID = 'fe1e6444-eaab-42df-8fa7-72ec644c3f9f'

function parseArg(name: string): string | undefined {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.slice(name.length + 3) : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

async function main() {
  const onlySlug = parseArg('slug')
  const forceAll = hasFlag('all')
  const skipImages = hasFlag('skip-images')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    console.error(`Missing Supabase env (loaded ${envFile})`)
    process.exit(1)
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error('ANTHROPIC_API_KEY required')
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

  if (targets.length === 0) {
    console.log('No ratgeber rows need pipeline regeneration.')
    return
  }

  console.log(`\n=== Ratgeber pipeline: ${targets.length} article(s) ===\n`)

  const failures: string[] = []

  for (const row of targets) {
    const slug = row.slug ?? ''
    if (!slug) continue

    console.log(`\n▶ ${slug} — ${getTitleForSlug(slug)}`)

    const { generateContent } = await import('@/lib/anthropic/generator')
    const gen = await generateContent(PRODUKT_ID, slug)
    if (gen.failed.some(f => f.slug === slug)) {
      const err = gen.failed.find(f => f.slug === slug)?.error_message ?? 'unknown'
      console.error(`  ✗ generate: ${err}`)
      failures.push(slug)
      continue
    }
    console.log('  ✓ Claude content generated')

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

    const { error: upErr } = await supabase
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

    if (upErr) {
      console.error(`  ✗ enrich save: ${upErr.message}`)
      failures.push(slug)
      continue
    }
    console.log(`  ✓ Enriched → ${enriched.length} sections`)
  }

  if (!skipImages) {
    console.log('\n▶ Post-process (auto-link + cover images)…')
    try {
      const { postProcessProduct } = await import('@/lib/anthropic/post-processor')
      const post = await postProcessProduct(PRODUKT_ID, { generateImages: true })
      console.log(`  ✓ ratgeber covers generated: ${post.ratgeberCoversGenerated ?? 0}`)
      for (const e of post.errors) console.warn(`  ⚠ ${e}`)
    } catch (err) {
      console.warn('  ⚠ post-process skipped:', err instanceof Error ? err.message : err)
    }
  }

  console.log('\n=== Done ===')
  console.log(`Success: ${targets.length - failures.length}/${targets.length}`)
  if (failures.length) console.log('Failed:', failures.join(', '))
  console.log('Index: https://leadmonster-kappa.vercel.app/sterbegeld24plus/ratgeber')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
