'use client'

import { useState, useRef } from 'react'
import type { ProduktTyp } from '@/lib/tarif-data'
import { getAgeBracket } from '@/lib/tarif-data'
import { LeadForm } from '@/components/sections/LeadForm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TarifRechnerProps {
  produktTyp: ProduktTyp
  produktName: string
  anbieter: string[]
  produktId: string
  /** Zielgruppe-Tag aus produkt_config — wird ans LeadForm durchgereicht und
   *  landet auf dem Lead. Default `'allgemein'`, falls die Page keinen Wert hat. */
  zielgruppeTag?: string
}

// Supported sum tiers in EUR — must match keys defined in TARIF_DATA.
const SUM_OPTIONS = [5000, 7500, 10000, 12500, 15000] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TarifRechner — Beitragsrechner mit direkt darunter eingebettetem LeadForm.
 *
 * User wählt Alter + Wunschsumme → Result-Card mit Beitragsspanne erscheint
 * und das LeadForm direkt darunter ist mit den gewählten Werten vorbefüllt.
 * Die "Beitrag jetzt anfragen"-CTA scrollt zum bereits sichtbaren Form.
 *
 * Design note: tokens.json specifies border-radius: 0px, but the spec requires 12px
 * card radius (rounded-xl) for the calculator card surface — intentional override.
 */
