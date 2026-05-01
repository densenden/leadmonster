/**
 * Re-Import alter finanzteam26.de-Inhalte → blog_posts.
 * Spec: docs/redaktion-trust-spec.md §6.3
 *
 * Vorgehen:
 *  1. URL-Liste fetchen (HTTP)
 *  2. Hauptcontent extrahieren via cheerio (`<article>` / `.entry-content` / `.post-content`)
 *  3. HTML → Markdown (turndown)
 *  4. Insert in blog_posts mit autor_id=Christian, status='entwurf', source_origin='finanzteam26'
 *  5. Cover-Image NICHT automatisch (Lizenzprüfung notwendig)
 *
 * Aufruf:
 *   npx tsx scripts/import-finanzteam26-blog.ts                # alle URLs aus Default-Liste
 *   npx tsx scripts/import-finanzteam26-blog.ts --url=https://… # einzeln
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

loadDotenv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY fehlen.')
  process.exit(1)
}

const URLS_DEFAULT = [
  'https://finanzteam26.de/berufsunfaehigkeit.html',
  'https://finanzteam26.de/berufsunfaehigkeitsversicherung-junge-leute.html',
  'https://finanzteam26.de/berufsunfaehigkeitsversicherung-fuer-kinder.html',
  'https://finanzteam26.de/berufsunfaehigkeitsversicherung-fuer-schueler.html',
  'https://finanzteam26.de/berufsunfaehigkeitsversicherung-fuer-studenten.html',
  'https://finanzteam26.de/berufsunfaehigkeitsversicherung-fuer-azubis.html',
  'https://finanzteam26.de/berufsunfaehigkeit/lehrer-und-beamte.html',
  'https://finanzteam26.de/berufsunfaehigkeit/selbststaendige.html',
  'https://finanzteam26.de/berufsunfaehigkeit/angestellte.html',
  'https://finanzteam26.de/ganzheitliche-beratung.html',
]

interface ImportArgs {
  urls: string[]
  reviewer?: string
}

function parseArgs(): ImportArgs {
  const urls: string[] = []
  let reviewer: string | undefined
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.+)$/)
    if (!m) continue
    if (m[1] === 'url') urls.push(m[2])
    if (m[1] === 'reviewer') reviewer = m[2]
  }
  return { urls: urls.length > 0 ? urls : URLS_DEFAULT, reviewer }
}

function slugifyUrl(url: string): string {
  const u = new URL(url)
  return u.pathname
    .replace(/\.html?$/i, '')
    .replace(/^\//, '')
    .replace(/[/_]+/g, '-')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

interface ExtractedContent {
  title: string
  excerpt: string
  contentHtml: string
}

function extractContent(html: string, sourceUrl: string): ExtractedContent {
  const $ = cheerio.load(html)
  $('script, style, noscript, nav, header, footer, .nav, .header, .footer, .sidebar, .menu, form, iframe').remove()

  const title =
    $('h1').first().text().trim()
    || $('meta[property="og:title"]').attr('content')?.trim()
    || $('title').text().trim()
    || sourceUrl

  const candidates = [
    'article',
    '.entry-content',
    '.post-content',
    '.content-wrap',
    'main',
    '#content',
  ]
  let mainEl = null as ReturnType<typeof $> | null
  for (const sel of candidates) {
    const el = $(sel).first()
    if (el.length && el.text().trim().length > 200) {
      mainEl = el
      break
    }
  }
  if (!mainEl) mainEl = $('body')

  const contentHtml = $.html(mainEl)

  const excerpt =
    $('meta[name="description"]').attr('content')?.trim()
    ?? $('meta[property="og:description"]').attr('content')?.trim()
    ?? mainEl.text().replace(/\s+/g, ' ').trim().slice(0, 200)

  return { title, excerpt, contentHtml }
}

function htmlToMarkdown(html: string): string {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' })
  td.remove(['script', 'style'])
  return td.turndown(html)
}

function rewriteInternalLinks(md: string, baseDomain = 'finanzteam26.de'): string {
  return md.replace(
    /\]\((https?:\/\/(?:www\.)?[^)]+|\/[^)]+)\)/g,
    (full, href) => {
      const isInternal =
        href.startsWith('/')
        || href.includes(baseDomain)
      if (!isInternal) return full
      // Behalte als externer Link mit nofollow (echter Re-Map auf LeadMonster-Slugs ist komplex)
      const url = href.startsWith('http')
        ? href
        : `https://${baseDomain}${href}`
      return `](${url} "extern: ${baseDomain}")`
    },
  )
}

function readingMinutes(text: string): number {
  const words = text.replace(/[#*`>\-|]/g, '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

async function main() {
  const { urls, reviewer } = parseArgs()
  console.log(`📰 Re-Import von ${urls.length} URLs aus finanzteam26.de`)

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!, { auth: { persistSession: false } })

  const { data: christian } = await supabase
    .from('redaktion').select('id').eq('slug', 'christian-wimmer').maybeSingle()
  if (!christian) {
    console.error('✗ Autor "christian-wimmer" nicht gefunden — erst seed-redaktion.ts laufen lassen.')
    process.exit(1)
  }
  const { data: reviewerRow } = reviewer
    ? await supabase.from('redaktion').select('id').eq('slug', reviewer).maybeSingle()
    : { data: christian }
  const reviewerId = (reviewerRow as { id: string } | null)?.id ?? christian.id

  let okCount = 0
  let errorCount = 0
  for (const url of urls) {
    try {
      console.log(`\n→ Fetch ${url}`)
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 LeadMonster Re-Import' },
      })
      if (!res.ok) {
        console.error(`  ✗ HTTP ${res.status}`)
        errorCount++
        continue
      }
      const html = await res.text()
      const { title, excerpt, contentHtml } = extractContent(html, url)
      const md = htmlToMarkdown(contentHtml)
      const safeMd = rewriteInternalLinks(md)
      const slug = slugifyUrl(url)

      const row = {
        slug,
        title,
        excerpt: excerpt.slice(0, 280),
        content_md: safeMd,
        author: 'Christian Wimmer',
        autor_id: christian.id,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        source_origin: 'finanzteam26',
        source_url: url,
        status: 'entwurf' as const,
        reading_time: readingMinutes(safeMd),
        kategorien: ['bu'],
        tags: ['re-import', 'finanzteam26'],
      }

      const { error } = await supabase
        .from('blog_posts')
        .upsert(row, { onConflict: 'slug' })
      if (error) {
        console.error(`  ✗ DB:`, error.message)
        errorCount++
      } else {
        okCount++
        console.log(`  ✓ ${slug} (${row.reading_time} Min)`)
      }
    } catch (err) {
      console.error(`  ✗ Fehler:`, err instanceof Error ? err.message : err)
      errorCount++
    }
  }

  console.log(`\n🎉 ${okCount}/${urls.length} importiert, ${errorCount} Fehler`)
  console.log('ℹ Status = "entwurf" — manuelles Review durch Christian + publizieren via Admin.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
