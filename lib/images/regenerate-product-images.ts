/**
 * Sequential AI image regeneration for one product (hero + section images + ratgeber).
 * Used by scripts/regenerate-all-images.ts — mirrors admin hero/section pipelines.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'
import { generateImage, type ImageSlot } from '@/lib/openai/image-generator'
import { buildHeroPrompt } from '@/lib/openai/hero-prompt'
import { buildSectionPrompt } from '@/lib/openai/section-prompt'
import { getTitleForSlug } from '@/lib/ratgeber/normalize'

type AdminClient = SupabaseClient<Database>

interface SectionLike {
  type: string
  [key: string]: unknown
}

export interface ProduktPromptContext {
  id: string
  name: string
  slug: string
  typ: string
  styleDescription: string | null
  zielgruppe: string[] | null
  fokus: string | null
  anbieter: string[] | null
  argumente: Record<string, string> | null
}

export interface RegenerateImageJob {
  key: string
  label: string
  prompt: string
  slot: ImageSlot
  altText: string
  pageType: string
}

export interface RegenerateProgress {
  key: string
  label: string
  url?: string
  error?: string
}

export interface RegenerateAllResult {
  produktId: string
  generated: number
  failed: number
  skipped: number
  items: RegenerateProgress[]
}

function sectionContextHint(section: SectionLike): string {
  const parts = [
    section.headline,
    section.eyebrow,
    section.body,
    section.text,
    section.heading,
    section.quote,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  return parts.join(' ').replace(/\s+/g, ' ').slice(0, 220)
}

function promptOpts(ctx: ProduktPromptContext) {
  return {
    zielgruppe: ctx.zielgruppe,
    fokus: ctx.fokus,
    anbieter: ctx.anbieter,
    argumente: ctx.argumente,
    styleDescription: ctx.styleDescription,
  }
}

export function buildHeroJob(ctx: ProduktPromptContext): RegenerateImageJob {
  const altText = `Hauptbild ${ctx.name}`
  return {
    key: 'hero',
    label: 'Hero / Header',
    prompt: buildHeroPrompt(ctx.typ, promptOpts(ctx)),
    slot: 'hero',
    altText,
    pageType: 'hauptseite',
  }
}

/** Collect every image slot on the hauptseite that should get a fresh AI image. */
export function collectHauptseiteJobs(
  ctx: ProduktPromptContext,
  sections: SectionLike[],
): RegenerateImageJob[] {
  const jobs: RegenerateImageJob[] = []
  sections.forEach((section, index) => {
    if (section.type === 'image_text_split') {
      const hint = sectionContextHint(section)
      jobs.push({
        key: `hauptseite-section-${index}`,
        label: `Hauptseite — ${String(section.headline ?? section.eyebrow ?? 'image_text_split')}`,
        prompt: buildSectionPrompt({
          produktTyp: ctx.typ,
          sectionType: 'body',
          slot: 'inline',
          contextHint: hint,
          ...promptOpts(ctx),
        }),
        slot: 'inline',
        altText: String(section.image_alt ?? section.headline ?? `Illustration ${ctx.name}`),
        pageType: `hauptseite_section_${index}`,
      })
    }
  })
  return jobs
}

export function collectRatgeberJobs(
  ctx: ProduktPromptContext,
  slug: string,
  title: string | null,
  metaDesc: string | null,
  sections: SectionLike[],
): RegenerateImageJob[] {
  const displayTitle = title?.trim() || getTitleForSlug(slug)
  const topicHint = metaDesc?.slice(0, 220) ?? displayTitle
  const jobs: RegenerateImageJob[] = []

  jobs.push({
    key: `ratgeber-${slug}-cover`,
    label: `Ratgeber Cover — ${slug}`,
    prompt: buildSectionPrompt({
      produktTyp: ctx.typ,
      sectionType: 'intro',
      slot: 'blog_cover',
      contextHint: topicHint,
      ...promptOpts(ctx),
    }),
    slot: 'blog_cover',
    altText: `Beitragsbild: ${displayTitle} — ${ctx.name}`,
    pageType: `ratgeber_${slug}`,
  })

  sections.forEach((section, index) => {
    if (section.type !== 'image_text') return

    const hint = sectionContextHint(section) || topicHint

    jobs.push({
      key: `ratgeber-${slug}-section-${index}`,
      label: `Ratgeber ${slug} — image_text #${index}`,
      prompt: buildSectionPrompt({
        produktTyp: ctx.typ,
        sectionType: 'body',
        slot: 'inline',
        contextHint: hint,
        ...promptOpts(ctx),
      }),
      slot: 'inline',
      altText: String(
        section.image_alt ?? section.heading ?? `Illustration: ${displayTitle}`,
      ),
      pageType: `ratgeber_${slug}_image_text_${index}`,
    })
  })

  return jobs
}