export function TarifRechner({ produktTyp, produktName, anbieter, produktId, zielgruppeTag = 'allgemein' }: TarifRechnerProps) {
  const [age, setAge] = useState(55)
  const [sum, setSum] = useState(10000)
  // Result + LeadForm sind direkt beim Page-Load sichtbar — der User soll
  // den Konversionspfad sofort sehen, ohne erst Slider oder Select zu bedienen.
  const [showResult, setShowResult] = useState(true)

  // Ref to the LeadForm wrapper for smooth scroll-into-view when CTA is clicked.
  const leadFormRef = useRef<HTMLDivElement>(null)

  // Derived: calculate the premium range on every render (no extra state)
  const result = getAgeBracket(produktTyp, age, sum)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleAgeChange(value: number) {
    // Clamp to the supported range before updating state
    const clamped = Math.max(40, Math.min(85, value))
    setAge(clamped)
  }

  function handleSumChange(value: number) {
    setSum(value)
    // Reveal the result immediately when user picks a sum
    setShowResult(true)
  }

  function handleCTAClick() {
    if (leadFormRef.current && typeof leadFormRef.current.scrollIntoView === 'function') {
      leadFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Vorbefüllter Interesse-Text, sobald ein Result existiert.
  // Live-Update: ändert sich, wenn der User Alter oder Wunschsumme anpasst.
  // Über die `key`-Prop am LeadForm wird die Komponente bei Änderung neu gemountet,
  // damit der useState-Initialwert aktualisiert wird (sonst würde er beim ersten
  // Render eingefroren).
  const prefillInteresse = result
    ? `Anfrage zu ${produktName}\n` +
      `Alter: ${age} Jahre\n` +
      `Wunschsumme: ${sum.toLocaleString('de-DE')} €\n` +
      `Berechnete Beitragsspanne: ${result.low} – ${result.high} € pro Monat\n\n` +
      `Bitte erstellen Sie mir ein persönliches, verbindliches Angebot.`
    : undefined

  // Stabiler key, damit useState beim Reset (showResult=false) zurückgesetzt wird,
  // aber während eines aktiven Result-Streams nicht jedes Tippen den Form neu mountet.
  const formKey = result ? `tarif-${age}-${sum}` : 'tarif-empty'

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Slice anbieter to first 3 items for the badge row
  const anbieterBadges = anbieter.slice(0, 3)

  return (
    <section aria-label="Beitragsrechner" className="py-[40px] px-4 md:px-0">
      {/* Calculator card */}
      {/* rounded-xl overrides the tokens.json radius: 0px — required by spec for the card surface */}
      <div className="bg-white shadow-ft-default rounded-xl p-8 max-w-2xl mx-auto">
        <h2 className="font-heading font-bold text-[#333333] text-h2-desktop mb-6">
          {produktName} Beitragsrechner
        </h2>

        {/* Age input pair */}
        <div className="mb-6">
          <label className="block text-sm font-body font-light text-brand-neutral-base mb-2">
            Alter (Jahre)
          </label>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Range slider — always at least 44px height via min-h-[44px] on wrapper */}
            <div className="flex-1 min-h-[44px] flex items-center">
              <input
                type="range"
                min={40}
                max={85}
                step={1}
                value={age}
                aria-label="Ihr Alter"
                onChange={e => handleAgeChange(Number(e.target.value))}
                className="w-full accent-brand-blue cursor-pointer"
              />
            </div>
            {/* Number input — synced with slider, same clamped range */}
            <input
              type="number"
              min={40}
              max={85}
              value={age}
              onChange={e => handleAgeChange(Number(e.target.value))}
              className="w-20 border border-[#e5e5e5] rounded-none px-3 py-2 text-sm font-body font-light text-[#333333] focus:outline-none focus:ring-2 focus:ring-brand-link min-h-[44px] text-center"
            />
          </div>
        </div>

        {/* Wunschsumme select */}
        <div className="mb-6">
          <label
            htmlFor="wunschsumme"
            className="block text-sm font-body font-light text-brand-neutral-base mb-2"
          >
            Wunschsumme
          </label>
          <select
            id="wunschsumme"
            aria-label="Gewünschte Versicherungssumme"
            value={sum}
            onChange={e => handleSumChange(Number(e.target.value))}
            className="w-full border border-[#e5e5e5] rounded-none px-3 py-2 text-sm font-body font-light text-[#333333] focus:outline-none focus:ring-2 focus:ring-brand-link min-h-[44px] bg-white cursor-pointer"
          >
            {SUM_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option.toLocaleString('de-DE')} &euro;
              </option>
            ))}
          </select>
        </div>

        {/* Result card — animated reveal using motion-safe for prefers-reduced-motion support */}
        <div
          className={[
            'motion-safe:transition-all motion-safe:duration-[250ms]',
            showResult && result
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2.5 pointer-events-none',
          ].join(' ')}
          aria-live="polite"
          aria-atomic="true"
        >
          {showResult && result && (
            <div className="bg-brand-blue-light rounded-xl p-6 mb-6">
              {/* Premium range headline — rendered as single paragraph for accessible text reading */}
              <p
                className="font-heading font-bold text-[#333333] text-h3 mb-4"
                data-testid="premium-headline"
              >
                Etwa{' '}
                <span className="text-brand-orange">{result.low} &euro;</span>
                {' \u2013 '}
                <span className="text-brand-orange">{result.high} &euro;</span>
                {' '}pro Monat
              </p>

              {/* Insurer badges — first 3 from anbieter prop */}
              {anbieterBadges.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4" aria-label="Beispielanbieter">
                  {anbieterBadges.map(name => (
                    <span
                      key={name}
                      className="text-xs font-body font-light border border-brand-orange text-[#333333] px-2 py-1 rounded-none"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {/* Mandatory disclaimer — always visible once result shown, never collapsible */}
              <p className="text-sm font-body font-light text-brand-neutral-muted">
                Hinweis: Diese Berechnung dient ausschließlich zur Orientierung und stellt kein
                verbindliches Angebot dar. Die tatsächlichen Beiträge können je nach
                Gesundheitszustand, Anbieter und individuellen Faktoren abweichen. Bitte fordern
                Sie ein persönliches Angebot an.
              </p>
            </div>
          )}

          {/* CTA button — visible only when result is shown */}
          {showResult && result && (
            <button
              type="button"
              onClick={handleCTAClick}
              className="w-full bg-brand-orange text-white font-body font-bold min-h-[44px] px-6 py-3 rounded-none hover:bg-brand-orange-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-link"
            >
              Ihren genauen Beitrag jetzt anfragen
            </button>
          )}
        </div>
      </div>

      {/* LeadForm wrapper — immer sichtbar, sobald ein Beitrags-Ergebnis vorliegt.
          Daten aus dem Rechner sind vorbefüllt; der User kann den Text bearbeiten. */}
      <div
        ref={leadFormRef}
        className={[
          'max-w-2xl mx-auto mt-8',
          'motion-safe:transition-all motion-safe:duration-[250ms]',
          showResult && result
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2.5 pointer-events-none h-0 overflow-hidden mt-0',
        ].join(' ')}
        aria-live="polite"
      >
        {showResult && result && (
          <>
            <h3 className="font-heading font-bold text-[#333333] text-h3 mb-4 text-center">
              Persönliches Angebot anfordern
            </h3>
            <LeadForm
              key={formKey}
              intentTag="preis"
              produktId={produktId}
              zielgruppeTag={zielgruppeTag}
              defaultInteresse={prefillInteresse}
            />
          </>
        )}
      </div>
    </section>
  )
}
