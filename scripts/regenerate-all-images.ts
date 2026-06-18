/**
 * Regenerate ALL product images via OpenAI gpt-image-1 — sequential, no admin clicks.
 *
 * Order:
 *   1. Hero / header (produkte.hero_image_url + hauptseite hero section)
 *   2. Hauptseite inline sections (image_text_split)
 *   3. Each ratgeber: cover + intro + image_text sections (one image after another)
 *
 * Usage:
 *   npx tsx scripts/regenerate-all-images.ts sterbegeld24plus
 *   npx tsx scripts/regenerate-all-images.ts sterbegeld24plus --delay=2000
 *   npx tsx scripts/regenerate-all-images.ts sterbegeld24plus --dry-run
 *
 * Requires OPENAI_API_KEY or AI_GATEWAY_API_KEY + Supabase secrets in .env.local
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/types'
import {
  loadProduktContext,
  regenerateAllProductImages,
} from '../lib/images/regenerate-product-images'
import { isOpenAiConfigured } from '../lib/openai/resolve-credentials'

loadDotenv({ path: '.env.local' })
loadDotenv({ path: '.env.production.local' })
loadDotenv({ path: '.env.vercel.production' })
loadDotenv({ path: '.env.vercel.pull' })

const args = process.argv.slice(2)
const produktSlug = args.find(a => !a.startsWith('--')) ?? 'sterbegeld24plus'
const DRY_RUN = args.includes('--dry-run')
const delayArg = args.find(a => a.startsWith('--delay='))
const delayMs = delayArg ? Math.max(500, Number(delayArg.split('=')[1]) || 1500) : 1500

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!

async function bootstrapOpenAiKeyFromDb(
  supabase: ReturnType<typeof createClient<Database>>,
): Promise<void> {
  const existing =
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
  if (existing && existing.length >= 8) return

  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'openai_api_key')
    .maybeSingle()

  const dbKey = data?.wert?.trim()
  if (dbKey && dbKey.length >= 8) {
    process.env.OPENAI_API_KEY = dbKey
    console.log('→ Using openai_api_key from einstellungen (admin DB)\n')
  }
}

async function checkOpenAi(): Promise<void> {
  if (!(await isOpenAiConfigured())) {
    console.error('FATAL: No OpenAI credentials found.')
    console.error('Admin → Einstellungen → Bildgenerierung (OpenAI API-Key),')
    console.error('or set OPENAI_API_KEY / AI_GATEWAY_API_KEY in .env.local / Vercel.')
    process.exit(1)
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('FATAL: Supabase env missing.')
    process.exit(1)
  }
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY)

  if (!DRY_RUN) {
    await bootstrapOpenAiKeyFromDb(supabase)
    await checkOpenAi()
  }

  const ctx = await loadProduktContext(supabase, produktSlug)

  if (!ctx) {
    console.error(`Produkt "${produktSlug}" not found.`)
    process.exit(1)
  }

  console.log(`\n🎨 AI image pipeline — ${ctx.name}`)
  console.log(`   Sequential mode, ${delayMs}ms pause between images`)
  if (DRY_RUN) {
    console.log('   DRY RUN — listing jobs only\n')
    const { buildHeroJob, collectHauptseiteJobs, collectRatgeberJobs } = await import(
      '../lib/images/regenerate-product-images'
    )
    console.log('Hero:', buildHeroJob(ctx).label)
    const { data: haupt } = await supabase
      .from('generierter_content')
      .select('content')
      .eq('produkt_id', ctx.id)
      .eq('page_type', 'hauptseite')
      .maybeSingle()
    const sections = ((haupt?.content as { sections?: { type: string }[] })?.sections ?? [])
    console.log('Hauptseite jobs:', collectHauptseiteJobs(ctx, sections).length)
    const { data: ratgeber } = await supabase
      .from('generierter_content')
      .select('slug, title, meta_desc, content')
      .eq('produkt_id', ctx.id)
      .eq('page_type', 'ratgeber')
    let total = 1 + collectHauptseiteJobs(ctx, sections).length
    for (const r of ratgeber ?? []) {
      const secs = ((r.content as { sections?: { type: string }[] })?.sections ?? [])
      total += collectRatgeberJobs(ctx, r.slug!, r.title, r.meta_desc, secs).length
    }
    console.log(`Total images to generate: ~${total}`)
    return
  }

  console.log('   This will take several minutes. Do not interrupt.\n')

  const started = Date.now()
  const result = await regenerateAllProductImages(supabase, ctx, {
    delayMs,
    onProgress: msg => console.log(msg),
  })

  const mins = ((Date.now() - started) / 60000).toFixed(1)
  console.log(`\n✅ Finished in ${mins} min`)
  console.log(`   Generated: ${result.generated}`)
  console.log(`   Failed:    ${result.failed}`)

  if (result.failed > 0) {
    console.log('\nFailures:')
    for (const item of result.items.filter(i => i.error)) {
      console.log(`  - ${item.label}: ${item.error}`)
    }
    process.exit(2)
  }
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