async function applyHeroUpdate(
  supabase: AdminClient,
  produktId: string,
  url: string,
  altText: string,
): Promise<void> {
  await supabase
    .from('produkte')
    .update({ hero_image_url: url, hero_image_alt: altText })
    .eq('id', produktId)

  const { data: row } = await supabase
    .from('generierter_content')
    .select('id, content')
    .eq('produkt_id', produktId)
    .eq('page_type', 'hauptseite')
    .maybeSingle()

  if (!row?.content) return
  const content = row.content as { sections?: SectionLike[] }
  if (!content.sections) return

  const sections = content.sections.map(s =>
    s.type === 'hero' ? { ...s, image_url: url, image_alt: altText } : s,
  )
  await supabase
    .from('generierter_content')
    .update({ content: { ...content, sections } as unknown as Json })
    .eq('id', row.id)
}

async function applyHauptseiteSectionUpdate(
  supabase: AdminClient,
  produktId: string,
  sectionIndex: number,
  url: string,
  altText: string,
): Promise<void> {
  const { data: row } = await supabase
    .from('generierter_content')
    .select('id, content')
    .eq('produkt_id', produktId)
    .eq('page_type', 'hauptseite')
    .maybeSingle()
  if (!row?.content) return

  const content = row.content as { sections?: SectionLike[] }
  if (!content.sections?.[sectionIndex]) return

  const sections = [...content.sections]
  sections[sectionIndex] = { ...sections[sectionIndex], image_url: url, image_alt: altText }

  await supabase
    .from('generierter_content')
    .update({ content: { ...content, sections } as unknown as Json })
    .eq('id', row.id)
}

