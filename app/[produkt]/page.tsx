// Public product landing page — statically generated with ISR hourly revalidation.
// Render-Logik liegt in app/_components/ProduktHauptseite (geteilt mit der
// Root-Route app/page.tsx).
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { buildProduktMetadata } from '@/lib/seo/metadata'
import { ROOT_PRODUKT_SLUG } from '@/lib/seo/organization'
import { loadEinstellung } from '@/lib/einstellungen/load'
import { ProduktHauptseite, loadProduktMetadata } from '@/app/_components/ProduktHauptseite'

// Re-render at most once per minute so freshly published content appears
// without admin needing to wait for a manual revalidation.
export const revalidate = 60
export const dynamicParams = true

// Pre-build all slugs that have a published hauptseite content row.
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('produkte')
      .select('slug, generierter_content!inner(status, page_type)')
      .eq('status', 'aktiv')
      .eq('generierter_content.page_type', 'hauptseite')
      .eq('generierter_content.status', 'publiziert')

    if (error || !data) {
      console.error('generateStaticParams: Supabase error', error)
      return []
    }

    // Root-Produkt wird unter `/` serviert (app/page.tsx) und per Redirect
    // aus next.config.mjs vom Slug-Pfad weitergeleitet — daher hier ausschließen.
    return data
      .filter(row => row.slug !== ROOT_PRODUKT_SLUG)
      .map(row => ({ produkt: row.slug }))
  } catch (err) {
    console.error('generateStaticParams: unexpected error', err)
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: { produkt: string }
}): Promise<Metadata> {
  const data = await loadProduktMetadata(params.produkt)
  if (!data) return { title: params.produkt }

  // Title-Suffix-Strategie (§ 8): Nicht-Sterbegeld-Produkte unter
  // sterbegeld24plus.de bekommen einen Brand-Suffix („Christian Wimmer
  // Versicherungsmakler") statt Domain im Title. Pro-Produkt-Override
  // übersteuert den globalen Default.
  const supabase = createAdminClient()
  const { data: produktRow } = await supabase
    .from('produkte')
    .select('typ, title_suffix_override')
    .eq('slug', params.produkt)
    .maybeSingle()

  let titleSuffix: string | null = null
  if (produktRow?.title_suffix_override) {
    titleSuffix = produktRow.title_suffix_override
  } else if (produktRow && produktRow.typ !== 'sterbegeld') {
    titleSuffix = await loadEinstellung('domain_title_suffix_default')
  }

  return buildProduktMetadata({
    slug: params.produkt,
    meta_title: data.meta_title ?? params.produkt,
    meta_desc: data.meta_desc ?? '',
    titleSuffix,
  })
}

export default async function ProduktPage({ params }: { params: { produkt: string } }) {
  return <ProduktHauptseite slug={params.produkt} />
}
