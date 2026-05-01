/**
 * Post-Processing für generierten Content:
 *
 *   1. Auto-Cross-Linking (Wissensfundus → /wissen/<slug>)
 *      auf alle Markdown-/Body-Texte innerhalb der Sektionen.
 *
 *   2. Hero-Bild-Generierung über OpenAI gpt-image-1, sobald in der
 *      hauptseite-Sektion `type === 'hero'` ein Bild fehlt. Die URL
 *      wird in `produkte.hero_image_url` und in der jeweiligen Sektion
 *      gespeichert (Sektions-Feld `image_url`).
 *
 *   3. Ratgeber-Cover-Bild pro Ratgeber-Row: für jeden Ratgeber, dessen
 *      intro-Section noch kein image_url hat, wird ein Cover-Bild
 *      generiert (Storytelling-Prompt aus section-prompt.ts mit dem
 *      Ratgeber-Slug als contextHint, Style-Reference automatisch).
 *
 * Wird nach `generateContent()` aufgerufen oder direkt nach DB-Upsert.
 *
 *   import { postProcessProduct } from '@/lib/anthropic/post-processor'
 *   await postProcessProduct(produktId)
 */
import { createAdminClient } from '@/lib/supabase/server'
import { loadLinker } from '@/lib/linker/auto-link'
import { generateImage } from '@/lib/openai/image-generator'
import { buildHeroPrompt } from '@/lib/openai/hero-prompt'
import { buildSectionPrompt } from '@/lib/openai/section-prompt'

interface SectionLike {
  type: string
  [k: string]: unknown
}

/**
 * Wendet Auto-Linking auf String-Felder einer Sektion an.
 * Pure Funktion — gibt eine neue Sektion zurück.
 */
function linkifySection(section: SectionLike, linker: { linkify: (s: string) => string }): SectionLike {
  const out: SectionLike = { ...section }
  for (const [key, val] of Object.entries(section)) {
    if (typeof val === 'string') {
      out[key] = linker.linkify(val)
    } else if (Array.isArray(val)) {
      out[key] = val.map(item => {
        if (typeof item === 'string') return linker.linkify(item)
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          const next: Record<string, unknown> = { ...obj }
          for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string') next[k] = linker.linkify(v)
          }
          return next
        }
        return item
      })
    }
  }
  return out
}

export interface PostProcessOptions {
  generateImages?: boolean   // default true
  autoLink?: boolean         // default true
}

export interface PostProcessResult {
  produktId: string
  imageGenerated?: boolean
  imageUrl?: string
  /** Anzahl Ratgeber-Cover-Bilder, die in diesem Lauf neu generiert wurden. */
  ratgeberCoversGenerated?: number
  errors: string[]
}

