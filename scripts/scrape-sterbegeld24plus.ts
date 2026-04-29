/**
 * Scraper for https://www.sterbegeld24plus.de/
 * Thin wrapper around lib/scraper/scrape.ts.
 *
 * Run with:
 *   npx tsx scripts/scrape-sterbegeld24plus.ts --dry-run
 *   npx tsx scripts/scrape-sterbegeld24plus.ts --save
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fetchHtml, extractData, buildArticles } from '../lib/scraper/scrape'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const TARGET_URL = 'https://www.sterbegeld24plus.de/'
const KATEGORIE = 'sterbegeld'
const THEMA_PREFIX = 'scraped_sterbegeld24plus'
const DRY_RUN = process.argv.includes('--dry-run')
const SAVE = process.argv.includes('--save')

if (!DRY_RUN && !SAVE) {
  console.log('Usage: npx tsx scripts/scrape-sterbegeld24plus.ts --dry-run | --save')
  process.exit(1)
}

async function main() {
  console.log(`\nFetching ${TARGET_URL}…\n`)
  const html = await fetchHtml(TARGET_URL)
  console.log(`  ✓ Fetched ${(html.length / 1024).toFixed(1)} KB of HTML\n`)

  const data = extractData(html)

  console.log('─── Extracted Data ───────────────────────────────────────')
  console.log('Hero headline:', data.hero_headline ?? '(not found)')
  console.log('Hero subline: ', data.hero_subline ?? '(not found)')
  console.log(`Features:      ${data.features.length} items`)
  console.log(`FAQ:           ${data.faq.length} items`)
  console.log(`Pricing:       ${data.pricing.length} items`)
  console.log(`Insurers:      ${data.insurers.join(', ') || '(none found)'}`)
  console.log(`Text snippets: ${data.raw_text_snippets.length} items`)

  if (DRY_RUN) {
    console.log('\n─── Full JSON Output ─────────────────────────────────────')
    console.log(JSON.stringify(data, null, 2))
  }

  if (SAVE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
    if (!url || !key) throw new Error('Supabase credentials missing in .env.local')

    const supabase = createClient(url, key)
    const articles = buildArticles(data, KATEGORIE, 'sterbegeld24plus.de', THEMA_PREFIX)

    console.log('\n─── Saving to Wissensfundus ──────────────────────────────')
    for (const article of articles) {
      const { error } = await supabase
        .from('wissensfundus')
        .upsert(article, { onConflict: 'kategorie,thema' })
      if (error) console.error(`  ✗ ${article.thema}:`, error.message)
      else console.log(`  ✓ ${article.thema}`)
    }
    console.log('\n✅ Saved.')
  }
}

main().catch(err => {
  console.error('Scraper error:', err)
  process.exit(1)
})
