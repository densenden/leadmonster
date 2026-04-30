'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { AnbieterTarif, AnbieterBadge } from '@/lib/tarife/lookup'
import { getProduktConfig } from '@/lib/tarife/produkt-config'
import { LeadForm } from '@/components/sections/LeadForm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VergleichsRechnerProps {
  produktId: string
  /** Produkttyp — steuert Summen-Optionen, Labels und Default-Alter (siehe
   *  lib/tarife/produkt-config). Optional: Fallback ist Sterbegeld-Konfig. */
  produktTyp?: string
  /** Produktname — fließt in Lead-Form-Default-Text. */
  produktName?: string
  zielgruppeTag: string
  intentTag?: string
  headline: string
  intro: string
  inputHint?: string
  ctaLabel?: string
  /** Optional Anzahl Anbieter (vom Generator gesetzt) — nur fürs Wording. */
  anbieterCountHint?: number
  /** SSR-vorgerenderte Daten für ersten Render ohne Spinner. */
  initialData?: AnbieterTarif[]
}

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear()

const BADGE_LABEL: Record<AnbieterBadge, string> = {
  guenstigster: 'Günstigster',
  bester_schutz: 'Bester Schutz',
  schnellster_schutz: 'Schnellster Schutz',
}

const BADGE_STYLES: Record<AnbieterBadge, string> = {
  guenstigster: 'bg-brand-orange text-white',
  bester_schutz: 'bg-[#1a3252] text-white',
  schnellster_schutz: 'bg-brand-cyan text-white',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugifyAnbieter(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function formatBeitrag(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatSumme(value: number): string {
  return value.toLocaleString('de-DE')
}

/** Baut den vorbefüllten Interesse-Text für die LeadForm. */
function buildInteresseText(args: {
  produktName?: string
  anbieter: string | null
  tarifName?: string | null
  beitrag?: number
  jahr: number
  summe: number
  summeSuffix: string
}): string {
  const altersText = `Geburtsjahr ${args.jahr} (${CURRENT_YEAR - args.jahr} Jahre)`
  const summeText = `${formatSumme(args.summe)} ${args.summeSuffix}`
  if (args.anbieter) {
    const tarif = args.tarifName ? ` (${args.tarifName})` : ''
    const beitrag = args.beitrag ? `, ca. ${formatBeitrag(args.beitrag)} €/Monat` : ''
    return `Anfrage zum Anbieter ${args.anbieter}${tarif}. ${altersText}, ${summeText}${beitrag}. Bitte um persönliche Beratung.`
  }
  const produkt = args.produktName ? ` für die ${args.produktName}` : ''
  return `Beratungsanfrage${produkt}. ${altersText}, ${summeText}. Bitte um persönlichen Vergleich aller Anbieter.`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VergleichsRechner — interaktiver Anbieter-Vergleich.
 *
 * Step 1: Geburtsjahr + Wunschsumme wählen → Tabelle aktualisiert sich live
 *         via /api/vergleich-tarife.
 * Step 2: Klick auf "{Anbieter} anfragen" oder "Beratung zu allen Anbietern"
 *         → LeadForm erscheint mit gewuenschterAnbieter als Hidden-Field +
 *         intent_tag='preis' + vorbefülltem Interesse-Text.
 *
 * Cache-Strategie liegt in der API-Route (s-maxage=3600).
 */
export function VergleichsRechner({
  produktId,
  produktTyp,
  produktName,
  zielgruppeTag,
  intentTag = 'preis',
  headline,
  intro,
  inputHint,
  ctaLabel = 'Beratung anfordern',
  initialData,
}: VergleichsRechnerProps) {
  const config = useMemo(() => getProduktConfig(produktTyp), [produktTyp])

  const [geburtsjahr, setGeburtsjahr] = useState(CURRENT_YEAR - config.default_age)
  const [summe, setSumme] = useState<number>(config.default_summe)
  const [results, setResults] = useState<AnbieterTarif[]>(initialData ?? [])
  const [loading, setLoading] = useState(false)
  const [activeAnbieter, setActiveAnbieter] = useState<string | null>(null)
  const leadFormRef = useRef<HTMLDivElement>(null)

  const age = CURRENT_YEAR - geburtsjahr

  // Geburtsjahr-Auswahlliste — älteste oben, neueste unten.
  const geburtsjahrOptions = useMemo(() => {
    const list: number[] = []
    for (
      let year = CURRENT_YEAR - config.min_age;
      year >= CURRENT_YEAR - config.max_age;
      year--
    ) {
      list.push(year)
    }
    return list
  }, [config.min_age, config.max_age])

  // Fetch on input change.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url = `/api/vergleich-tarife?produktId=${encodeURIComponent(produktId)}&age=${age}&summe=${summe}`
    fetch(url)
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(json => {
        if (!cancelled) {
          setResults((json.data ?? []) as AnbieterTarif[])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [produktId, age, summe])

  // Scroll to LeadForm when revealed.
  useEffect(() => {
    if (activeAnbieter !== null && leadFormRef.current) {
      if (typeof leadFormRef.current.scrollIntoView === 'function') {
        leadFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [activeAnbieter])

  // Default-Text für die LeadForm — basiert auf aktueller Auswahl.
  const activeRow = activeAnbieter ? results.find(r => r.anbieter_name === activeAnbieter) : null
  const defaultInteresse = useMemo(() => {
    if (activeAnbieter === null) return undefined
    return buildInteresseText({
      produktName,
      anbieter: activeAnbieter || null,
      tarifName: activeRow?.tarif_name,
      beitrag: activeRow?.beitrag_eur,
      jahr: geburtsjahr,
      summe,
      summeSuffix: config.summe_suffix,
    })
  }, [activeAnbieter, activeRow, geburtsjahr, summe, produktName, config.summe_suffix])

  return (
    <section
      id="vergleichsrechner"
      aria-label="Anbieter-Vergleichsrechner"
      className="py-16 bg-white"
    >
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <h2 className="font-heading font-bold text-[#1a3252] text-h2-desktop mb-3">
          {headline}
        </h2>
        <p className="font-body text-[#666666] text-base mb-8">{intro}</p>

        {/* Eingabe-Block */}
        <div className="bg-white shadow-ft-default rounded-xl p-6 md:p-8 mb-6">
          {inputHint && (
            <p className="font-body text-sm text-brand-neutral-base mb-4">{inputHint}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="vr-geburtsjahr"
                className="block text-sm font-body font-light text-brand-neutral-base mb-2"
              >
                Geburtsjahr
              </label>
              <select
                id="vr-geburtsjahr"
                aria-label="Ihr Geburtsjahr"
                value={geburtsjahr}
                onChange={e => setGeburtsjahr(Number(e.target.value))}
                className="w-full border border-[#e5e5e5] rounded-none px-3 py-2 text-sm font-body font-light text-[#333333] focus:outline-none focus:ring-2 focus:ring-brand-link min-h-[44px] bg-white cursor-pointer"
              >
                {geburtsjahrOptions.map(year => (
                  <option key={year} value={year}>
                    {year} (Alter {CURRENT_YEAR - year})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="vr-summe"
                className="block text-sm font-body font-light text-brand-neutral-base mb-2"
              >
                {config.summe_label}
              </label>
              <select
                id="vr-summe"
                aria-label={config.summe_label}
                value={summe}
                onChange={e => setSumme(Number(e.target.value))}
                className="w-full border border-[#e5e5e5] rounded-none px-3 py-2 text-sm font-body font-light text-[#333333] focus:outline-none focus:ring-2 focus:ring-brand-link min-h-[44px] bg-white cursor-pointer"
              >
                {config.summen.map(opt => (
                  <option key={opt} value={opt}>
                    {formatSumme(opt)} {config.summe_suffix}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ergebnis-Tabelle */}
        <div
          className="bg-white shadow-ft-default rounded-xl overflow-hidden"
          aria-live="polite"
          aria-busy={loading}
        >
          {results.length === 0 ? (
            <div className="p-8 text-center font-body text-brand-neutral-muted" data-testid="vr-empty">
              {loading
                ? 'Tarife werden geladen…'
                : 'Für diese Kombination liegen aktuell keine Anbietertarife vor. Bitte fordern Sie ein persönliches Angebot an.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full" data-testid="vr-table">
                <caption className="sr-only">Anbieter-Vergleich — sortiert nach Beitrag aufsteigend</caption>
                <thead>
                  <tr className="bg-[#1a3252] text-white">
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">
                      Anbieter
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">
                      Tarif
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                      {config.beitrag_label}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium">
                      Auszeichnungen
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-medium">
                      <span className="sr-only">Aktion</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((tarif, idx) => {
                    const slug = slugifyAnbieter(tarif.anbieter_name)
                    return (
                      <tr
                        key={tarif.anbieter_name}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        data-testid={`vr-row-${slug}`}
                      >
                        <th
                          scope="row"
                          className="px-4 py-3 text-left text-sm font-semibold text-[#1a3252] whitespace-nowrap"
                        >
                          {tarif.anbieter_name}
                        </th>
                        <td className="px-4 py-3 text-sm text-[#666666]">
                          {tarif.tarif_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-base font-bold text-brand-orange whitespace-nowrap">
                          {formatBeitrag(tarif.beitrag_eur)} &euro;
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {tarif.badges.map(badge => (
                              <span
                                key={badge}
                                className={`text-xs font-body font-bold px-2 py-1 ${BADGE_STYLES[badge]}`}
                                data-testid={`vr-badge-${slug}-${badge}`}
                              >
                                {BADGE_LABEL[badge]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveAnbieter(tarif.anbieter_name)}
                            className="bg-brand-orange text-white font-body font-bold text-sm min-h-[40px] px-4 py-2 rounded-none hover:bg-brand-orange-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-link whitespace-nowrap"
                            data-testid={`vr-cta-${slug}`}
                          >
                            {tarif.anbieter_name} anfragen
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pflicht-Disclaimer */}
        <p className="mt-4 text-sm font-body font-light text-brand-neutral-muted">
          Hinweis: Diese Übersicht dient ausschließlich zur Orientierung und stellt kein
          verbindliches Angebot dar. Die tatsächlichen Beiträge können je nach
          Gesundheitszustand, Anbieter und individuellen Faktoren abweichen. Bitte fordern Sie
          ein persönliches Angebot an.
        </p>

        {/* Globaler CTA */}
        {results.length > 0 && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setActiveAnbieter('')}
              className="bg-[#1a3252] text-white font-body font-bold min-h-[44px] px-6 py-3 rounded-none hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-brand-link"
              data-testid="vr-cta-global"
            >
              {ctaLabel}
            </button>
          </div>
        )}

        {/* LeadForm — conditional reveal mit Prefill aus aktueller Auswahl */}
        <div
          ref={leadFormRef}
          className={[
            'mt-12 max-w-2xl mx-auto',
            'motion-safe:transition-all motion-safe:duration-[250ms]',
            activeAnbieter !== null
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2.5 pointer-events-none',
          ].join(' ')}
          aria-live="polite"
        >
          {activeAnbieter !== null && (
            <LeadForm
              key={activeAnbieter || 'global'}
              produktId={produktId}
              zielgruppeTag={zielgruppeTag}
              intentTag={intentTag}
              gewuenschterAnbieter={activeAnbieter || undefined}
              defaultInteresse={defaultInteresse}
            />
          )}
        </div>
      </div>
    </section>
  )
}
