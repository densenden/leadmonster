'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  SCHUTZ_STARS_MAX,
  displaySchutzStars,
  type SchutzBesonderheiten,
} from '@/lib/tarife/schutz-stars'
import type { AnbieterTarif, AnbieterBadge } from '@/lib/tarife/lookup'
import { getProduktConfig } from '@/lib/tarife/produkt-config'
import { resolveFilterAxes } from '@/lib/tarife/resolve-filter-axes'
import type { FilterAxis, FilterAxisValue } from '@/lib/tarife/filter-config-schema'
import { AnbieterLogo } from '@/components/anbieter/AnbieterLogo'
import { LeadForm } from '@/components/sections/LeadForm'
import { readMarketingConsent } from '@/lib/cookies/consent'
import { trackMetaViewContent } from '@/lib/tracking/meta-pixel'

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
  /** Optional: produkt_typen.filter_axes vom Server-Wrapper. Wenn nicht
   *  gesetzt, fällt die Komponente auf die Code-Defaults aus `getProduktConfig`
   *  zurück. */
  filterAxes?: FilterAxis[]
  /** Link to privacy policy for embedded LeadForm. */
  datenschutzHref?: string
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
  bester_schutz: 'bg-navy text-white',
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

function formatWartezeitMonths(months: number): string {
  if (months === 0) return 'Keine Wartezeit'
  return `${months} Monate`
}

function formatSumme(value: number): string {
  return value.toLocaleString('de-DE')
}

/** Mappt aktuelle Filter-Werte auf das LeadForm-Hidden-Field-Format.
 *  Schlüssel mit `lead_field` werden direkt unter dem Lead-Feld-Namen
 *  abgelegt (z. B. akzeptierte_wartezeit_monate, berufsklasse). Alle anderen
 *  Werte landen im `filter_kontext`-Sub-Objekt. */
function buildLeadFormFilterContext(
  axes: FilterAxis[],
  values: Record<string, FilterAxisValue>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const axis of axes) {
    const v = values[axis.key]
    if (v === null || v === undefined) continue
    if (axis.lead_field) {
      out[axis.lead_field] = v
    } else {
      out[axis.key] = v
    }
  }
  return out
}

/** Table column label — filter select label can differ (e.g. "Akzeptable Wartezeit"). */
function getAxisColumnLabel(axis: FilterAxis): string {
  if (axis.key === 'wartezeit_monate') return 'Wartezeit'
  return axis.label
}

/** Human-readable cell value for filter-axis columns in the results table. */
function formatAxisCellValue(axis: FilterAxis, raw: unknown): string {
  if (raw === undefined || raw === null) return '—'
  if (axis.key === 'wartezeit_monate' && typeof raw === 'number') {
    if (raw === 0) return 'Keine'
    return `${raw} Mon.`
  }
  return String(raw)
}

/** Label of the currently selected filter option (e.g. Wartezeit preference). */
function getSelectedFilterLabel(
  axes: FilterAxis[],
  values: Record<string, FilterAxisValue>,
): string | null {
  for (const axis of axes) {
    const v = values[axis.key]
    if (v === null || v === undefined) continue
    const opt = axis.options.find(o => o.value === v)
    if (opt) return opt.label
  }
  return null
}

