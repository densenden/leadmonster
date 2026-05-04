// Root-Page: rendert das in lib/seo/organization.ts:ROOT_PRODUKT_SLUG
// definierte Produkt unter `/`. Single-Domain-Strategie aus § 8.
//
// /sterbegeld24plus wird per next.config.mjs auf `/` umgeleitet (301).
// Sub-Routen (/sterbegeld24plus/faq, /vergleichsrechner etc.) bleiben unter
// dem alten Pfad — siehe Plan Phase 2.
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveAccentColor } from '@/lib/utils/accent'
import { buildProduktMetadata } from '@/lib/seo/metadata'
import { resolveBaseUrl, ROOT_PRODUKT_SLUG } from '@/lib/seo/organization'
import { ProduktChrome } from '@/app/_components/ProduktChrome'
import { ProduktHauptseite, loadProduktMetadata } from '@/app/_components/ProduktHauptseite'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadProduktMetadata(ROOT_PRODUKT_SLUG)
  if (!data) {
    return { title: 'Sterbegeld24Plus' }
  }

  const meta = buildProduktMetadata({
    slug: ROOT_PRODUKT_SLUG,
    meta_title: data.meta_title ?? 'Sterbegeld24Plus',
    meta_desc: data.meta_desc ?? '',
  })

  // Override canonical: Root-Produkt lebt unter `/`, nicht unter `/<slug>`.
  const baseUrl = resolveBaseUrl()
  const rootCanonical = `${baseUrl}/`
  return {
    ...meta,
    alternates: { canonical: rootCanonical },
    openGraph: meta.openGraph ? { ...meta.openGraph, url: rootCanonical } : undefined,
  }
}

export default async function HomePage() {
  // Lade Brand-Daten für ProduktChrome (Header/Footer).
  let produktName = 'Sterbegeld24Plus'
  let accentColor = '#02a9e6'
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('produkte')
      .select('name, typ, accent_color')
      .eq('slug', ROOT_PRODUKT_SLUG)
      .maybeSingle()
    if (data) {
      produktName = data.name
      accentColor = resolveAccentColor(data.typ, data.accent_color)
    }
  } catch {
    // Keep defaults
  }

  return (
    <ProduktChrome
      slug={ROOT_PRODUKT_SLUG}
      name={produktName}
      accentColor={accentColor}
      homePath="/"
      legalPathPrefix=""
    >
      <ProduktHauptseite slug={ROOT_PRODUKT_SLUG} isRoot />
    </ProduktChrome>
  )
}