export async function postProcessProduct(
  produktId: string,
  opts: PostProcessOptions = {},
): Promise<PostProcessResult> {
  const generateImages = opts.generateImages !== false
  const autoLink = opts.autoLink !== false
  const errors: string[] = []
  const result: PostProcessResult = { produktId, errors }

  const supabase = createAdminClient()

  // Produkt laden — inkl. Style-Reference + Config für Brand-konsistente
  // Bild-Prompts.
  const { data: produkt } = await supabase
    .from('produkte')
    .select(
      'id, name, slug, typ, hero_image_url, style_description, produkt_config(zielgruppe, fokus, anbieter, argumente)',
    )
    .eq('id', produktId)
    .single()

  if (!produkt) {
    errors.push('Produkt nicht gefunden')
    return result
  }

  // produkt_config kommt aus dem Join als Array — auf das erste Element flatten.
  const cfgRaw = (produkt as unknown as { produkt_config?: unknown }).produkt_config
  const cfg = (Array.isArray(cfgRaw) ? cfgRaw[0] : cfgRaw) as
    | {
        zielgruppe?: string[] | null
        fokus?: string | null
        anbieter?: string[] | null
        argumente?: Record<string, string> | null
      }
    | null

  const styleDescription =
    (produkt as { style_description?: string | null }).style_description ?? null

  const promptOptsForProdukt = {
    zielgruppe: cfg?.zielgruppe ?? null,
    fokus: cfg?.fokus ?? null,
    anbieter: cfg?.anbieter ?? null,
    argumente:
      cfg?.argumente != null && typeof cfg.argumente === 'object' && !Array.isArray(cfg.argumente)
        ? (cfg.argumente as Record<string, string>)
        : null,
    styleDescription,
  } as const

  // -------------------------------------------------------------------------
  // 1. Auto-Cross-Linking
  // -------------------------------------------------------------------------
  if (autoLink) {
    try {
      // Welche Ratgeber-Themen sind für DIESES Produkt vorhanden? Wenn ein
      // Wissensfundus-Slug auch als Produkt-Ratgeber existiert, linken wir
      // intern → /{produktSlug}/ratgeber/{slug} statt /wissen/{slug}.
      const { data: ratgeberRows } = await supabase
        .from('generierter_content')
        .select('slug')
        .eq('produkt_id', produktId)
        .eq('page_type', 'ratgeber')
        .eq('status', 'publiziert')
        .not('slug', 'is', null)

      const produktRatgeberSlugs = (ratgeberRows ?? [])
        .map(r => r.slug as string | null)
        .filter((s): s is string => s !== null && s.length > 0)

      const linker = await loadLinker({
        kategorie: produkt.typ as string,
        produktSlug: produkt.slug as string,
        produktRatgeberSlugs,
      })

      const { data: rows } = await supabase
        .from('generierter_content')
        .select('id, content')
        .eq('produkt_id', produktId)

      for (const row of rows ?? []) {
        const content = row.content as { sections?: SectionLike[] } | null
        if (!content?.sections) continue
        const newSections = content.sections.map(s => linkifySection(s, linker))
        const newContent = { ...content, sections: newSections }
        await supabase
          .from('generierter_content')
          .update({ content: newContent as unknown as never })
          .eq('id', row.id)
      }
    } catch (err) {
      errors.push(`Linker: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // -------------------------------------------------------------------------
  // 2. Hero-Bild generieren, falls nicht vorhanden
  // -------------------------------------------------------------------------
  if (generateImages && !produkt.hero_image_url) {
    try {
      const altText = `Hauptbild ${produkt.name}`
      const out = await generateImage({
        prompt: buildHeroPrompt(produkt.typ as string, promptOptsForProdukt),
        slot: 'hero',
        altText,
        produktId: produkt.id,
        pageType: 'hauptseite',
      })

      await supabase
        .from('produkte')
        .update({
          hero_image_url: out.url,
          hero_image_alt: altText,
        })
        .eq('id', produkt.id)

      // Hero-Sektion in der Hauptseite mit der Bild-URL anreichern
      const { data: hauptseiteRow } = await supabase
        .from('generierter_content')
        .select('id, content')
        .eq('produkt_id', produktId)
        .eq('page_type', 'hauptseite')
        .single()

      if (hauptseiteRow) {
        const content = hauptseiteRow.content as { sections?: SectionLike[] } | null
        if (content?.sections) {
          const newSections = content.sections.map(s =>
            s.type === 'hero' ? { ...s, image_url: out.url, image_alt: altText } : s,
          )
          await supabase
            .from('generierter_content')
            .update({ content: { ...content, sections: newSections } as unknown as never })
            .eq('id', hauptseiteRow.id)
        }
      }

      result.imageGenerated = true
      result.imageUrl = out.url
    } catch (err) {
      errors.push(`Bildgenerator: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // -------------------------------------------------------------------------
  // 3. Ratgeber-Cover-Bilder generieren — pro Ratgeber-Row eines, nur wenn
  //    die intro-Section noch kein image_url hat. Brand-Look bleibt
  //    konsistent: derselbe BRAND_LOOK aus hero-prompt.ts, aber mit
  //    Section-Beat "intro" und dem Ratgeber-Slug als contextHint.
  // -------------------------------------------------------------------------
  if (generateImages) {
    let coversCount = 0
    try {
      const { data: ratgeberRows } = await supabase
        .from('generierter_content')
        .select('id, slug, content, title')
        .eq('produkt_id', produktId)
        .eq('page_type', 'ratgeber')

      for (const row of ratgeberRows ?? []) {
        const content = row.content as { sections?: SectionLike[] } | null
        if (!content?.sections) continue

        const introIdx = content.sections.findIndex(s => s.type === 'intro')
        if (introIdx === -1) continue

        const intro = content.sections[introIdx] as SectionLike & { image_url?: string | null }
        if (intro.image_url && typeof intro.image_url === 'string' && intro.image_url.length > 0) {
          // Cover bereits gesetzt — überspringen.
          continue
        }

        const slug = (row as { slug?: string | null }).slug ?? 'ratgeber'
        const titleHint =
          (typeof intro.text === 'string' ? intro.text.slice(0, 80) : '') ||
          (row as { title?: string | null }).title ||
          slug.replace(/-/g, ' ')

        try {
          const altText = `Cover ${produkt.name}: ${slug}`
          const prompt = buildSectionPrompt({
            produktTyp: produkt.typ as string,
            sectionType: 'intro',
            slot: 'hero',
            contextHint: titleHint,
            zielgruppe: promptOptsForProdukt.zielgruppe,
            fokus: promptOptsForProdukt.fokus,
            argumente: promptOptsForProdukt.argumente,
            styleDescription,
          })

          const out = await generateImage({
            prompt,
            slot: 'hero',
            altText,
            produktId: produkt.id,
            pageType: 'ratgeber',
          })

          // intro-Section um image_url + image_alt erweitern.
          const newSections = content.sections.map((s, i) =>
            i === introIdx ? { ...s, image_url: out.url, image_alt: altText } : s,
          )
          await supabase
            .from('generierter_content')
            .update({ content: { ...content, sections: newSections } as unknown as never })
            .eq('id', (row as { id: string }).id)

          coversCount++
        } catch (err) {
          errors.push(
            `Ratgeber-Cover ${slug}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      }
    } catch (err) {
      errors.push(`Ratgeber-Cover-Loop: ${err instanceof Error ? err.message : String(err)}`)
    }
    result.ratgeberCoversGenerated = coversCount
  }

  return result
}
