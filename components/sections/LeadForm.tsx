'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { FieldError } from '@/components/ui/FieldError'
import { readMarketingConsent } from '@/lib/cookies/consent'
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/lead-consent'
import { trackMetaLead } from '@/lib/tracking/meta-pixel'
import { TurnstileField } from '@/components/sections/TurnstileField'
import { HCaptchaField } from '@/components/sections/HCaptchaField'
import type { CaptchaProvider } from '@/lib/captcha/types'
import {
  formatGermanBirthdateInput,
  parseGermanBirthdateToIso,
} from '@/lib/utils/date'

const BIRTHDATE_MIN = '1925-01-01'
const BIRTHDATE_MAX = '2010-12-31'
const BIRTHDATE_MIN_DE = '01.01.1925'
const BIRTHDATE_MAX_DE = '31.12.2010'

/** Maps formId prefixes to a stable Convexa FormPlacement value. */
const FORM_PLACEMENT_BY_ID: Record<string, string> = {
  'lead-form-hauptseite': 'hauptseite',
  'lead-form-vergleich': 'vergleichsrechner',
  'lead-form-tarif': 'tarifrechner',
  'lead-form-ratgeber': 'ratgeber',
  'lead-form-vergleich-page': 'vergleich',
  'lead-form-anbieter': 'anbieter',
}

function resolveFormPlacement(formId: string): string {
  return FORM_PLACEMENT_BY_ID[formId] ?? 'sonstige'
}

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
  /** Unique prefix for field ids when multiple forms exist on one page. */
  formId?: string
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
  /** Akzeptierte Wartezeit aus dem VergleichsRechner — vorbefüllt das sichtbare Wartezeit-Feld. */
  defaultWartezeitMonate?: number
  /** Dropdown-Optionen für „Akzeptable Wartezeit“ (Sterbegeld). Wenn gesetzt, erscheint das Feld im Formular. */
  wartezeitOptions?: ReadonlyArray<{ value: number; label: string }>
  /** false = Wartezeit kommt aus gewähltem Anbieter-Tarif (kein Dropdown). */
  showWartezeitDropdown?: boolean
  /** Lesbarer Hinweis wenn Dropdown ausgeblendet (z. B. „6 Monate (LV1871-Tarif)“). */
  wartezeitFromTarifLabel?: string
  /** Monatsbeitrag aus Rechner — wird als monatsbeitrag_eur an Convexa gesendet. */
  defaultMonatsbeitrag?: number
  /** Link to privacy policy — product-scoped or top-level `/datenschutz`. */
  datenschutzHref?: string
}

function resolveInitialWartezeit(
  defaultWartezeitMonate?: number,
  filterContext?: Record<string, unknown>,
): string {
  if (defaultWartezeitMonate != null) return String(defaultWartezeitMonate)
  const fromContext = filterContext?.akzeptierte_wartezeit_monate
  if (typeof fromContext === 'number') return String(fromContext)
  return ''
}

