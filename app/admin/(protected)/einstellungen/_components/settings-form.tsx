'use client'

// SettingsForm — Client Component for the Einstellungen admin page.
// Manages controlled state for Convexa CRM, sales notification, and the
// AI text-generation provider/model selection.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { saveSettings } from '@/app/admin/einstellungen/actions'
import { LLM_OPTIONS } from '@/lib/llm/options'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingsFormProps {
  convexaBaseUrl: string
  convexaFormToken: string
  convexaSyncEnabled: boolean
  /** @deprecated Bearer-Token wird nicht mehr genutzt — Convexa-Spec verwendet Form-Token in URL. */
  convexaApiToken: string
  /** @deprecated Workspace wird nicht mehr genutzt — Form-Token reicht zur Identifikation. */
  convexaWorkspaceId: string
  salesNotificationEmail: string
  /** Resend confirmation + sales mails after lead save. */
  resendEnabled: boolean
  aiTextProvider: string
  aiTextModel: string
  /** True when openai_api_key is stored in DB (key itself is not sent to client). */
  openaiApiKeyConfigured: boolean
  /** Captcha master switch (Turnstile or hCaptcha). */
  turnstileEnabled: boolean
  captchaProvider: 'turnstile' | 'hcaptcha'
  turnstileSiteKey: string
  /** True when turnstile_secret_key is stored (secret itself is not sent to client). */
  turnstileSecretConfigured: boolean
  hcaptchaSiteKey: string
  /** True when hcaptcha_secret_key is stored. */
  hcaptchaSecretConfigured: boolean
}

// ---------------------------------------------------------------------------
// Eye / EyeOff SVG icons (inline)
// ---------------------------------------------------------------------------

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Field component — label + input + helper text
// ---------------------------------------------------------------------------

interface FieldProps {
  id: string
  label: string
  helperText: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
  rightElement?: React.ReactNode
  placeholder?: string
}

