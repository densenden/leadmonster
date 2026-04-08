'use client'

import { useState } from 'react'

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
}

/** Named export — no default export per project convention. */
export function LeadForm({ produktId, zielgruppeTag, intentTag }: LeadFormProps) {
  // Four-state status machine: all conditional rendering derives from this single variable.
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Controlled field values
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [interesse, setInteresse] = useState('')

  // Client-side email validation error — separate from network status
  const [emailError, setEmailError] = useState('')

  // Honeypot value — humans never see or interact with this field
  const [honeypot, setHoneypot] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError('')

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

    setStatus('loading')

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
          intent_tag: intentTag,
          vorname,
          nachname,
          email,
          telefon,
          interesse,
          website: honeypot,
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

  const inputClass = [
    'w-full border border-gray-300 rounded-none px-3 py-2 text-sm font-light',
    'focus:outline-none focus:ring-2 focus:ring-[#36afeb]',
    isLoading ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const labelClass = 'block text-sm font-light mb-1 text-[#666666]'

  return (
    <form
      id="formular"
      onSubmit={handleSubmit}
      className="bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] rounded-none py-[40px] px-8"
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

      <div className="flex flex-col gap-[30px]">
        {/* Vorname */}
        <div>
          <label htmlFor="vorname" className={labelClass}>
            Vorname
          </label>
          <input
            id="vorname"
            type="text"
            value={vorname}
            onChange={e => setVorname(e.target.value)}
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        {/* Nachname */}
        <div>
          <label htmlFor="nachname" className={labelClass}>
            Nachname
          </label>
          <input
            id="nachname"
            type="text"
            value={nachname}
            onChange={e => setNachname(e.target.value)}
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        {/* E-Mail — required field with accessible error */}
        <div>
          <label htmlFor="email" className={labelClass}>
            E-Mail-Adresse <span aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            aria-required="true"
            aria-describedby="email-error"
            disabled={isLoading}
            className={inputClass}
          />
          {/* Always rendered so layout doesn't shift on error; empty string when no error */}
          <p id="email-error" role="alert" className="text-red-600 text-sm mt-1">
            {emailError}
          </p>
        </div>

        {/* Telefon — optional */}
        <div>
          <label htmlFor="telefon" className={labelClass}>
            Telefonnummer (optional)
          </label>
          <input
            id="telefon"
            type="tel"
            value={telefon}
            onChange={e => setTelefon(e.target.value)}
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        {/* Interesse — optional */}
        <div>
          <label htmlFor="interesse" className={labelClass}>
            Ihr Interesse / Ihre Frage (optional)
          </label>
          <textarea
            id="interesse"
            value={interesse}
            onChange={e => setInteresse(e.target.value)}
            disabled={isLoading}
            rows={4}
            className={`${inputClass} min-h-[100px] resize-y`}
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