async function applyRatgeberUpdates(
  supabase: AdminClient,
  rowId: string,
  slug: string,
  sections: SectionLike[],
  coverUrl: string,
  coverAlt: string,
  sectionPatches: Map<number, { url: string; alt: string }>,
): Promise<void> {
  const newSections = sections.map((s, i) => {
    const patch = sectionPatches.get(i)
    if (patch) return { ...s, image_url: patch.url, image_alt: patch.alt }
    if (s.type === 'intro' && coverUrl) {
      return { ...s, image_url: coverUrl, image_alt: coverAlt }
    }
    return s
  })

  const content = {
    sections: newSections,
    cover_image_url: coverUrl,
    cover_image_alt: coverAlt,
  }

  await supabase
    .from('generierter_content')
    .update({ content: content as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', rowId)
}

export async function loadProduktContext(
  supabase: AdminClient,
  slug: string,
): Promise<ProduktPromptContext | null> {
  const { data } = await supabase
    .from('produkte')
    .select(
      'id, name, slug, typ, style_description, produkt_config(zielgruppe, fokus, anbieter, argumente)',
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return null

  const cfgRaw = (data as { produkt_config?: unknown }).produkt_config
  const cfg = (Array.isArray(cfgRaw) ? cfgRaw[0] : cfgRaw) as
    | {
        zielgruppe?: string[] | null
        fokus?: string | null
        anbieter?: string[] | null
        argumente?: Record<string, string> | null
      }
    | null

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    typ: data.typ,
    styleDescription: (data as { style_description?: string | null }).style_description ?? null,
    zielgruppe: cfg?.zielgruppe ?? null,
    fokus: cfg?.fokus ?? null,
    anbieter: cfg?.anbieter ?? null,
    argumente:
      cfg?.argumente != null && typeof cfg.argumente === 'object' && !Array.isArray(cfg.argumente)
        ? (cfg.argumente as Record<string, string>)
        : null,
  }
}

export async function regenerateAllProductImages(
  supabase: AdminClient,
  ctx: ProduktPromptContext,
  options: { delayMs?: number; onProgress?: (msg: string) => void } = {},
): Promise<RegenerateAllResult> {
  const delayMs = options.delayMs ?? 1500
  const log = options.onProgress ?? (() => {})
  const result: RegenerateAllResult = {
    produktId: ctx.id,
    generated: 0,
    failed: 0,
    skipped: 0,
    items: [],
  }

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  // ── 1. Hero ─────────────────────────────────────────────────────────────
  const heroJob = buildHeroJob(ctx)
  log(`[1/N] ${heroJob.label} …`)
  try {
    const out = await generateImage({
      prompt: heroJob.prompt,
      slot: heroJob.slot,
      altText: heroJob.altText,
      produktId: ctx.id,
      pageType: heroJob.pageType,
    })
    await applyHeroUpdate(supabase, ctx.id, out.url, out.alt)
    result.generated++
    result.items.push({ key: heroJob.key, label: heroJob.label, url: out.url })
    log(`  ✓ ${out.url.slice(0, 80)}…`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    result.failed++
    result.items.push({ key: heroJob.key, label: heroJob.label, error: message })
    log(`  ✗ ${message}`)
  }
  await sleep(delayMs)

  // ── 2. Hauptseite section images ────────────────────────────────────────
  const { data: hauptRow } = await supabase
    .from('generierter_content')
    .select('content')
    .eq('produkt_id', ctx.id)
    .eq('page_type', 'hauptseite')
    .maybeSingle()

  const hauptSections = ((hauptRow?.content as { sections?: SectionLike[] })?.sections ?? [])
  const hauptJobs = collectHauptseiteJobs(ctx, hauptSections)

  for (let i = 0; i < hauptJobs.length; i++) {
    const job = hauptJobs[i]
    const sectionIndex = Number(job.key.split('-').pop())
    log(`[hauptseite ${i + 1}/${hauptJobs.length}] ${job.label} …`)
    try {
      const out = await generateImage({
        prompt: job.prompt,
        slot: job.slot,
        altText: job.altText,
        produktId: ctx.id,
        pageType: job.pageType,
      })
      await applyHauptseiteSectionUpdate(supabase, ctx.id, sectionIndex, out.url, out.alt)
      result.generated++
      result.items.push({ key: job.key, label: job.label, url: out.url })
      log(`  ✓ done`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.failed++
      result.items.push({ key: job.key, label: job.label, error: message })
      log(`  ✗ ${message}`)
    }
    await sleep(delayMs)
  }

  // ── 3. Ratgeber — one article at a time ─────────────────────────────────
  const { data: ratgeberRows } = await supabase
    .from('generierter_content')
    .select('id, slug, title, meta_desc, content')
    .eq('produkt_id', ctx.id)
    .eq('page_type', 'ratgeber')
    .order('slug')

  const ratgeberList = ratgeberRows ?? []
  log(`\nRatgeber: ${ratgeberList.length} articles\n`)

  for (let r = 0; r < ratgeberList.length; r++) {
    const row = ratgeberList[r]
    const slug = row.slug as string
    const content = row.content as { sections?: SectionLike[] } | null
    const sections = content?.sections ?? []
    const jobs = collectRatgeberJobs(
      ctx,
      slug,
      row.title,
      row.meta_desc,
      sections,
    )

    log(`── Ratgeber ${r + 1}/${ratgeberList.length}: ${slug} (${jobs.length} images) ──`)

    let coverUrl = ''
    let coverAlt = ''
    const sectionPatches = new Map<number, { url: string; alt: string }>()

    for (const job of jobs) {
      log(`  ▸ ${job.label} …`)
      try {
        const out = await generateImage({
          prompt: job.prompt,
          slot: job.slot,
          altText: job.altText,
          produktId: ctx.id,
          pageType: job.pageType,
        })

        if (job.key.endsWith('-cover')) {
          coverUrl = out.url
          coverAlt = out.alt
        } else {
          const m = job.key.match(/section-(\d+)$/)
          if (m) {
            sectionPatches.set(Number(m[1]), { url: out.url, alt: out.alt })
          }
        }

        result.generated++
        result.items.push({ key: job.key, label: job.label, url: out.url })
        log(`    ✓`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        result.failed++
        result.items.push({ key: job.key, label: job.label, error: message })
        log(`    ✗ ${message}`)
      }
      await sleep(delayMs)
    }

    if (coverUrl) {
      await applyRatgeberUpdates(
        supabase,
        row.id,
        slug,
        sections,
        coverUrl,
        coverAlt,
        sectionPatches,
      )
      log(`  → DB updated for ${slug}\n`)
    }
  }

  return result
}