function SchutzStars({
  anbieterName,
  tarifName,
  besonderheiten,
  slug,
  showTestId = true,
}: {
  anbieterName: string
  tarifName?: string | null
  besonderheiten: SchutzBesonderheiten
  slug: string
  showTestId?: boolean
}) {
  const filled = displaySchutzStars(anbieterName, besonderheiten, tarifName)
  const empty = SCHUTZ_STARS_MAX - filled
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xl leading-none tracking-tight"
      role="img"
      aria-label={`Schutzumfang: ${filled} von ${SCHUTZ_STARS_MAX} Sternen`}
      {...(showTestId ? { 'data-testid': `vr-schutz-stars-${slug}` } : {})}
    >
      {Array.from({ length: filled }, (_, i) => (
        <span key={`f-${i}`} className="text-[#d4af37]" aria-hidden="true">
          ★
        </span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e-${i}`} className="text-[#cbd5e0]" aria-hidden="true">
          ☆
        </span>
      ))}
    </span>
  )
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
  wartezeitLabel?: string | null
}): string {
  const altersText = `Geburtsjahr ${args.jahr} (${CURRENT_YEAR - args.jahr} Jahre)`
  const summeText = `${formatSumme(args.summe)} ${args.summeSuffix}`
  const wartezeitText = args.wartezeitLabel ? `, akzeptable Wartezeit: ${args.wartezeitLabel}` : ''
  if (args.anbieter) {
    const tarif = args.tarifName ? ` (${args.tarifName})` : ''
    const beitrag = args.beitrag ? `, ca. ${formatBeitrag(args.beitrag)} €/Monat` : ''
    return `Anfrage zum Anbieter ${args.anbieter}${tarif}. ${altersText}, ${summeText}${wartezeitText}${beitrag}. Bitte um persönliche Beratung.`
  }
  const produkt = args.produktName ? ` für die ${args.produktName}` : ''
  return `Beratungsanfrage${produkt}. ${altersText}, ${summeText}${wartezeitText}. Bitte um persönlichen Vergleich aller Anbieter.`
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
  filterAxes,
  datenschutzHref = '/datenschutz',
}: VergleichsRechnerProps) {
  const config = useMemo(() => getProduktConfig(produktTyp), [produktTyp])
  // Filter-Achsen: Server-Wrapper > Code-Default; leeres DB-Array darf nicht alles ausblenden.
  const axes = useMemo<FilterAxis[]>(
    () => resolveFilterAxes(produktTyp, filterAxes),
    [filterAxes, produktTyp],
  )

  const [geburtsjahr, setGeburtsjahr] = useState(CURRENT_YEAR - config.default_age)
  const [summe, setSumme] = useState<number>(config.default_summe)
  const [filterValues, setFilterValues] = useState<Record<string, FilterAxisValue>>(() => {
    const initial: Record<string, FilterAxisValue> = {}
    for (const a of axes) {
      initial[a.key] = a.default_value ?? null
    }
    return initial
  })
  const [results, setResults] = useState<AnbieterTarif[]>(initialData ?? [])
  const [loading, setLoading] = useState(false)
  const [activeAnbieter, setActiveAnbieter] = useState<string | null>(null)
  const leadFormRef = useRef<HTMLDivElement>(null)
  const viewContentTracked = useRef(false)

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
  // Filter-Werte werden serialisiert in die URL gehängt — null = nicht senden.
  const filterQuery = useMemo(() => {
    const params: string[] = []
    for (const a of axes) {
      const v = filterValues[a.key]
      if (v === null || v === undefined) continue
      params.push(`${encodeURIComponent(a.key)}=${encodeURIComponent(String(v))}`)
    }
    return params.join('&')
  }, [axes, filterValues])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const base = `/api/vergleich-tarife?produktId=${encodeURIComponent(produktId)}&age=${age}&summe=${summe}`
    const url = filterQuery ? `${base}&${filterQuery}` : base
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
  }, [produktId, age, summe, filterQuery])

  // Meta ViewContent — once per mount when tariff table has rows (marketing consent only).
  useEffect(() => {
    if (viewContentTracked.current || results.length === 0 || loading) return
    if (!readMarketingConsent()) return
    viewContentTracked.current = true
    trackMetaViewContent({
      contentName: 'vergleichsrechner',
      contentCategory: produktTyp ?? 'sterbegeld',
    })
  }, [results.length, loading, produktTyp])

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
  const wartezeitLabel = useMemo(
    () => getSelectedFilterLabel(axes, filterValues),
    [axes, filterValues],
  )
  const selectedWartezeitMonate = useMemo(() => {
    const raw = filterValues.wartezeit_monate
    return typeof raw === 'number' ? raw : undefined
  }, [filterValues.wartezeit_monate])
  const wartezeitFormOptions = useMemo(() => {
    const axis = axes.find(a => a.key === 'wartezeit_monate')
    return (axis?.options ?? []).filter(
      (o): o is { value: number; label: string } => typeof o.value === 'number',
    )
  }, [axes])
  /** Filter selection first; when „Egal“, inherit Wartezeit from clicked table row. */
  const inheritedWartezeitMonate = useMemo(() => {
    if (typeof selectedWartezeitMonate === 'number') return selectedWartezeitMonate
    const rowMonths = activeRow?.besonderheiten?.wartezeit_monate
    return typeof rowMonths === 'number' ? rowMonths : undefined
  }, [selectedWartezeitMonate, activeRow])
  const leadFormKey = `${activeAnbieter ?? 'global'}-${geburtsjahr}-${summe}-${inheritedWartezeitMonate ?? 'any'}`
  const isGlobalLeadCta = activeAnbieter === ''
  const wartezeitFromTarifLabel =
    !isGlobalLeadCta && inheritedWartezeitMonate != null
      ? `${formatWartezeitMonths(inheritedWartezeitMonate)}${activeAnbieter ? ` (${activeAnbieter}-Tarif)` : ''}`
      : undefined
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
      wartezeitLabel,
    })
  }, [
    activeAnbieter,
    activeRow,
    geburtsjahr,
    summe,
    produktName,
    config.summe_suffix,
    wartezeitLabel,
  ])

  return (
    <section
      id="vergleichsrechner"
      aria-label="Anbieter-Vergleichsrechner"
      className="py-10 md:py-16 bg-white"
    >
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <h2 className="font-heading font-bold text-[#1a3252] text-h2-desktop mb-3">
          {headline}
        </h2>
        <p className="font-body text-[#666666] text-base mb-8">{intro}</p>

        {/* Eingabe-Block */}
        <div className="bg-white shadow-ft-default rounded-xl p-4 sm:p-6 md:p-8 mb-6">
          {inputHint && (
            <p className="font-body text-sm text-brand-neutral-base mb-4">{inputHint}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
            {axes.map(axis => {
              const currentRaw = filterValues[axis.key]
              // value als String fürs <select> serialisieren — null wird zu "" gemappt
              const currentStr = currentRaw === null || currentRaw === undefined ? '' : String(currentRaw)
              return (
                <div key={axis.key}>
                  <label
                    htmlFor={`vr-axis-${axis.key}`}
                    className="block text-sm font-body font-light text-brand-neutral-base mb-2"
                  >
                    {axis.label}
                  </label>
                  <select
                    id={`vr-axis-${axis.key}`}
                    aria-label={axis.label}
                    value={currentStr}
                    onChange={e => {
                      const raw = e.target.value
                      // Re-decode: leere Option → null, sonst Originaltyp aus axis.options finden
                      const opt = axis.options.find(o => String(o.value ?? '') === raw)
                      setFilterValues(prev => ({
                        ...prev,
                        [axis.key]: opt ? opt.value : null,
                      }))
                    }}
                    data-testid={`vr-axis-${axis.key}`}
                    className="w-full border border-[#e5e5e5] rounded-none px-3 py-2 text-sm font-body font-light text-[#333333] focus:outline-none focus:ring-2 focus:ring-brand-link min-h-[44px] bg-white cursor-pointer"
                  >
                    {axis.options.map(o => (
                      <option key={String(o.value ?? '_null')} value={o.value === null ? '' : String(o.value)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
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
            <>
              {/* Mobile: stacked cards */}
              <div className="md:hidden divide-y divide-gray-100" data-testid="vr-cards">
                {results.map(tarif => {
                  const slug = slugifyAnbieter(tarif.anbieter_name)
                  return (
                    <article
                      key={tarif.anbieter_name}
                      className="p-4 sm:p-5"
                      data-testid={`vr-row-${slug}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-heading font-bold text-[#1a3252] text-base">
                            {tarif.anbieter_name}
                          </h3>
                          <AnbieterLogo
                            anbieterName={tarif.anbieter_name}
                            testId={`vr-logo-${slug}`}
                          />
                          {tarif.tarif_name && (
                            <p className="text-sm text-[#666666] truncate">{tarif.tarif_name}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-lg font-bold text-brand-orange whitespace-nowrap">
                          {formatBeitrag(tarif.beitrag_eur)} &euro;
                        </p>
                      </div>

                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                        {axes
                          .filter(a => a.show_as_column)
                          .map(a => {
                            const raw =
                              a.source === 'besonderheiten'
                                ? (tarif.besonderheiten as Record<string, unknown>)[a.key]
                                : (tarif as unknown as Record<string, unknown>)[a.key]
                            return (
                              <div key={a.key} data-testid={`vr-cell-${slug}-${a.key}`}>
                                <dt className="text-[#999] text-xs">{getAxisColumnLabel(a)}</dt>
                                <dd className="font-medium text-[#1a3252]">
                                  {formatAxisCellValue(a, raw)}
                                </dd>
                              </div>
                            )
                          })}
                        <div>
                          <dt className="text-[#999] text-xs">Schutz</dt>
                          <dd>
                            <SchutzStars
                              anbieterName={tarif.anbieter_name}
                              tarifName={tarif.tarif_name}
                              besonderheiten={tarif.besonderheiten}
                              slug={slug}
                            />
                          </dd>
                        </div>
                      </dl>

                      {tarif.badges.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tarif.badges.map(badge => (
                            <span
                              key={badge}
                              className={`text-xs sm:text-sm font-body font-bold px-2.5 py-1 rounded-sm shadow-sm ${BADGE_STYLES[badge]}`}
                              data-testid={`vr-badge-${slug}-${badge}`}
                            >
                              {badge === 'bester_schutz' ? '★ ' : ''}
                              {BADGE_LABEL[badge]}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveAnbieter(tarif.anbieter_name)}
                        className="w-full bg-brand-orange text-white font-body font-bold text-sm min-h-[44px] px-4 py-2.5 rounded-none hover:bg-brand-orange-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-link"
                        data-testid={`vr-cta-${slug}`}
                      >
                        {tarif.anbieter_name} anfragen
                      </button>
                    </article>
                  )
                })}
              </div>

              {/* Desktop: full table */}
              <div className="hidden md:block overflow-x-auto">
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
                    {axes
                      .filter(a => a.show_as_column)
                      .map(a => (
                        <th
                          key={a.key}
                          scope="col"
                          className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap"
                        >
                          {getAxisColumnLabel(a)}
                        </th>
                      ))}
                    <th scope="col" className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">
                      Schutz
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
                      >
                        <th
                          scope="row"
                          className="px-4 py-3 text-left text-sm font-semibold text-[#1a3252] whitespace-nowrap"
                        >
                          <div className="flex flex-col items-start">
                            {tarif.anbieter_name}
                            <AnbieterLogo
                              anbieterName={tarif.anbieter_name}
                              testId={`vr-logo-${slug}`}
                            />
                          </div>
                        </th>
                        <td className="px-4 py-3 text-sm text-[#666666]">
                          {tarif.tarif_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-base font-bold text-brand-orange whitespace-nowrap">
                          {formatBeitrag(tarif.beitrag_eur)} &euro;
                        </td>
                        {axes
                          .filter(a => a.show_as_column)
                          .map(a => {
                            const raw =
                              a.source === 'besonderheiten'
                                ? (tarif.besonderheiten as Record<string, unknown>)[a.key]
                                : (tarif as unknown as Record<string, unknown>)[a.key]
                            return (
                              <td
                                key={a.key}
                                className="px-4 py-3 text-sm font-medium text-[#1a3252] whitespace-nowrap"
                              >
                                {formatAxisCellValue(a, raw)}
                              </td>
                            )
                          })}
                        <td className="px-4 py-3">
                          <SchutzStars
                            anbieterName={tarif.anbieter_name}
                            tarifName={tarif.tarif_name}
                            besonderheiten={tarif.besonderheiten}
                            slug={slug}
                            showTestId={false}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {tarif.badges.map(badge => (
                              <span
                                key={badge}
                                className={`text-sm font-body font-bold px-3 py-1.5 rounded-sm shadow-sm ${BADGE_STYLES[badge]}`}
                              >
                                {badge === 'bester_schutz' ? '★ ' : ''}
                                {BADGE_LABEL[badge]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveAnbieter(tarif.anbieter_name)}
                            className="bg-brand-orange text-white font-body font-bold text-sm min-h-[44px] px-4 py-2 rounded-none hover:bg-brand-orange-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-link whitespace-nowrap"
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
            </>
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
              key={leadFormKey}
              formId="lead-form-vergleich"
              produktId={produktId}
              zielgruppeTag={zielgruppeTag}
              intentTag={intentTag}
              gewuenschterAnbieter={activeAnbieter || undefined}
              defaultInteresse={defaultInteresse}
              filterContext={buildLeadFormFilterContext(axes, filterValues)}
              defaultSumme={summe}
              defaultWartezeitMonate={inheritedWartezeitMonate}
              defaultMonatsbeitrag={activeRow?.beitrag_eur}
              wartezeitOptions={wartezeitFormOptions}
              showWartezeitDropdown={isGlobalLeadCta}
              wartezeitFromTarifLabel={wartezeitFromTarifLabel}
              datenschutzHref={datenschutzHref}
            />
          )}
        </div>
      </div>
    </section>
  )
}
