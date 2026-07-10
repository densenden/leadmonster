/**
 * Audit all image URLs in DB content + curated stock list.
 * Usage: npx tsx scripts/audit-image-urls.ts
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CURATED_COVERS } from '../lib/stock/curated-covers'
import { buildUnsplashCdnUrl } from '../lib/stock/unsplash'

loadDotenv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

function collectUrls(value: unknown, out: Set<string>, path = ''): void {
  if (value == null) return
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && /\.(png|jpe?g|webp|gif|svg)/i.test(value.split('?')[0])) {
      out.add(value)
    }
    if (value.includes('images.unsplash.com') || value.includes('supabase.co/storage')) {
      out.add(value)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectUrls(v, out, `${path}[${i}]`))
    return
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/image|cover|hero|url|src/i.test(k) && typeof v === 'string' && v.startsWith('http')) {
        out.add(v)
      }
      collectUrls(v, out, path ? `${path}.${k}` : k)
    }
  }
}

async function checkUrl(url: string): Promise<{ url: string; status: number | 'error' }> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    return { url, status: res.status }
  } catch {
    return { url, status: 'error' }
  }
}

async function main() {
  const urls = new Set<string>()

  for (const entry of Object.values(CURATED_COVERS)) {
    urls.add(buildUnsplashCdnUrl(entry.photoId))
  }

  // Known dead / legacy stock ids from enrich script
  for (const id of [
    'photo-1567096038228-7d57aacd33b1',
    'photo-1488521787991-ed7bbaae773c',
    'photo-1493663284031-b7e3aefcae8e',
  ]) {
    urls.add(buildUnsplashCdnUrl(id))
  }

  if (SUPABASE_URL && SUPABASE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    const tables: Array<{ table: string; cols: string }> = [
      { table: 'produkte', cols: 'slug, hero_image_url, og_image_url' },
      { table: 'blog_posts', cols: 'slug, cover_image_url' },
      { table: 'generierter_content', cols: 'slug, page_type, content' },
      { table: 'bilder', cols: 'url' },
    ]

    for (const { table, cols } of tables) {
      const { data, error } = await supabase.from(table).select(cols)
      if (error) {
        console.warn(`Skip ${table}:`, error.message)
        continue
      }
      for (const row of data ?? []) collectUrls(row, urls)
    }
  } else {
    console.warn('No Supabase env — auditing curated covers only.')
  }

  console.log(`Checking ${urls.size} unique URLs...\n`)

  const results = await Promise.all([...urls].map(checkUrl))
  const bad = results.filter(r => r.status !== 200).sort((a, b) => String(a.status).localeCompare(String(b.status)))

  for (const r of bad) {
    console.log(`${r.status}\t${r.url}`)
  }

  console.log(`\nSummary: ${bad.length} broken / ${results.length} total`)
  process.exit(bad.length > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
