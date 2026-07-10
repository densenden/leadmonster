/**
 * Persist hero image on produkte + sync into hauptseite hero section.
 * Used by generate (POST) and library pick (PATCH) flows.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

interface SectionLike {
  type: string
  [k: string]: unknown
}

export async function applyHeroImageToProdukt(
  supabase: SupabaseClient,
  produktId: string,
  url: string,
  altText: string,
): Promise<void> {
  const { error: updateError } = await supabase
    .from('produkte')
    .update({ hero_image_url: url, hero_image_alt: altText })
    .eq('id', produktId)

  if (updateError) {
    throw new Error(`produkte-Update fehlgeschlagen: ${updateError.message}`)
  }

  const { data: hauptseiteRow } = await supabase
    .from('generierter_content')
    .select('id, content')
    .eq('produkt_id', produktId)
    .eq('page_type', 'hauptseite')
    .maybeSingle()

  if (!hauptseiteRow?.content) return

  const content = hauptseiteRow.content as { sections?: SectionLike[] } | null
  if (!content?.sections) return

  const newSections = content.sections.map(s =>
    s.type === 'hero' ? { ...s, image_url: url, image_alt: altText } : s,
  )

  await supabase
    .from('generierter_content')
    .update({ content: { ...content, sections: newSections } as unknown as never })
    .eq('id', hauptseiteRow.id)
}
