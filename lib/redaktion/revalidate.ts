/**
 * Revalidate public pages that render author data (AuthorByline).
 * Product/ratgeber pages use ISR — without these paths, admin saves look "stuck".
 */
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { ROOT_PRODUKT_SLUG } from '@/lib/seo/organization'

function produktHomePath(produktSlug: string): string {
  return produktSlug === ROOT_PRODUKT_SLUG ? '/' : `/${produktSlug}`
}

function contentPath(
  produktSlug: string,
  pageType: string,
  contentSlug: string | null,
): string | null {
  switch (pageType) {
    case 'hauptseite':
      return produktHomePath(produktSlug)
    case 'faq':
      return `/${produktSlug}/faq`
    case 'vergleich':
      return `/${produktSlug}/vergleich`
    case 'tarif':
      return `/${produktSlug}/tarife`
    case 'ratgeber':
      return contentSlug ? `/${produktSlug}/ratgeber/${contentSlug}` : null
    default:
      return null
  }
}

export async function revalidateRedaktionDependents(
  autorId: string,
  autorSlug: string,
): Promise<void> {
  revalidatePath('/redaktion')
  revalidatePath(`/redaktion/${autorSlug}`)

  const supabase = createAdminClient()
  const paths = new Set<string>()

  const { data: produkte } = await supabase
    .from('produkte')
    .select('slug')
    .eq('standard_autor_id', autorId)

  for (const p of produkte ?? []) {
    paths.add(produktHomePath(p.slug))
  }

  const { data: contentRows } = await supabase
    .from('generierter_content')
    .select('slug, page_type, produkte!inner(slug)')
    .or(`autor_id.eq.${autorId},reviewed_by.eq.${autorId}`)

  for (const row of contentRows ?? []) {
    const produktSlug = (row.produkte as { slug: string }).slug
    const path = contentPath(produktSlug, row.page_type, row.slug)
    if (path) paths.add(path)
  }

  const { data: blogRows } = await supabase
    .from('blog_posts')
    .select('slug')
    .or(`autor_id.eq.${autorId},reviewed_by.eq.${autorId}`)

  for (const row of blogRows ?? []) {
    paths.add(`/blog/${row.slug}`)
  }
  revalidatePath('/blog')

  const { data: wissenRows } = await supabase
    .from('wissensfundus')
    .select('slug')
    .or(`autor_id.eq.${autorId},reviewed_by.eq.${autorId}`)

  for (const row of wissenRows ?? []) {
    paths.add(`/wissen/${row.slug}`)
  }
  revalidatePath('/wissen')

  for (const path of paths) {
    revalidatePath(path)
  }
}
