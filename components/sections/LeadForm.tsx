'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { FieldError } from '@/components/ui/FieldError'

/**
 * LeadForm — public-facing lead capture form.
 * Submits to POST /api/leads with CSRF header and honeypot protection.
 * Props are pre-set from page context; the form adds user-entered fields.
 */
export interface LeadFormProps {
  /** Supabase UUID of the product — sent with the lead on submission. */
  produktId: string
  /** Zielgruppe tag pre-set from page context (e.g. "senioren_50plus"). */
  zielgruppeTag: string
  /** Intent tag pre-set from page context (e.g. "sicherheit", "preis", "sofortschutz").
   *  Optional — when omitted the field is sent as undefined and the API applies its own default. */
  intentTag?: string
  /** Optional Anbieter-Wunsch aus VergleichsRechner — wenn gesetzt, wird ein
   *  sichtbarer Hinweis "Anfrage zu: {Anbieter}" angezeigt und das Feld als
   *  gewuenschterAnbieter mit dem Submit gesendet. */
  gewuenschterAnbieter?: string
  /** Vorbefüllter Text fürs Interesse-Feld — wird vom TarifRechner / VergleichsRechner
   *  genutzt, um die ausgewählten Werte (Alter, Wunschsumme, Beitragsspanne)
   *  als Konversationsstart in die Anfrage zu schreiben. Der User kann den Text
   *  überschreiben. */
  defaultInteresse?: string
  /** Filter-Werte aus dem VergleichsRechner — werden als Hidden-Inputs an
   *  /api/leads gesendet und dort in leads.<lead_field> + leads.filter_kontext
   *  persistiert (für Convexa-Push). */
  filterContext?: Record<string, unknown>
  /** Versicherungssumme aus dem Rechner (TarifRechner.sum oder
   *  VergleichsRechner.summe) — wird als Hidden-Field in filterContext.sterbegeld_summe
   *  gesendet, damit Christian beim Lead direkt die Wunschsumme sieht. */
  defaultSumme?: number
  /** Akzeptierte Wartezeit aus dem VergleichsRechner — wird als Hidden-Field
   *  in filterContext.akzeptierte_wartezeit_monate gesendet. Optional, da der
   *  TarifRechner keine Wartezeit-Auswahl hat. */
  defaultWartezeitMonate?: number
}