function Field({
  id, label, helperText, value, onChange,
  type = 'text', autoComplete, rightElement, placeholder,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#333333]">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-sm text-[#333333] placeholder-[#999999] focus:border-[#02a9e6] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40"
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {rightElement}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-[#999999]">{helperText}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle switch — accessible on/off control for boolean settings
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  id: string
  label: string
  helperText: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSwitch({ id, label, helperText, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-[#333333]">
          {label}
        </label>
        <p className="mt-1 text-xs text-[#999999]">{helperText}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40 focus:ring-offset-2',
          checked ? 'bg-[#02a9e6]' : 'bg-[#cccccc]',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SettingsForm
// ---------------------------------------------------------------------------

export function SettingsForm(props: SettingsFormProps) {
  const [convexaBaseUrl, setConvexaBaseUrl] = useState(props.convexaBaseUrl)
  const [convexaFormToken, setConvexaFormToken] = useState(props.convexaFormToken)
  const [convexaSyncEnabled, setConvexaSyncEnabled] = useState(props.convexaSyncEnabled)
  const [salesNotificationEmail, setSalesNotificationEmail] = useState(props.salesNotificationEmail)
  const [resendEnabled, setResendEnabled] = useState(props.resendEnabled)

  // AI provider+model — combined into a single dropdown using "<provider>:<model>"
  // as the encoded value, mapped back to the LLM_OPTIONS catalog on save.
  const initialLLMValue = props.aiTextProvider && props.aiTextModel
    ? `${props.aiTextProvider}:${props.aiTextModel}`
    : `${LLM_OPTIONS[0].provider}:${LLM_OPTIONS[0].model}`
  const [llmValue, setLlmValue] = useState(initialLLMValue)
  const [aiProvider, aiModel] = llmValue.split(':')

  const [showToken, setShowToken] = useState(false)
  const [showOpenAiKey, setShowOpenAiKey] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [turnstileEnabled, setTurnstileEnabled] = useState(props.turnstileEnabled)
  const [captchaProvider, setCaptchaProvider] = useState<'turnstile' | 'hcaptcha'>(
    props.captchaProvider,
  )
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(props.turnstileSiteKey)
  const [turnstileSecretKey, setTurnstileSecretKey] = useState('')
  const [showTurnstileSecret, setShowTurnstileSecret] = useState(false)
  const [hcaptchaSiteKey, setHcaptchaSiteKey] = useState(props.hcaptchaSiteKey)
  const [hcaptchaSecretKey, setHcaptchaSecretKey] = useState('')
  const [showHcaptchaSecret, setShowHcaptchaSecret] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSave() {
    setSaveResult(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('convexa_base_url', convexaBaseUrl)
      fd.set('convexa_form_token', convexaFormToken)
      fd.set('convexa_sync_enabled', convexaSyncEnabled ? 'true' : 'false')
      fd.set('sales_notification_email', salesNotificationEmail)
      fd.set('resend_enabled', resendEnabled ? 'true' : 'false')
      fd.set('ai_text_provider', aiProvider)
      fd.set('ai_text_model', aiModel)
      fd.set('openai_api_key', openaiApiKey)
      fd.set('turnstile_enabled', turnstileEnabled ? 'true' : 'false')
      fd.set('captcha_provider', captchaProvider)
      fd.set('turnstile_site_key', turnstileSiteKey)
      fd.set('turnstile_secret_key', turnstileSecretKey)
      fd.set('hcaptcha_site_key', hcaptchaSiteKey)
      fd.set('hcaptcha_secret_key', hcaptchaSecretKey)

      const result = await saveSettings(fd)

      if (result.success) {
        setSaveResult({ success: true, message: 'Einstellungen gespeichert.' })
        // Refresh Server Component so freshly-saved values come back as props
        // on next mount, keeping client state and DB in sync.
        router.refresh()
      } else {
        setSaveResult({ success: false, message: result.error })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Convexa CRM */}
      <Card>
        <div className="mb-4">
          <h2 className="font-heading text-xl font-bold text-[#1a3252]">
            Convexa CRM
          </h2>
          <p className="mt-1 text-xs text-[#718096]">
            Lead-Sync nach Form-Submit. Bei ausgeschaltetem Sync bleiben Leads in Supabase
            (<code className="mx-1 px-1 py-0.5 bg-[#e1f0fb] rounded text-[#1a3252]">convexa_synced=false</code>)
            und können später nachgezogen werden.
          </p>
        </div>

        <div className="space-y-4">
          <ToggleSwitch
            id="convexa_sync_enabled"
            label="Convexa-Sync aktiv"
            helperText="Aus = keine Übertragung an Convexa bei neuen Leads. Ein = automatischer Push nach jedem Formular-Submit."
            checked={convexaSyncEnabled}
            onChange={setConvexaSyncEnabled}
          />

          <Field
            id="convexa_base_url"
            label="Convexa API Base-URL"
            helperText="Default: https://api.convexa.app"
            placeholder="https://api.convexa.app"
            value={convexaBaseUrl}
            onChange={setConvexaBaseUrl}
            autoComplete="url"
          />

          <Field
            id="convexa_form_token"
            label="Form-Token (Default für alle Produkte)"
            helperText="Token aus convexa.app Formular-Konfiguration. Endpunkt: https://api.convexa.app/submissions/<token>. Pro Produkt überschreibbar."
            value={convexaFormToken}
            onChange={setConvexaFormToken}
            type={showToken ? 'text' : 'password'}
            autoComplete="off"
            rightElement={
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? 'Token verbergen' : 'Token anzeigen'}
                className="rounded p-1 text-[#999999] hover:text-[#1a3252] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40"
              >
                {showToken ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />
        </div>
      </Card>

      {/* Card 2: KI-Modell für Content-Generierung */}
      <Card>
        <div className="mb-4">
          <h2 className="font-heading text-xl font-bold text-[#1a3252]">
            KI-Modell für Content-Generierung
          </h2>
          <p className="mt-1 text-xs text-[#718096]">
            Das gewählte Modell wird bei jedem Klick auf
            <code className="mx-1 px-1 py-0.5 bg-[#e1f0fb] rounded text-[#1a3252]">Generieren</code>
            verwendet (hauptseite, faq, vergleich, tarif, ratgeber).
            Tipp: günstige Modelle für Tests, teure für Produktion.
          </p>
        </div>

        <div>
          <label htmlFor="ai_model_select" className="block text-sm font-medium text-[#333333]">
            Aktives Modell
          </label>
          <select
            id="ai_model_select"
            value={llmValue}
            onChange={(e) => setLlmValue(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-sm text-[#333333] focus:border-[#02a9e6] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40 bg-white"
          >
            {LLM_OPTIONS.map((opt) => (
              <option key={`${opt.provider}:${opt.model}`} value={`${opt.provider}:${opt.model}`}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#999999]">
            Provider: <code className="font-mono">{aiProvider}</code> · Modell: <code className="font-mono">{aiModel}</code>
          </p>
        </div>
      </Card>

      {/* Card: OpenAI Bildgenerierung */}
      <Card>
        <div className="mb-4">
          <h2 className="font-heading text-xl font-bold text-[#1a3252]">
            Bildgenerierung (OpenAI)
          </h2>
          <p className="mt-1 text-xs text-[#718096]">
            Key für Hero-Bilder, Ratgeber-Cover und Section-Bilder (gpt-image-1).
            Wird auch genutzt, wenn <code className="mx-1 px-1 py-0.5 bg-[#e1f0fb] rounded text-[#1a3252]">OPENAI_API_KEY</code>
            in Vercel leer ist. Leer lassen = bestehenden Key behalten.
          </p>
        </div>

        <Field
          id="openai_api_key"
          label="OpenAI API-Key"
          helperText={
            props.openaiApiKeyConfigured
              ? 'Key ist gespeichert. Nur ausfüllen, wenn Sie ihn ersetzen möchten.'
              : 'Kein Key gespeichert — Bildgenerierung schlägt fehl, bis Sie einen Key eintragen.'
          }
          placeholder={props.openaiApiKeyConfigured ? '•••••••••••• (gespeichert)' : 'sk-…'}
          value={openaiApiKey}
          onChange={setOpenaiApiKey}
          type={showOpenAiKey ? 'text' : 'password'}
          autoComplete="off"
          rightElement={
            <button
              type="button"
              onClick={() => setShowOpenAiKey((prev) => !prev)}
              aria-label={showOpenAiKey ? 'Key verbergen' : 'Key anzeigen'}
              className="rounded p-1 text-[#999999] hover:text-[#1a3252] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40"
            >
              {showOpenAiKey ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />
      </Card>

      {/* Card: Bot protection (Turnstile or hCaptcha) */}
      <Card>
        <div className="mb-4">
          <h2 className="font-heading text-xl font-bold text-[#1a3252]">
            Bot-Schutz (Captcha)
          </h2>
          <p className="mt-1 text-xs text-[#718096]">
            Captcha auf öffentlichen Lead-Formularen. Ohne gültigen Token wird der Lead
            abgelehnt (Hard-Fail). Anbieter:{' '}
            <a
              href="https://dash.cloudflare.com/?to=/:account/turnstile"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#02a9e6] hover:underline"
            >
              Cloudflare Turnstile
            </a>{' '}
            oder{' '}
            <a
              href="https://dashboard.hcaptcha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#02a9e6] hover:underline"
            >
              hCaptcha
            </a>
            . Toggle aus = Captcha pausiert (Honeypot + Rate-Limit bleiben aktiv).
          </p>
        </div>

        <div className="space-y-4">
          <ToggleSwitch
            id="turnstile_enabled"
            label="Captcha aktiv"
            helperText="Ein = Widget im Formular + Server-Prüfung. Aus = kein Captcha (Notfall / Setup)."
            checked={turnstileEnabled}
            onChange={setTurnstileEnabled}
          />

          <div>
            <label
              htmlFor="captcha_provider"
              className="mb-1 block text-sm font-medium text-[#333333]"
            >
              Captcha-Anbieter
            </label>
            <select
              id="captcha_provider"
              value={captchaProvider}
              onChange={e =>
                setCaptchaProvider(e.target.value === 'hcaptcha' ? 'hcaptcha' : 'turnstile')
              }
              className="w-full rounded border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-[#333333] focus:border-[#02a9e6] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/30"
            >
              <option value="turnstile">Cloudflare Turnstile</option>
              <option value="hcaptcha">hCaptcha (Checkbox)</option>
            </select>
            <p className="mt-1 text-xs text-[#718096]">
              hCaptcha zeigt eine sichtbare Checkbox — oft robuster gegen einfache Bots.
            </p>
          </div>

          {captchaProvider === 'turnstile' ? (
            <>
              <Field
                id="turnstile_site_key"
                label="Turnstile Site Key (öffentlich)"
                helperText="Beginnt oft mit 0x… — wird im Browser-Widget verwendet."
                placeholder="0x4AAAAA…"
                value={turnstileSiteKey}
                onChange={setTurnstileSiteKey}
                autoComplete="off"
              />

              <Field
                id="turnstile_secret_key"
                label="Turnstile Secret Key (nur Server)"
                helperText={
                  props.turnstileSecretConfigured
                    ? 'Leer lassen behält den alten Wert. Bei Wechsel Secret erneut einfügen.'
                    : 'Kein Secret gespeichert — Captcha bleibt wirkungslos bis Secret + Site Key gesetzt sind.'
                }
                placeholder={
                  props.turnstileSecretConfigured
                    ? 'Secret erneut einfügen oder leer lassen'
                    : '0x4AAAAA…'
                }
                value={turnstileSecretKey}
                onChange={setTurnstileSecretKey}
                type={showTurnstileSecret ? 'text' : 'password'}
                autoComplete="off"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowTurnstileSecret(prev => !prev)}
                    aria-label={showTurnstileSecret ? 'Secret verbergen' : 'Secret anzeigen'}
                    className="rounded p-1 text-[#999999] hover:text-[#1a3252] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40"
                  >
                    {showTurnstileSecret ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
            </>
          ) : (
            <>
              <Field
                id="hcaptcha_site_key"
                label="hCaptcha Site Key (öffentlich)"
                helperText="Aus dashboard.hcaptcha.com → Sites."
                placeholder="…"
                value={hcaptchaSiteKey}
                onChange={setHcaptchaSiteKey}
                autoComplete="off"
              />

              <Field
                id="hcaptcha_secret_key"
                label="hCaptcha Secret Key (nur Server)"
                helperText={
                  props.hcaptchaSecretConfigured
                    ? 'Leer lassen behält den alten Wert. Bei Wechsel Secret erneut einfügen.'
                    : 'Kein Secret gespeichert — Captcha bleibt wirkungslos bis Secret + Site Key gesetzt sind.'
                }
                placeholder={
                  props.hcaptchaSecretConfigured
                    ? 'Secret erneut einfügen oder leer lassen'
                    : '0x…'
                }
                value={hcaptchaSecretKey}
                onChange={setHcaptchaSecretKey}
                type={showHcaptchaSecret ? 'text' : 'password'}
                autoComplete="off"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowHcaptchaSecret(prev => !prev)}
                    aria-label={showHcaptchaSecret ? 'Secret verbergen' : 'Secret anzeigen'}
                    className="rounded p-1 text-[#999999] hover:text-[#1a3252] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/40"
                  >
                    {showHcaptchaSecret ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
            </>
          )}

          {turnstileEnabled &&
            captchaProvider === 'turnstile' &&
            !turnstileSecretKey.trim() &&
            !props.turnstileSecretConfigured && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Captcha ist an, aber kein Turnstile-Secret gespeichert. Bitte Secret Key einfügen
                und speichern.
              </p>
            )}
          {turnstileEnabled &&
            captchaProvider === 'hcaptcha' &&
            !hcaptchaSecretKey.trim() &&
            !props.hcaptchaSecretConfigured && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Captcha ist an, aber kein hCaptcha-Secret gespeichert. Bitte Secret Key einfügen und
                speichern.
              </p>
            )}
        </div>
      </Card>

      {/* Card 3: E-Mail Benachrichtigungen */}
      <Card>
        <div className="mb-4">
          <h2 className="font-heading text-xl font-bold text-[#1a3252]">
            E-Mail-Benachrichtigungen
          </h2>
          <p className="mt-1 text-xs text-[#718096]">
            Resend-Mails nach Lead-Submit (Bestätigung an Interessent + Ping an Vertrieb).
            Läuft <strong>nicht</strong> über Convexa — eigener Schalter.
          </p>
        </div>

        <div className="space-y-4">
          <ToggleSwitch
            id="resend_enabled"
            label="Resend-Mails aktiv"
            helperText="Aus = keine Bestätigungs- und keine Vertriebs-Mail. Ein = beide Mails nach erfolgreichem Lead-Submit."
            checked={resendEnabled}
            onChange={setResendEnabled}
          />

          <Field
            id="sales_notification_email"
            label="Benachrichtigungs-E-Mail (Vertrieb)"
            helperText="Nur genutzt wenn Resend-Mails aktiv sind. Zieladresse für den Vertriebs-Ping."
            value={salesNotificationEmail}
            onChange={setSalesNotificationEmail}
            type="email"
            autoComplete="email"
          />
        </div>
      </Card>

      {/* Save button + feedback */}
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isPending}
          aria-label="Einstellungen speichern"
        >
          {isPending ? 'Wird gespeichert…' : 'Einstellungen speichern'}
        </Button>

        {saveResult && (
          <p
            className={
              saveResult.success
                ? 'text-sm text-green-700'
                : 'text-sm text-red-700'
            }
          >
            {saveResult.message}
          </p>
        )}
      </div>
    </div>
  )
}
