// Anbieter-Landingpage — DB-getrieben, mit Schema.org Product + Offer + FAQPage.
// Beispiel: /sterbegeld24plus/anbieter/allianz
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { loadAnbieterDetail, loadAnbieterForProdukt, slugifyAnbieter } from '@/lib/anbieter/load'
import { BesonderheitenTable, BesonderheitenFaqList } from '@/components/sections/Besonderheiten'
import { LeadForm } from '@/components/sections/LeadForm'
import { resolveDatenschutzHref } from '@/lib/privacy/lead-consent'
import { combineSchemas, buildBreadcrumbSchema } from '@/lib/seo/schema'

export const revalidate = 3600

interface PageProps {
  params: { produkt: string; slug: string }
}

export async function generateStaticParams() {
  const supabase = createAdminClient()
  const { data: produkte } = await supabase
    .from('produkte')
    .select('id, slug')
    .eq('status', 'aktiv')
  const params: { produkt: string; slug: string }[] = []
  for (const p of produkte ?? []) {
    const list = await loadAnbieterForProdukt(p.id)
    for (const a of list) {
      params.push({ produkt: p.slug, slug: slugifyAnbieter(a.anbieter_name) })
    }
  }
  return params
}

async function getContext(produktSlug: string, anbieterSlug: string) {
  const supabase = createAdminClient()
  const { data: produkt } = await supabase
    .from('produkte')
    .select('id, name, typ, slug, hero_image_url, hero_image_alt')
    .eq('slug', produktSlug)
    .maybeSingle()
  if (!produkt) return null

  const aggregat = await loadAnbieterDetail(produkt.id, anbieterSlug)
  if (!aggregat) return null

  return { produkt, aggregat }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const ctx = await getContext(params.produkt, params.slug)
  if (!ctx) return { title: 'Anbieter nicht gefunden', robots: { index: false } }
  const { produkt, aggregat } = ctx
  const title = `${aggregat.anbieter_name} ${produkt.name} — Tarif, Beitrag & Bedingungen`
  const desc = `${aggregat.anbieter_name} ${produkt.name}: Beitrag ab ${aggregat.beitrag_min.toFixed(2)} € pro Monat. ${aggregat.gesundheitspruefung ? 'Mit' : 'Ohne'} Gesundheitsprüfung, Wartezeit ${aggregat.wartezeit_min_monate ?? aggregat.wartezeit_alt_monate ?? '—'} Monate.`
  return {
    title,
    description: desc,
  }
}

export default async function AnbieterPage({ params }: PageProps) {
  const ctx = await getContext(params.produkt, params.slug)
  if (!ctx) notFound()
  const { produkt, aggregat } = ctx

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://finanzteam26.de'
  const canonical = `${baseUrl}/${params.produkt}/anbieter/${params.slug}`

  // Product + Offer-Schema (Anbieter-spezifisch)
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${aggregat.anbieter_name} ${produkt.name}`,
    brand: { '@type': 'Brand', name: aggregat.anbieter_name },
    description: `${produkt.name} der ${aggregat.anbieter_name} — Beitrag ab ${aggregat.beitrag_min.toFixed(2)} € pro Monat.`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: aggregat.beitrag_min.toFixed(2),
      highPrice: aggregat.beitrag_max.toFixed(2),
      offerCount: aggregat.tarif_count,
      url: canonical,
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Wartezeit (Monate)', value: aggregat.wartezeit_min_monate ?? aggregat.wartezeit_alt_monate ?? 'k. A.' },
      { '@type': 'PropertyValue', name: 'Gesundheitsprüfung', value: aggregat.gesundheitspruefung ? 'ja' : 'nein' },
      { '@type': 'PropertyValue', name: 'Doppelte Auszahlung Unfalltod', value: aggregat.doppelte_unfall ? 'ja' : 'nein' },
      { '@type': 'PropertyValue', name: 'Rückholung Ausland', value: aggregat.rueckholung ? 'ja' : 'nein' },
      { '@type': 'PropertyValue', name: 'Lebenslange Beitragszahlung', value: aggregat.lebenslang ? 'ja' : 'nein' },
      { '@type': 'PropertyValue', name: 'Eintrittsalter', value: `${aggregat.alter_von_min}-${aggregat.alter_bis_max}` },
    ],
  }

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Startseite', url: baseUrl },
    { name: produkt.name, url: `${baseUrl}/${params.produkt}` },
    { name: 'Anbieter', url: `${baseUrl}/${params.produkt}/vergleichsrechner` },
    { name: aggregat.anbieter_name, url: canonical },
  ])

  const combined = combineSchemas(productSchema, breadcrumb)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: combined }}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-[#666] flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/${params.produkt}`} className="hover:text-[#02a9e6]">{produkt.name}</Link>
          <span className="mx-2">›</span>
          <Link href={`/${params.produkt}/vergleichsrechner`} className="hover:text-[#02a9e6]">Anbieter-Vergleich</Link>
          <span className="mx-2">›</span>
          <span className="text-[#333]">{aggregat.anbieter_name}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-[#02a9e6] font-semibold mb-2">
            {produkt.name} · Anbieter-Detail
          </p>
          <h1 className="font-heading font-bold text-[#1a365d] text-3xl md:text-4xl leading-tight mb-3">
            {aggregat.anbieter_name} {produkt.name} — Komplett-Übersicht
          </h1>
          <p className="text-lg text-[#4a5568]">
            Alle Bedingungen, Beiträge und Besonderheiten der{' '}
            <strong>{aggregat.anbieter_name}-{produkt.name}</strong> auf einen Blick — aus
            unserer Marktbeobachtung als unabhängiger Versicherungsmakler.
          </p>
        </header>

        <BesonderheitenTable aggregat={aggregat} />

        <BesonderheitenFaqList aggregat={aggregat} />

        {/* Lead-Form */}
        <section className="mt-12 rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="text-2xl font-bold text-[#1a365d] mb-2">
            Persönliches {aggregat.anbieter_name}-Angebot anfordern
          </h2>
          <p className="text-sm text-[#666] mb-6">
            Unverbindlich, kostenfrei. Wir vergleichen für Sie die {aggregat.anbieter_name}-{produkt.name}{' '}
            mit allen anderen am Markt aktiven Tarifen.
          </p>
          <LeadForm
            formId="lead-form-anbieter"
            produktId={produkt.id}
            zielgruppeTag="senioren_50plus"
            intentTag="preis"
            datenschutzHref={resolveDatenschutzHref(params.produkt)}
          />
        </section>

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-[#999] leading-relaxed">
          Werte aus interner Marktbeobachtung, Stand{' '}
          {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}.
          Verbindliches Angebot nach Anfrage. Tatsächlicher Beitrag kann je nach
          Gesundheitsprüfung und individuellem Risiko abweichen.
        </p>

        <div className="mt-8">
          <Link
            href={`/${params.produkt}/vergleichsrechner`}
            className="text-sm text-[#1a365d] hover:underline"
          >
            ← Alle Anbieter vergleichen
          </Link>
        </div>
      </main>
    </>
  )
}
