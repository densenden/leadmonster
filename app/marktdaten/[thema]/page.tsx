// Marktdaten-Detail-Seite: rendert eine Datentabelle aus der View
// `tarife_besonderheiten_aggregiert` mit Schema.org/Dataset.
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  findThema,
  loadMarktdatenForThema,
  MARKTDATEN_THEMEN,
} from '@/lib/marktdaten/queries'

export const revalidate = 86400

interface PageProps { params: { thema: string } }

export async function generateStaticParams() {
  return MARKTDATEN_THEMEN.map(t => ({ thema: t.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const thema = findThema(params.thema)
  if (!thema) return { title: 'Marktdaten — nicht gefunden', robots: { index: false } }
  return {
    title: `${thema.titel} — Marktdaten`,
    description: thema.einleitung,
  }
}

export default async function MarktdatenDetailPage({ params }: PageProps) {
  const thema = findThema(params.thema)
  if (!thema) notFound()
  const rows = await loadMarktdatenForThema(thema)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://finanzteam26.de'
  const canonical = `${baseUrl}/marktdaten/${thema.slug}`
  const today = new Date()

  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: thema.titel,
    description: thema.einleitung,
    url: canonical,
    creator: { '@type': 'Organization', name: 'finanzteam26 GmbH & Co. KG' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    dateModified: today.toISOString(),
    keywords: ['Versicherungsmarkt', ...thema.produktTypen],
    distribution: [{
      '@type': 'DataDownload',
      encodingFormat: 'text/html',
      contentUrl: canonical,
    }],
  }

  const embedSnippet = `<iframe src="${canonical}?embed=1" width="100%" height="600" frameborder="0" loading="lazy" title="${thema.titel}"></iframe>`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <nav className="text-sm text-[#666] mb-4">
          <Link href="/marktdaten" className="hover:text-[#02a9e6]">Marktdaten</Link>
          <span className="mx-2">›</span>
          <span className="text-[#333]">{thema.titel}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-[#1a3252] mb-4">{thema.titel}</h1>
        <p className="text-lg text-[#4a5568] mb-8">{thema.einleitung}</p>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-[#666]">
            Aktuell keine Anbieter in unserer Datenbank, die dieses Kriterium erfüllen.
            Marktdaten werden laufend aktualisiert.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-[#999]">
                    Produkt
                  </th>
                  {thema.spalten.map(c => (
                    <th key={c.label} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-[#999]">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#666]">
                      <Link href={`/${r.produkt_slug}`} className="hover:text-[#02a9e6]">
                        {r.produkt_name}
                      </Link>
                    </td>
                    {thema.spalten.map(c => (
                      <td key={c.label} className="px-4 py-3 text-[#333]">
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-[#666]">
          Stand: {today.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}.
          Quelle: laufende Marktbeobachtung der finanzteam26 GmbH &amp; Co. KG.
        </p>

        {/* Embed-Snippet */}
        <section className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="text-lg font-bold text-[#1a3252] mb-2">Diese Auswertung einbetten</h2>
          <p className="text-sm text-[#4a5568] mb-3">
            Sie können die Tabelle unter Quellangabe &bdquo;finanzteam26 / sterbegeld24plus.de&ldquo;
            kostenfrei in Ihren Beitrag einbetten:
          </p>
          <pre className="bg-white border border-gray-200 rounded p-3 text-xs overflow-x-auto text-[#333]">
            <code>{embedSnippet}</code>
          </pre>
        </section>

        <div className="mt-10">
          <Link href="/marktdaten" className="text-sm text-[#1a365d] hover:underline">
            ← Alle Marktdaten-Auswertungen
          </Link>
        </div>
      </main>
    </>
  )
}
