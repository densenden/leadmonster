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
 * Wird nach `generateContent()` aufgerufen oder direkt nach DB-Upsert.
 *
 *   import { postProcessProduct } from '@/lib/anthropic/post-processor'
 *   await postProcessProduct(produktId)
 */
import { createAdminClient } from '@/lib/supabase/server'
import { loadLinker } from '@/lib/linker/auto-link'
import { generateImage, defaultHeroPrompt } from '@/lib/openai/image-generator'

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

  // Produkt laden
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, name, slug, typ, hero_image_url')
    .eq('id', produktId)
    .single()

  if (!produkt) {
    errors.push('Produkt nicht gefunden')
    return result
  }

  // -------------------------------------------------------------------------
  // 1. Auto-Cross-Linking
  // -------------------------------------------------------------------------
  if (autoLink) {
    try {
      const linker = await loadLinker({ kategorie: produkt.typ as string })

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
        prompt: defaultHeroPrompt(produkt.typ as string),
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

  return result
}
