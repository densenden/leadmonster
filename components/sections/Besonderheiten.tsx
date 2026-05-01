// Besonderheiten-Tabelle für Anbieter-Landingpages — Server Component.
// Rendert sichtbare Marker-Tabelle + atomare FAQ-Items aus dem AnbieterAggregat.
import type { AnbieterAggregat } from '@/lib/anbieter/load'

const FALLBACK_NA = '—'

interface RowDef {
  label: string
  value: (a: AnbieterAggregat) => { display: string; positive: boolean | null }
  faq?: (a: AnbieterAggregat, name: string) => { frage: string; antwort: string } | null
}

const ROWS: RowDef[] = [
  {
    label: 'Wartezeit',
    value: a => {
      const w = a.wartezeit_min_monate ?? a.wartezeit_alt_monate
      if (w === null || w === undefined) return { display: FALLBACK_NA, positive: null }
      if (w === 0) return { display: 'Keine Wartezeit', positive: true }
      return { display: `${w} Monate`, positive: w <= 6 }
    },
    faq: (a, name) => {
      const w = a.wartezeit_min_monate ?? a.wartezeit_alt_monate
      if (w === null || w === undefined) return null
      return {
        frage: `Hat die ${name}-Versicherung eine Wartezeit?`,
        antwort: w === 0
          ? `Nein, die ${name}-Versicherung bietet sofortigen vollen Versicherungsschutz ohne Wartezeit.`
          : `Ja, die ${name}-Versicherung hat eine Wartezeit von ${w} Monaten. Danach besteht voller Versicherungsschutz.`,
      }
    },
  },
  {
    label: 'Gesundheitsprüfung',
    value: a => a.gesundheitspruefung
      ? { display: 'Ja', positive: false }
      : { display: 'Nein — garantierte Aufnahme', positive: true },
    faq: (a, name) => ({
      frage: `Verlangt die ${name}-Versicherung eine Gesundheitsprüfung?`,
      antwort: a.gesundheitspruefung
        ? `Ja, die ${name}-Versicherung verlangt vor Vertragsabschluss Gesundheitsfragen. Vorerkrankungen können zum Risikozuschlag oder zur Ablehnung führen.`
        : `Nein, die ${name}-Versicherung verzichtet auf Gesundheitsfragen — die Aufnahme ist auch mit Vorerkrankungen möglich.`,
    }),
  },
  {
    label: 'Doppelte Auszahlung bei Unfalltod',
    value: a => ({ display: a.doppelte_unfall ? 'Ja' : 'Nein', positive: a.doppelte_unfall }),
    faq: (a, name) => a.doppelte_unfall ? {
      frage: `Bietet die ${name}-Versicherung doppelte Auszahlung bei Unfalltod?`,
      antwort: `Ja, die ${name}-Versicherung verdoppelt im Fall eines tödlichen Unfalls die Versicherungssumme — ein wertvoller Zusatzschutz für Angehörige.`,
    } : null,
  },
  {
    label: 'Rückholkosten Ausland',
    value: a => ({ display: a.rueckholung ? 'Inkludiert' : 'Nein', positive: a.rueckholung }),
    faq: (a, name) => a.rueckholung ? {
      frage: `Übernimmt die ${name}-Versicherung Rückholkosten aus dem Ausland?`,
      antwort: `Ja, die ${name}-Versicherung übernimmt die Rückführung des Verstorbenen aus dem Ausland nach Deutschland. Wichtig für Familien mit ausländischen Aufenthalten.`,
    } : null,
  },
  {
    label: 'Lebenslange Beitragszahlung möglich',
    value: a => ({ display: a.lebenslang ? 'Ja' : 'Nein', positive: a.lebenslang }),
  },
  {
    label: 'Kindermitversicherung',
    value: a => ({ display: a.kindermitversicherung ? 'Möglich' : 'Nein', positive: a.kindermitversicherung }),
  },
  {
    label: 'Beitragszahlung bis Alter',
    value: a => a.zahlung_bis_alter
      ? { display: `${a.zahlung_bis_alter} Jahre`, positive: a.zahlung_bis_alter >= 95 }
      : { display: FALLBACK_NA, positive: null },
    faq: (a, name) => a.zahlung_bis_alter ? {
      frage: `Bis zu welchem Alter zahlt die ${name}-Versicherung?`,
      antwort: `Die ${name}-Versicherung zahlt bis zum ${a.zahlung_bis_alter}. Lebensjahr — das ist deutlich überdurchschnittlich am deutschen Markt.`,
    } : null,
  },
]

interface Props {
  aggregat: AnbieterAggregat
}

export function BesonderheitenTable({ aggregat }: Props) {
  const name = aggregat.anbieter_name
  const tarifLabel = aggregat.tarif_name ? ` (Tarif ${aggregat.tarif_name})` : ''
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <h2 className="px-6 pt-5 pb-3 text-xl font-bold text-[#1a3252]">
        Was leistet die {name}-Versicherung{tarifLabel} — Komplett-Übersicht
      </h2>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-200">
          <tr>
            <th className="text-left px-6 py-2 text-xs uppercase tracking-wider text-[#999]">Eigenschaft</th>
            <th className="text-left px-6 py-2 text-xs uppercase tracking-wider text-[#999]">{name}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ROWS.map(row => {
            const { display, positive } = row.value(aggregat)
            return (
              <tr key={row.label}>
                <td className="px-6 py-3 text-[#666]">{row.label}</td>
                <td className="px-6 py-3 text-[#333]">
                  {positive === true && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />}
                  {positive === false && <span className="inline-block w-2 h-2 rounded-full bg-red-300 mr-2" />}
                  {display}
                </td>
              </tr>
            )
          })}
          <tr>
            <td className="px-6 py-3 text-[#666]">Beitragsspanne</td>
            <td className="px-6 py-3 text-[#333] font-semibold">
              {aggregat.beitrag_min.toFixed(2)} € — {aggregat.beitrag_max.toFixed(2)} € / Monat
            </td>
          </tr>
          <tr>
            <td className="px-6 py-3 text-[#666]">Eintrittsalter</td>
            <td className="px-6 py-3 text-[#333]">
              {aggregat.alter_von_min} – {aggregat.alter_bis_max} Jahre
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

export function BesonderheitenFaqList({ aggregat }: Props) {
  const name = aggregat.anbieter_name
  const items = ROWS
    .map(row => row.faq?.(aggregat, name))
    .filter((it): it is { frage: string; antwort: string } => it !== null && it !== undefined)

  if (items.length === 0) return null

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(it => ({
      '@type': 'Question',
      name: it.frage,
      acceptedAnswer: { '@type': 'Answer', text: it.antwort },
    })),
  }

  return (
    <section className="mt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <h2 className="text-2xl font-bold text-[#1a3252] mb-6">
        Antworten auf häufige Fragen zur {name}-Versicherung
      </h2>
      <ul className="space-y-4">
        {items.map((it, i) => (
          <li key={i} className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="font-semibold text-[#1a3252] mb-2">{it.frage}</h3>
            <p className="text-sm text-[#4a5568] leading-relaxed">{it.antwort}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
