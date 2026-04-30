// Supabase query functions for Ratgeber (guide article) data access.
// All calls use the service-role admin client — never the browser client in server code.
import { createAdminClient } from '@/lib/supabase/server'
import type { GenerierterContentRow, RatgeberContent } from '@/lib/types/ratgeber'

// ---------------------------------------------------------------------------
// Internal cast helper
// ---------------------------------------------------------------------------

// Safely cast a raw Supabase Json value to RatgeberContent.
// Returns null when the value is missing or not a plain object with a sections array.
function castToRatgeberContent(raw: unknown): RatgeberContent | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.sections)) return null
  return obj as unknown as RatgeberContent
}

// Safely cast a raw schema_markup value to a typed record.
function castToSchemaMarkup(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Fetch all published ratgeber articles for a product slug
// ---------------------------------------------------------------------------

/** Subset of columns needed for the index/listing page. */
export interface RatgeberListItem {
  id: string
  slug: string | null
  title: string | null
  meta_desc: string | null
  content: RatgeberContent | null
  published_at: string | null
}

/**
 * Fetch all published ratgeber rows for the given product slug.
 *
 * Joins produkte + generierter_content on produkt_id.
 * Produkt status = 'aktiv', content status = 'publiziert'.
 * Results are ordered by generated_at ascending so older articles appear first.
 */
export async function fetchAllRatgeberForProdukt(
  produktSlug: string,
): Promise<RatgeberListItem[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('generierter_content')
    .select('id, slug, title, content, meta_desc, published_at, produkte!inner(slug, status)')
    .eq('page_type', 'ratgeber')
    .eq('status', 'publiziert')
    .eq('produkte.slug', produktSlug)
    .eq('produkte.status', 'aktiv')
    .order('generated_at', { ascending: true })

  if (error || !data) {
    if (error) {
      console.warn('fetchAllRatgeberForProdukt error:', error.message)
    }
    return []
  }

  return data.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    meta_desc: row.meta_desc,
    content: castToRatgeberContent(row.content),
    published_at: row.published_at,
  }))
}

// ---------------------------------------------------------------------------
// Fetch a single ratgeber article by product slug + article slug
// ---------------------------------------------------------------------------

/**
 * Fetch a single published ratgeber row matching the product slug + article slug.
 *
 * Returns null when no matching published row is found — callers should invoke notFound().
 */
export async function fetchRatgeberBySlug(
  produktSlug: string,
  thema: string,
): Promise<GenerierterContentRow | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('generierter_content')
    .select(
      'id, slug, title, meta_title, meta_desc, content, schema_markup, status, generated_at, published_at, produkt_id, page_type, produkte!inner(slug, status)',
    )
    .eq('page_type', 'ratgeber')
    .eq('slug', thema)
    .eq('status', 'publiziert')
    .eq('produkte.slug', produktSlug)
    .eq('produkte.status', 'aktiv')
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    produkt_id: data.produkt_id,
    page_type: data.page_type,
    slug: data.slug,
    title: data.title,
    meta_title: data.meta_title,
    meta_desc: data.meta_desc,
    content: castToRatgeberContent(data.content),
    schema_markup: castToSchemaMarkup(data.schema_markup),
    status: data.status as GenerierterContentRow['status'],
    generated_at: data.generated_at,
    published_at: data.published_at,
  }
}

// ---------------------------------------------------------------------------
// Fetch all published params for generateStaticParams
// ---------------------------------------------------------------------------

/** Shape used by Next.js generateStaticParams for the [produkt]/ratgeber/[thema] route. */
export interface RatgeberStaticParam {
  produkt: string
  thema: string
}

/**
 * Fetch all { produkt, thema } param pairs for statically pre-building article pages.
 *
 * Produkt status = 'aktiv', content status = 'publiziert'.
 */
export async function fetchAllPublishedRatgeberParams(): Promise<RatgeberStaticParam[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('generierter_content')
    .select('slug, produkte!inner(slug, status)')
    .eq('page_type', 'ratgeber')
    .eq('status', 'publiziert')
    .eq('produkte.status', 'aktiv')

  if (error || !data) {
    if (error) {
      console.warn('fetchAllPublishedRatgeberParams error:', error.message)
    }
    return []
  }

  return data
    .filter(row => row.slug && (row.produkte as { slug?: string })?.slug)
    .map(row => ({
      produkt: (row.produkte as { slug: string }).slug,
      thema: row.slug as string,
    }))
}
