/**
 * Repair sterbegeld24plus ratgeber rows:
 * 1) Backfill missing `title` from slug map
 * 2) Normalize legacy section format
 * 3) Optionally regenerate wrong batch content via Anthropic (--regenerate)
 *
 * Cover images: use `npx tsx scripts/generate-ratgeber-bilder.ts --env=production`
 *
 * Usage:
 *   npx tsx scripts/fix-sterbegeld-ratgeber.ts
 *   npx tsx scripts/fix-sterbegeld-ratgeber.ts --slug=... --regenerate
 *   npx tsx scripts/fix-sterbegeld-ratgeber.ts --regenerate-all-wrong
 */
import { config as loadDotenv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { PageResponseSchemas } from '@/lib/anthropic/schemas'
import {
  getTitleForSlug,
  hasWrongLegacyContent,
  normalizeRatgeberSections,
} from '@/lib/ratgeber/normalize'
import { STERBEGELD_RATGEBER_THEMEN } from './sterbegeld-ratgeber-themen'

loadDotenv({ path: '.env.production.local' })

const PRODUKT_ID = 'fe1e6444-eaab-42df-8fa7-72ec644c3f9f'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('Missing Supabase env in .env.production.local')
  process.exit(1)
}

function parseArg(name: string): string | undefined {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))
  return m ? m.slice(name.length + 3) : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

const HINT_BY_SLUG = Object.fromEntries(
  STERBEGELD_RATGEBER_THEMEN.map(t => [t.slug, t.hinweis]),
)

async function regenerateArticle(
  anthropic: Anthropic,
  slug: string,
  wissensfundus: string,
): Promise<{
  title: string
  meta_title: string
  meta_desc: string
  sections: ReturnType<typeof normalizeRatgeberSections>
}> {
  const titel = getTitleForSlug(slug)
  const hinweis = HINT_BY_SLUG[slug] ?? ''

  const prompt = `${wissensfundus}

Schreibe einen ausführlichen Ratgeber-Artikel zum Thema "${titel}" für Sterbegeld24Plus.
${hinweis ? `Fokus: ${hinweis}` : ''}
Mindestens 500 Wörter, AEO-optimiert (direkte Antwort im ersten Satz jedes Abschnitts).
Schreibe NICHT über "Was ist eine Sterbegeldversicherung?" wenn das nicht das Thema ist.

Antworte mit GENAU diesem JSON (keine Markdown-Fences):
{
  "meta_title": "max 60 Zeichen",
  "meta_desc": "max 160 Zeichen",
  "schema_markup": { "@context": "https://schema.org", "@type": "Article", "headline": "...", "description": "..." },
  "sections": [
    { "type": "intro", "text": "..." },
    { "type": "body", "heading": "...", "paragraphs": ["...", "...", "..."] },
    { "type": "body", "heading": "...", "paragraphs": ["...", "...", "..."] },
    { "type": "steps", "heading": "So gehen Sie vor", "items": [
      { "number": 1, "title": "...", "description": "..." },
      { "number": 2, "title": "...", "description": "..." },
      { "number": 3, "title": "...", "description": "..." }
    ]},
    { "type": "cta", "headline": "Persönliches Angebot anfordern", "cta_text": "Kostenlos anfragen", "cta_anchor": "#formular" }
  ]
}`

  const res = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = res.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('No text in Claude response')

  const raw = block.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
  const parsed = JSON.parse(raw)
  const validated = PageResponseSchemas.ratgeber.parse(parsed)

  return {
    title: titel,
    meta_title: validated.meta_title,
    meta_desc: validated.meta_desc,
    sections: normalizeRatgeberSections(validated.sections),
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!)
  const onlySlug = parseArg('slug')
  const regenerate = hasFlag('regenerate') || hasFlag('regenerate-all-wrong')

  const { data: rows, error } = await supabase
    .from('generierter_content')
    .select('id, slug, title, meta_title, meta_desc, content, status')
    .eq('produkt_id', PRODUKT_ID)
    .eq('page_type', 'ratgeber')
    .order('slug')

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  let targets = rows ?? []
  if (onlySlug) targets = targets.filter(r => r.slug === onlySlug)

  console.log(`\n=== Fix ${targets.length} ratgeber rows ===\n`)

  let anthropic: Anthropic | null = null
  let wissensfundus = ''
  if (regenerate) {
    if (!ANTHROPIC_KEY) {
      console.error('--regenerate needs ANTHROPIC_API_KEY in .env.production.local')
      process.exit(1)
    }
    anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
    const { data: wissen } = await supabase
      .from('wissensfundus')
      .select('thema, inhalt')
      .in('kategorie', ['sterbegeld', 'allgemein'])
    wissensfundus =
      '## Wissensfundus\n\n' +
      (wissen ?? []).map(w => `### ${w.thema}\n${w.inhalt}`).join('\n\n')
  }

  for (const row of targets) {
    const slug = row.slug ?? ''
    if (!slug) continue

    const title = getTitleForSlug(slug)

    const content = (row.content ?? {}) as Record<string, unknown> & {
      sections?: unknown[]
      cover_image_url?: string
      cover_image_alt?: string
    }

    const needsRegen =
      regenerate &&
      anthropic &&
      (hasFlag('regenerate-all-wrong')
        ? hasWrongLegacyContent(row)
        : hasWrongLegacyContent(row) || hasFlag('regenerate'))

    let nextContent = { ...content }
    let nextTitle = row.title ?? title
    let nextMetaTitle = row.meta_title
    let nextMetaDesc = row.meta_desc

    if (needsRegen && anthropic) {
      console.log(`  ↻ Regenerating ${slug} …`)
      try {
        const out = await regenerateArticle(anthropic, slug, wissensfundus)
        nextContent = {
          ...nextContent,
          sections: out.sections,
          meta_title: out.meta_title,
          meta_desc: out.meta_desc,
        }
        nextTitle = out.title
        nextMetaTitle = out.meta_title
        nextMetaDesc = out.meta_desc
        console.log(`    ✓ new content (${out.sections.length} sections)`)
      } catch (err) {
        console.error(`    ✗ regen failed:`, err instanceof Error ? err.message : err)
      }
    } else if (content.sections) {
      nextContent.sections = normalizeRatgeberSections(content.sections)
    }

    const { error: upErr } = await supabase
      .from('generierter_content')
      .update({
        title: nextTitle || title,
        meta_title: nextMetaTitle,
        meta_desc: nextMetaDesc,
        content: nextContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (upErr) console.error(`  ✗ ${slug}: ${upErr.message}`)
    else {
      console.log(`  ✓ ${slug}: title="${title.slice(0, 40)}"`)
    }
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
