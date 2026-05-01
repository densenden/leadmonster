// Marktdaten-Übersicht: alle datengetriebenen Auswertungen aus der Tarif-DB.
import Link from 'next/link'
import type { Metadata } from 'next'
import { MARKTDATEN_THEMEN } from '@/lib/marktdaten/queries'

export const metadata: Metadata = {
  title: 'Marktdaten — Versicherungsmarkt-Auswertungen',
  description:
    'Aggregierte Marktauswertungen aus unserer Tarif-Datenbank: Sterbegeld, '
    + 'Pflege, BU, Unfall im strukturierten Vergleich.',
}

export default function MarktdatenIndexPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-[#1a3252] mb-3">Marktdaten</h1>
        <p className="text-lg text-[#4a5568]">
          Datengetriebene Marktauswertungen aus unserer eigenen Versicherungs-Tarifdatenbank.
          Quelle: laufende Marktbeobachtung des unabhängigen Versicherungsmaklers
          finanzteam26 GmbH &amp; Co. KG. Stand jeweils im Footer der Detailseite.
        </p>
      </header>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {MARKTDATEN_THEMEN.map(t => (
          <li key={t.slug}>
            <Link
              href={`/marktdaten/${t.slug}`}
              className="block rounded-xl border border-gray-200 bg-white p-6 hover:border-[#02a9e6] transition-colors"
            >
              <h2 className="text-xl font-bold text-[#1a3252] mb-2">{t.titel}</h2>
              <p className="text-sm text-[#4a5568] line-clamp-3">{t.einleitung}</p>
              <p className="mt-3 text-xs text-[#02a9e6] font-semibold">Auswertung ansehen →</p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-xs text-[#666] leading-relaxed">
        <strong>Hinweis für die Presse:</strong> Sie dürfen die Marktdaten unter
        Quellangabe „finanzteam26 / leadmonster.de&ldquo; frei zitieren. Für ein
        einbettbares Widget pro Auswertung siehe den Footer der jeweiligen Seite.
      </p>
    </main>
  )
}