/** Named export — no default export per project convention. */
export function LeadForm({
  produktId,
  zielgruppeTag,
  intentTag,
  formId = 'lead-form',
  gewuenschterAnbieter,
  defaultInteresse,
  filterContext,
  defaultSumme,
  defaultWartezeitMonate,
  wartezeitOptions,
  showWartezeitDropdown = true,
  wartezeitFromTarifLabel,
  defaultMonatsbeitrag,
  datenschutzHref = '/datenschutz',
}: LeadFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false)
  // Never assume enabled from env alone — Admin can turn captcha off in DB without redeploy.
  const [captchaEnabled, setCaptchaEnabled] = useState(false)
  const [captchaProvider, setCaptchaProvider] = useState<CaptchaProvider>('turnstile')
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  /** True when widget failed to load — hard-fail: block submit. */
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false)
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0)
  /** ISO timestamp when the form mounted — used for min dwell time on the server. */
  const [formLoadedAt] = useState(() => new Date().toISOString())
  const [captchaError, setCaptchaError] = useState('')
  const [formError, setFormError] = useState('')

  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [geburtsdatum, setGeburtsdatum] = useState('')
  const [strasse, setStrasse] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [interesse, setInteresse] = useState(defaultInteresse ?? '')
  const [wartezeitMonate, setWartezeitMonate] = useState(() =>
    resolveInitialWartezeit(defaultWartezeitMonate, filterContext),
  )

  // Always ask the server if captcha is on — Admin toggle + provider in einstellungen wins.
  useEffect(() => {
    let cancelled = false

    async function loadConfig() {
      try {
        const res = await fetch('/api/captcha/config')
        if (cancelled || !res || !res.ok) return
        const data = (await res.json()) as {
          enabled?: boolean
          provider?: CaptchaProvider
          siteKey?: string | null
        }
        if (cancelled) return
        if (data.enabled && data.siteKey) {
          setCaptchaEnabled(true)
          setCaptchaProvider(data.provider === 'hcaptcha' ? 'hcaptcha' : 'turnstile')
          setCaptchaSiteKey(data.siteKey)
          setCaptchaUnavailable(false)
        } else {
          setCaptchaEnabled(false)
          setCaptchaToken(null)
          setCaptchaSiteKey(null)
        }
      } catch {
        // Captcha stays off if config endpoint fails — honeypot + rate limit still apply.
        if (!cancelled) setCaptchaEnabled(false)
      }
    }

    void loadConfig()

    return () => {
      cancelled = true
    }
  }, [])

  // Keep calculator prefill in sync when parent remounts or filter values change.
  useEffect(() => {
    if (defaultInteresse != null) {
      setInteresse(defaultInteresse)
    }
  }, [defaultInteresse])

  useEffect(() => {
    const next = resolveInitialWartezeit(defaultWartezeitMonate, filterContext)
    if (next) setWartezeitMonate(next)
  }, [
    defaultWartezeitMonate,
    filterContext?.akzeptierte_wartezeit_monate,
  ])

  const [vornameError, setVornameError] = useState('')
  const [nachnameError, setNachnameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [telefonError, setTelefonError] = useState('')
  const [geburtsdatumError, setGeburtsdatumError] = useState('')
  const [strasseError, setStrasseError] = useState('')
  const [plzError, setPlzError] = useState('')
  const [ortError, setOrtError] = useState('')
  const [wartezeitError, setWartezeitError] = useState('')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [privacyConsentError, setPrivacyConsentError] = useState('')

  const [honeypot, setHoneypot] = useState('')

  const field = (name: string) => `${formId}-${name}`

  function validateGeburtsdatum(value: string): string {
    if (!value.trim()) return 'Bitte geben Sie Ihr Geburtsdatum ein.'
    const iso = parseGermanBirthdateToIso(value)
    if (!iso) {
      return 'Bitte geben Sie Ihr Geburtsdatum als TT.MM.JJJJ ein.'
    }
    if (iso < BIRTHDATE_MIN || iso > BIRTHDATE_MAX) {
      return `Geburtsdatum muss zwischen ${BIRTHDATE_MIN_DE} und ${BIRTHDATE_MAX_DE} liegen.`
    }
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVornameError('')
    setNachnameError('')
    setEmailError('')
    setTelefonError('')
    setGeburtsdatumError('')
    setStrasseError('')
    setPlzError('')
    setOrtError('')
    setWartezeitError('')
    setPrivacyConsentError('')
    setCaptchaError('')
    setFormError('')

    let hasError = false

    if (!privacyConsent) {
      setPrivacyConsentError(
        'Bitte bestätigen Sie, dass Sie die Datenschutzerklärung gelesen haben.',
      )
      hasError = true
    }

    // Hard-fail: captcha must load AND produce a token before submit.
    if (captchaEnabled) {
      if (captchaUnavailable) {
        setCaptchaError(
          'Sicherheitscheck konnte nicht geladen werden. Bitte Seite neu laden.',
        )
        hasError = true
      } else if (!captchaToken) {
        setCaptchaError('Bitte bestätigen Sie, dass Sie kein Roboter sind.')
        hasError = true
      }
    }

    if (!vorname.trim()) {
      setVornameError('Bitte geben Sie Ihren Vornamen ein.')
      hasError = true
    }

    if (!nachname.trim()) {
      setNachnameError('Bitte geben Sie Ihren Nachnamen ein.')
      hasError = true
    }

    if (!email) {
      setEmailError('Bitte geben Sie Ihre E-Mail-Adresse ein.')
      hasError = true
    } else if (!/.+@.+\..+/.test(email)) {
      setEmailError('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
      hasError = true
    }

    if (!telefon.trim()) {
      setTelefonError('Bitte geben Sie Ihre Telefonnummer ein.')
      hasError = true
    }

    const birthError = validateGeburtsdatum(geburtsdatum)
    const geburtsdatumIso = parseGermanBirthdateToIso(geburtsdatum)
    if (birthError || !geburtsdatumIso) {
      setGeburtsdatumError(birthError || 'Bitte geben Sie Ihr Geburtsdatum als TT.MM.JJJJ ein.')
      hasError = true
    }

    if (!strasse.trim()) {
      setStrasseError('Bitte geben Sie Ihre Straße und Hausnummer ein.')
      hasError = true
    }

    if (!plz.trim()) {
      setPlzError('Bitte geben Sie Ihre PLZ ein.')
      hasError = true
    } else if (!/^\d{5}$/.test(plz.trim())) {
      setPlzError('PLZ muss 5-stellig sein.')
      hasError = true
    }

    if (!ort.trim()) {
      setOrtError('Bitte geben Sie Ihren Ort ein.')
      hasError = true
    }

    const showWartezeitDropdownField =
      (wartezeitOptions?.length ?? 0) > 0 && showWartezeitDropdown
    let parsedWartezeit: number | undefined
    if (showWartezeitDropdownField) {
      if (!wartezeitMonate) {
        setWartezeitError('Bitte wählen Sie Ihre akzeptable Wartezeit.')
        hasError = true
      } else {
        parsedWartezeit = Number(wartezeitMonate)
        if (Number.isNaN(parsedWartezeit)) {
          setWartezeitError('Bitte wählen Sie eine gültige Wartezeit.')
          hasError = true
        }
      }
    } else if (typeof defaultWartezeitMonate === 'number') {
      parsedWartezeit = defaultWartezeitMonate
    }

    if (hasError) return
    // After validation, ISO date is always present.
    if (!geburtsdatumIso) return

    setStatus('loading')

    const mergedFilterContext: Record<string, unknown> = { ...(filterContext ?? {}) }
    if (typeof defaultSumme === 'number' && mergedFilterContext.sterbegeld_summe == null) {
      mergedFilterContext.sterbegeld_summe = defaultSumme
    }
    if (
      parsedWartezeit !== undefined &&
      mergedFilterContext.akzeptierte_wartezeit_monate == null
    ) {
      mergedFilterContext.akzeptierte_wartezeit_monate = parsedWartezeit
    } else     if (
      typeof defaultWartezeitMonate === 'number' &&
      mergedFilterContext.akzeptierte_wartezeit_monate == null
    ) {
      mergedFilterContext.akzeptierte_wartezeit_monate = defaultWartezeitMonate
    }
    if (
      typeof defaultMonatsbeitrag === 'number' &&
      mergedFilterContext.monatsbeitrag_eur == null
    ) {
      mergedFilterContext.monatsbeitrag_eur = defaultMonatsbeitrag
    }

    const sourceUrl = typeof window !== 'undefined' ? window.location.href : undefined

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
          intentTag: intentTag ?? 'anfrage',
          formPlacement: resolveFormPlacement(formId),
          gewuenschterAnbieter,
          vorname: vorname.trim(),
          nachname: nachname.trim(),
          email,
          telefon: telefon.trim(),
          // API expects ISO YYYY-MM-DD; UI shows German TT.MM.JJJJ.
          geburtsdatum: geburtsdatumIso,
          strasse: strasse.trim(),
          plz: plz.trim(),
          ort: ort.trim(),
          interesse,
          sourceUrl,
          website: honeypot,
          turnstileToken: captchaToken ?? undefined,
          formLoadedAt,
          privacyConsent: true,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
          marketingConsent,
          filterContext:
            Object.keys(mergedFilterContext).length > 0 ? mergedFilterContext : undefined,
        }),
      })

      let payload: {
        data?: { id?: string; emailConfirmation?: boolean } | null
        error?: { code?: string; message?: string }
      } = {}
      try {
        payload = await res.json()
      } catch {
        payload = {}
      }

      // Honeypot hits return HTTP 200 with id "bot" — must not show a fake success screen.
      const savedLeadId = payload.data?.id
      if (res.ok && savedLeadId && savedLeadId !== 'bot') {
        if (readMarketingConsent()) {
          const beitragRaw = mergedFilterContext.monatsbeitrag_eur
          const beitragValue =
            typeof beitragRaw === 'number'
              ? beitragRaw
              : typeof beitragRaw === 'string'
                ? Number(beitragRaw)
                : undefined
          trackMetaLead({
            contentName: intentTag ?? zielgruppeTag,
            value: beitragValue != null && !Number.isNaN(beitragValue) ? beitragValue : undefined,
            currency: 'EUR',
          })
        }
        setAwaitingEmailConfirm(payload.data?.emailConfirmation === true)
        setStatus('success')
      } else {
        setStatus('error')
        setCaptchaToken(null)
        setCaptchaResetSignal(n => n + 1)
        const apiMessage = payload.error?.message
        if (
          payload.error?.code === 'CAPTCHA_REQUIRED' ||
          payload.error?.code === 'CAPTCHA_FAILED' ||
          payload.error?.code === 'TOO_FAST'
        ) {
          setCaptchaError(
            apiMessage ?? 'Captcha-Prüfung fehlgeschlagen. Bitte erneut bestätigen.',
          )
        }
        setFormError(
          apiMessage ??
            (payload.error?.code === 'VALIDATION_ERROR'
              ? 'Eingaben ungültig. Bitte Felder prüfen und erneut senden.'
              : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.'),
        )
      }
    } catch {
      setStatus('error')
      setCaptchaToken(null)
      setCaptchaResetSignal(n => n + 1)
      setFormError(
        'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
      )
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="bg-white p-4 sm:p-8 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] rounded-none"
      >
        <h3 className="font-heading font-bold text-[#1a365d] text-xl mb-3">
          Vielen Dank für Ihre Anfrage!
        </h3>
        <p className="font-body font-light text-[#666666]">
          {awaitingEmailConfirm
            ? 'Bitte bestätigen Sie Ihre E-Mail-Adresse. Wir haben Ihnen einen Link geschickt. Erst nach dem Klick können wir Ihre Anfrage bearbeiten. Schauen Sie auch im Spam-Ordner nach. Der Link ist 72 Stunden gültig.'
            : 'Wir melden uns innerhalb von 24 Stunden bei Ihnen.'}
        </p>
      </div>
    )
  }

  const isLoading = status === 'loading'

  return (
    <form
      id={field('form')}
      onSubmit={handleSubmit}
      className="bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08)] rounded-xl py-8 px-4 sm:py-10 sm:px-6 md:px-8"
      noValidate
    >
      {/* Honeypot — no `name` attribute (autofill matches on name="website" otherwise).
          readOnly until focus blocks most password-manager autofill without hurting bots. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor={field('company')}>Firma</label>
        <input
          id={field('company')}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          readOnly
          value={honeypot}
          onFocus={e => e.currentTarget.removeAttribute('readonly')}
          onChange={e => setHoneypot(e.target.value)}
        />
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={field('vorname')} required>
              Vorname
            </Label>
            <Input
              id={field('vorname')}
              type="text"
              autoComplete="given-name"
              value={vorname}
              onChange={e => setVorname(e.target.value)}
              required
              aria-required="true"
              aria-describedby={field('vorname-error')}
              disabled={isLoading}
              invalid={Boolean(vornameError)}
            />
            <FieldError id={field('vorname-error')}>{vornameError}</FieldError>
          </div>
          <div>
            <Label htmlFor={field('nachname')} required>
              Nachname
            </Label>
            <Input
              id={field('nachname')}
              type="text"
              autoComplete="family-name"
              value={nachname}
              onChange={e => setNachname(e.target.value)}
              required
              aria-required="true"
              aria-describedby={field('nachname-error')}
              disabled={isLoading}
              invalid={Boolean(nachnameError)}
            />
            <FieldError id={field('nachname-error')}>{nachnameError}</FieldError>
          </div>
        </div>

        <div>
          <Label htmlFor={field('email')} required>
            E-Mail-Adresse
          </Label>
          <Input
            id={field('email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            aria-required="true"
            aria-describedby={field('email-error')}
            disabled={isLoading}
            invalid={Boolean(emailError)}
          />
          <FieldError id={field('email-error')}>{emailError}</FieldError>
        </div>

        <div>
          <Label htmlFor={field('telefon')} required>
            Telefonnummer
          </Label>
          <Input
            id={field('telefon')}
            type="tel"
            autoComplete="tel"
            value={telefon}
            onChange={e => setTelefon(e.target.value)}
            required
            aria-required="true"
            aria-describedby={field('telefon-error')}
            disabled={isLoading}
            invalid={Boolean(telefonError)}
          />
          <FieldError id={field('telefon-error')}>{telefonError}</FieldError>
        </div>

        <div>
          <Label htmlFor={field('geburtsdatum')} required>
            Geburtsdatum
          </Label>
          <Input
            id={field('geburtsdatum')}
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="TT.MM.JJJJ"
            maxLength={10}
            value={geburtsdatum}
            onChange={e => setGeburtsdatum(formatGermanBirthdateInput(e.target.value))}
            required
            aria-required="true"
            aria-describedby={`${field('geburtsdatum-hint')} ${field('geburtsdatum-error')}`}
            disabled={isLoading}
            invalid={Boolean(geburtsdatumError)}
          />
          <p
            id={field('geburtsdatum-hint')}
            className="mt-1 text-sm text-[#666666] font-body"
          >
            Bitte als Tag.Monat.Jahr eingeben, z.&nbsp;B. 15.05.1960
          </p>
          <FieldError id={field('geburtsdatum-error')}>{geburtsdatumError}</FieldError>
        </div>

        <div>
          <Label htmlFor={field('strasse')} required>
            Straße und Hausnummer
          </Label>
          <Input
            id={field('strasse')}
            type="text"
            autoComplete="street-address"
            value={strasse}
            onChange={e => setStrasse(e.target.value)}
            required
            aria-required="true"
            aria-describedby={field('strasse-error')}
            disabled={isLoading}
            invalid={Boolean(strasseError)}
          />
          <FieldError id={field('strasse-error')}>{strasseError}</FieldError>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={field('plz')} required>
              PLZ
            </Label>
            <Input
              id={field('plz')}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={plz}
              onChange={e => setPlz(e.target.value.replace(/\D/g, '').slice(0, 5))}
              required
              aria-required="true"
              aria-describedby={field('plz-error')}
              disabled={isLoading}
              invalid={Boolean(plzError)}
            />
            <FieldError id={field('plz-error')}>{plzError}</FieldError>
          </div>
          <div>
            <Label htmlFor={field('ort')} required>
              Ort
            </Label>
            <Input
              id={field('ort')}
              type="text"
              autoComplete="address-level2"
              value={ort}
              onChange={e => setOrt(e.target.value)}
              required
              aria-required="true"
              aria-describedby={field('ort-error')}
              disabled={isLoading}
              invalid={Boolean(ortError)}
            />
            <FieldError id={field('ort-error')}>{ortError}</FieldError>
          </div>
        </div>

        {(wartezeitOptions?.length ?? 0) > 0 && showWartezeitDropdown && (
          <div>
            <Label htmlFor={field('wartezeit')} required>
              Akzeptable Wartezeit
            </Label>
            <select
              id={field('wartezeit')}
              value={wartezeitMonate}
              onChange={e => setWartezeitMonate(e.target.value)}
              required
              aria-required="true"
              aria-describedby={field('wartezeit-error')}
              disabled={isLoading}
              className={[
                'w-full border rounded-none px-3 py-2 text-sm font-body font-light text-[#333333]',
                'focus:outline-none focus:ring-2 focus:ring-brand-link min-h-[44px] bg-white cursor-pointer',
                wartezeitError ? 'border-red-500' : 'border-[#e5e5e5]',
              ].join(' ')}
            >
              <option value="">Bitte wählen…</option>
              {wartezeitOptions!.map(opt => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FieldError id={field('wartezeit-error')}>{wartezeitError}</FieldError>
          </div>
        )}

        {(wartezeitOptions?.length ?? 0) > 0 && !showWartezeitDropdown && wartezeitFromTarifLabel && (
          <div
            className="rounded-none border border-[#e5e5e5] bg-[#f8fafc] px-4 py-3 text-sm text-[#333333]"
            data-testid={`${formId}-wartezeit-from-tarif`}
          >
            <span className="font-medium">Wartezeit laut gewähltem Tarif:</span>{' '}
            {wartezeitFromTarifLabel}
          </div>
        )}

        <div>
          <Label htmlFor={field('interesse')}>
            Ihr Interesse / Ihre Frage <span className="text-[#888] font-normal">(optional)</span>
          </Label>
          <Textarea
            id={field('interesse')}
            value={interesse}
            onChange={e => setInteresse(e.target.value)}
            disabled={isLoading}
            rows={4}
          />
        </div>

        <div className="rounded-none border border-[#e5e5e5] bg-[#f8fafc] px-4 py-3 text-sm text-[#4a5568] leading-relaxed">
          Ihre Angaben werden zur Bearbeitung Ihrer Anfrage an unser Beratungsteam
          weitergeleitet (CRM-System Convexa). Unser Team meldet sich telefonisch oder
          per WhatsApp bei Ihnen.
        </div>

        <div>
          <div className="flex items-start gap-3">
            <input
              id={field('privacy-consent')}
              type="checkbox"
              checked={privacyConsent}
              onChange={e => {
                setPrivacyConsent(e.target.checked)
                if (e.target.checked) setPrivacyConsentError('')
              }}
              disabled={isLoading}
              required
              aria-required="true"
              aria-describedby={field('privacy-consent-error')}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#1a365d]"
            />
            <label
              htmlFor={field('privacy-consent')}
              className="text-sm text-[#333333] leading-relaxed cursor-pointer"
            >
              Ich habe die{' '}
              <Link
                href={datenschutzHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#02a9e6] hover:underline"
              >
                Datenschutzerklärung
              </Link>{' '}
              gelesen und willige ein, dass meine Daten zur Bearbeitung meiner
              Versicherungsanfrage verarbeitet werden.{' '}
              <span className="text-red-600" aria-hidden="true">
                *
              </span>
            </label>
          </div>
          <FieldError id={field('privacy-consent-error')}>{privacyConsentError}</FieldError>
        </div>

        <div className="flex items-start gap-3">
          <input
            id={field('marketing-consent')}
            type="checkbox"
            checked={marketingConsent}
            onChange={e => setMarketingConsent(e.target.checked)}
            disabled={isLoading}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#1a365d]"
          />
          <label
            htmlFor={field('marketing-consent')}
            className="text-sm text-[#333333] leading-relaxed cursor-pointer"
          >
            Ich bin damit einverstanden, telefonisch oder per E-Mail über passende
            Versicherungsangebote informiert zu werden.{' '}
            <span className="text-[#888]">(optional)</span>
          </label>
        </div>

        {captchaEnabled && captchaSiteKey && (
          <div>
            {captchaProvider === 'hcaptcha' ? (
              <HCaptchaField
                siteKey={captchaSiteKey}
                onTokenChange={token => {
                  setCaptchaToken(token)
                  if (token) setCaptchaError('')
                }}
                onAvailabilityChange={available => {
                  setCaptchaUnavailable(!available)
                }}
                resetSignal={captchaResetSignal}
              />
            ) : (
              <TurnstileField
                siteKey={captchaSiteKey}
                onTokenChange={token => {
                  setCaptchaToken(token)
                  if (token) setCaptchaError('')
                }}
                onAvailabilityChange={available => {
                  setCaptchaUnavailable(!available)
                }}
                resetSignal={captchaResetSignal}
              />
            )}
            <FieldError id={field('captcha-error')}>{captchaError}</FieldError>
          </div>
        )}

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

        {status === 'error' && (
          <p role="alert" className="text-red-600 text-sm text-center">
            {formError ||
              'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.'}
          </p>
        )}
      </div>
    </form>
  )
}
