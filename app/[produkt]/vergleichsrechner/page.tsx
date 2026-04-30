// Standalone-Route für den VergleichsRechner pro Produkt.
// Eigene URL für SEO/AEO — Suchintention "{Produkt} Vergleich" landet hier.
// Initial-Daten (Alter 65, 8000 EUR) werden serverseitig vorgerendert,
// damit die Tabelle schon ohne JS sichtbar ist; danach übernimmt die
// Client-Komponente die Live-Aktualisierung über /api/vergleich-tarife.
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { VergleichsRechner } from '@/components/sections/VergleichsRechner'
import { lookupVergleichTarife } from '@/lib/tarife/lookup'
import { getProduktConfig } from '@/lib/tarife/produkt-config'
import { generateVergleichSchema } from '@/lib/seo/schema'

export const revalidate = 3600

interface PageProps {
  params: { produkt: string }
}

interface ProduktRow {
  id: string
  slug: string
  name: string
  typ: string
  status: string
}

async function fetchProdukt(slug: string): Promise<ProduktRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('produkte')
    .select('id, slug, name, typ, status')
    .eq('slug', slug)
    .single()
  return data ?? null
}

export async function generateStaticParams() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('produkte').select('slug').eq('status', 'aktiv')
    return (data ?? []).map(row => ({ produkt: row.slug }))
  } catch (err) {
    console.error('generateStaticParams (vergleichsrechner): error', err)
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const produkt = await fetchProdukt(params.produkt)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://leadmonster.de'
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`
  const canonical = `${origin}/${params.produkt}/vergleichsrechner`

  if (!produkt) {
    return {
      title: 'Anbieter-Vergleichsrechner',
      description: 'Vergleichen Sie Anbietertarife in Echtzeit.',
      alternates: { canonical },
    }
  }

  const year = new Date().getFullYear()
  const title = `${produkt.name} Vergleichsrechner ${year}`.slice(0, 60)
  const description = `${produkt.name} Anbietertarife im Direktvergleich — Geburtsjahr und Wunschsumme eingeben, Beiträge sofort sehen, Beratung anfordern.`.slice(
    0,
    160,
  )

  return {
    title,
    description,
    alternates: { canonical },
    robots:
      produkt.status === 'aktiv'
        ? { index: true, follow: true }
        : { index: false, follow: false },
  }
}

export default async function VergleichsRechnerPage({ params }: PageProps) {
  const produkt = await fetchProdukt(params.produkt)
  if (!produkt || produkt.status !== 'aktiv') {
    notFound()
  }

  const config = getProduktConfig(produkt.typ)
  const initialData = await lookupVergleichTarife(
    produkt.id,
    config.default_age,
    config.default_summe,
  )
  const distinctAnbieter = Array.from(new Set(initialData.map(t => t.anbieter_name)))

  const schema = generateVergleichSchema({
    anbieter: distinctAnbieter,
    produktName: produkt.name,
    produktTyp: produkt.typ,
    produktSlug: produkt.slug,
    criteria: [],
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-0 py-12">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-[#1a3252]">
                Startseite
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/${produkt.slug}`} className="hover:text-[#1a3252]">
                {produkt.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page">Vergleichsrechner</span>
            </li>
          </ol>
        </nav>

        <h1 className="font-heading text-3xl font-bold text-[#1a3252] mb-4">
          {produkt.name} — Anbietertarife vergleichen
        </h1>
        <p className="text-lg text-gray-700 font-body mb-2">
          Geben Sie Ihr Geburtsjahr und Ihre Wunschsumme ein. Wir zeigen Ihnen die Beiträge der
          führenden Anbieter im Direktvergleich.
        </p>

        <VergleichsRechner
          produktId={produkt.id}
          produktTyp={produkt.typ}
          produktName={produkt.name}
          zielgruppeTag="senioren_50plus"
          intentTag="preis"
          headline={`${produkt.name} im Anbieter-Vergleich`}
          intro="Tarife sortiert nach Beitrag — günstigster zuerst. Wählen Sie den passenden Anbieter und fordern Sie ein persönliches Angebot an."
          ctaLabel="Beratung zu allen Anbietern"
          initialData={initialData}
        />
      </main>
    </>
  )
}
