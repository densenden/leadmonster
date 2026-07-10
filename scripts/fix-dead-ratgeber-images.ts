/**
 * Patch ratgeber JSON where section image_url points to a removed Unsplash photo.
 * Usage: npx tsx scripts/fix-dead-ratgeber-images.ts [--dry-run]
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { getCuratedCoverForSlug } from '../lib/stock/curated-covers'
import { isInternalImageUrl } from '../lib/ratgeber/normalize'

loadDotenv({ path: '.env.local' })

const DRY_RUN = process.argv.includes('--dry-run')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env')
  process.exit(1)
}

async function isBroken(url: string): Promise<boolean> {
  if (isInternalImageUrl(url)) return false
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return !res.ok
  } catch {
    return true
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
  const { data, error } = await supabase
    .from('generierter_content')
    .select('id, slug, content')
    .eq('page_type', 'ratgeber')

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  let patched = 0
  for (const row of data ?? []) {
    const slug = row.slug?.trim()
    const content = row.content as { sections?: Array<Record<string, unknown>> } | null
    const sections = content?.sections
    if (!slug || !sections?.length) continue

    const curated = getCuratedCoverForSlug(slug)
    if (!curated) continue

    let changed = false
    for (const section of sections) {
      const url = section.image_url
      if (typeof url !== 'string' || isInternalImageUrl(url)) continue
      if (!(await isBroken(url))) continue
      section.image_url = curated.cover_image_url
      if (!section.image_alt) section.image_alt = curated.cover_image_alt
      changed = true
      console.log(`fix ${slug} ${section.type}: ${url.slice(0, 70)}…`)
    }

    if (!changed) continue
    patched++
    if (DRY_RUN) continue

    const { error: upErr } = await supabase
      .from('generierter_content')
      .update({ content: content as never })
      .eq('id', row.id)

    if (upErr) console.error('update failed', row.id, upErr.message)
  }

  console.log(DRY_RUN ? `Would patch ${patched} rows` : `Patched ${patched} rows`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