/** Named export — no default export per project convention. */
export function LeadForm({
  produktId,
  zielgruppeTag,
  intentTag,
  gewuenschterAnbieter,
  defaultInteresse,
  filterContext,
  defaultSumme,
  defaultWartezeitMonate,
}: LeadFormProps) {
  // Four-state status machine: all conditional rendering derives from this single variable.
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Controlled field values
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [interesse, setInteresse] = useState(defaultInteresse ?? '')

  // Kontakt-Felder für blinde Angebotsversendung (Christian-Wunsch).
  const [geburtsdatum, setGeburtsdatum] = useState('')
  const [strasse, setStrasse] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')

  // Client-side validation errors — separate from network status
  const [emailError, setEmailError] = useState('')
  const [plzError, setPlzError] = useState('')

  // Honeypot value — humans never see or interact with this field
  const [honeypot, setHoneypot] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')
    setPlzError('')

    // Client-side email presence check
    if (!email) {
      setEmailError('Bitte geben Sie Ihre E-Mail-Adresse ein.')
      return
    }

    // Client-side email format check
    if (!/.+@.+\..+/.test(email)) {
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
      return
    }

    // PLZ optional, aber wenn ausgefüllt → 5-stellig DE.
    if (plz && !/^\d{5}$/.test(plz)) {
      setPlzError('Die PLZ muss 5-stellig sein.')
      return
    }

    setStatus('loading')

    // Hidden filter-Kontext: Defaults aus Rechner + bestehender filterContext zusammenführen.
    // defaultSumme/defaultWartezeitMonate landen unter den Schlüsseln, die
    // KNOWN_LEAD_FIELDS in der API als eigene Spalten erkennen.
    const mergedFilterContext: Record<string, unknown> = { ...(filterContext ?? {}) }
    if (typeof defaultSumme === 'number' && mergedFilterContext.sterbegeld_summe == null) {
      mergedFilterContext.sterbegeld_summe = defaultSumme
    }
    if (
      typeof defaultWartezeitMonate === 'number' &&
      mergedFilterContext.akzeptierte_wartezeit_monate == null
    ) {
      mergedFilterContext.akzeptierte_wartezeit_monate = defaultWartezeitMonate
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          produktId,
          zielgruppeTag,
          intentTag,
          gewuenschterAnbieter,
          vorname,
          nachname,
          email,
          telefon,
          interesse,
          geburtsdatum: geburtsdatum || undefined,
          strasse: strasse || undefined,
          plz: plz || undefined,
          ort: ort || undefined,
          website: honeypot,
          filterContext:
            Object.keys(mergedFilterContext).length > 0 ? mergedFilterContext : undefined,
        }),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  // Success state: replace form entirely with thank-you block.
  // role="status" announces the message to screen readers.
  if (status === 'success') {
    return (
      <div
        role="status"
        id="formular"
        className="bg-white p-8 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] rounded-none"
      >
        <h3 className="font-heading font-bold text-[#1a365d] text-xl mb-3">
          Vielen Dank für Ihre Anfrage!
        </h3>
        <p className="font-body font-light text-[#666666]">
          Wir melden uns innerhalb von 24 Stunden bei Ihnen.
        </p>
      </div>
    )
  }

  const isLoading = status === 'loading'

  return (
    <form
      id="formular"
      onSubmit={handleSubmit}
      className="bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-xl py-10 px-6 md:px-8"
      noValidate
    >
      {/* Honeypot — hidden from humans via inline style, not Tailwind (avoids purge risk) */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
        />
      </div>

      {/* Anbieter-Wunsch aus VergleichsRechner — sichtbarer Hinweis + Hidden-Field */}
      {gewuenschterAnbieter && (
        <div
          data-testid="leadform-anbieter-hint"
          className="mb-6 px-4 py-3 bg-brand-blue-light text-sm font-body text-[#333333]"
        >
          Ihre Anfrage bezieht sich auf: <strong>{gewuenschterAnbieter}</strong>
          <input
            type="hidden"
            name="gewuenschter_anbieter"
            value={gewuenschterAnbieter}
            readOnly
          />
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Vorname + Nachname nebeneinander auf Tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              type="text"
              autoComplete="given-name"
              value={vorname}
              onChange={e => setVorname(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              type="text"
              autoComplete="family-name"
              value={nachname}
              onChange={e => setNachname(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* E-Mail — required */}
        <div>
          <Label htmlFor="email" required>E-Mail-Adresse</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            aria-required="true"
            aria-describedby="email-error"
            disabled={isLoading}
            invalid={Boolean(emailError)}
          />
          <FieldError id="email-error">{emailError}</FieldError>
        </div>

        {/* Telefon */}
        <div>
          <Label htmlFor="telefon">Telefonnummer <span className="text-[#888] font-normal">(optional)</span></Label>
          <Input
            id="telefon"
            type="tel"
            autoComplete="tel"
            value={telefon}
            onChange={e => setTelefon(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Geburtsdatum — Vertriebs-Wunsch für blinde Angebotsversendung */}
        <div>
          <Label htmlFor="geburtsdatum">
            Geburtsdatum <span className="text-[#888] font-normal">(optional, präziser Beitrag)</span>
          </Label>
          <Input
            id="geburtsdatum"
            type="date"
            autoComplete="bday"
            value={geburtsdatum}
            onChange={e => setGeburtsdatum(e.target.value)}
            disabled={isLoading}
            min="1925-01-01"
            max="2010-12-31"
          />
        </div>

        {/* Adresse */}
        <div>
          <Label htmlFor="strasse">
            Straße &amp; Hausnummer <span className="text-[#888] font-normal">(optional)</span>
          </Label>
          <Input
            id="strasse"
            type="text"
            autoComplete="street-address"
            value={strasse}
            onChange={e => setStrasse(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <div>
            <Label htmlFor="plz">PLZ</Label>
            <Input
              id="plz"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              value={plz}
              onChange={e => setPlz(e.target.value)}
              disabled={isLoading}
              maxLength={5}
              aria-describedby="plz-error"
              invalid={Boolean(plzError)}
            />
            <FieldError id="plz-error">{plzError}</FieldError>
          </div>
          <div>
            <Label htmlFor="ort">Ort</Label>
            <Input
              id="ort"
              type="text"
              autoComplete="address-level2"
              value={ort}
              onChange={e => setOrt(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Interesse */}
        <div>
          <Label htmlFor="interesse">
            Ihr Interesse / Ihre Frage <span className="text-[#888] font-normal">(optional)</span>
          </Label>
          <Textarea
            id="interesse"
            value={interesse}
            onChange={e => setInteresse(e.target.value)}
            disabled={isLoading}
            rows={4}
          />
        </div>

        {/* Submit button — full-width, accessible, loading-aware */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#abd5f4] text-gray-900 font-body font-bold rounded-none min-h-[44px] px-6 hover:brightness-95 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && (
            <svg
              aria-hidden="true"
              focusable={false}
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {isLoading ? 'Wird gesendet\u2026' : 'Jetzt Angebot anfordern'}
        </button>

        {/* Server/network error message — rendered only in error state */}
        {status === 'error' && (
          <p role="alert" className="text-red-600 text-sm text-center">
            Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns
            direkt.
          </p>
        )}
      </div>
    </form>
  )
}
