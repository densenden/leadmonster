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
  /** @deprecated Bearer-Token wird nicht mehr genutzt — Convexa-Spec verwendet Form-Token in URL. */
  convexaApiToken: string
  /** @deprecated Workspace wird nicht mehr genutzt — Form-Token reicht zur Identifikation. */
  convexaWorkspaceId: string
  salesNotificationEmail: string
  aiTextProvider: string
  aiTextModel: string
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
// SettingsForm
// ---------------------------------------------------------------------------

export function SettingsForm(props: SettingsFormProps) {
  const [convexaBaseUrl, setConvexaBaseUrl] = useState(props.convexaBaseUrl)
  const [convexaFormToken, setConvexaFormToken] = useState(props.convexaFormToken)
  const [salesNotificationEmail, setSalesNotificationEmail] = useState(props.salesNotificationEmail)

  // AI provider+model — combined into a single dropdown using "<provider>:<model>"
  // as the encoded value, mapped back to the LLM_OPTIONS catalog on save.
  const initialLLMValue = props.aiTextProvider && props.aiTextModel
    ? `${props.aiTextProvider}:${props.aiTextModel}`
    : `${LLM_OPTIONS[0].provider}:${LLM_OPTIONS[0].model}`
  const [llmValue, setLlmValue] = useState(initialLLMValue)
  const [aiProvider, aiModel] = llmValue.split(':')

  const [showToken, setShowToken] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSave() {
    setSaveResult(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('convexa_base_url', convexaBaseUrl)
      fd.set('convexa_form_token', convexaFormToken)
      fd.set('sales_notification_email', salesNotificationEmail)
      fd.set('ai_text_provider', aiProvider)
      fd.set('ai_text_model', aiModel)

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
            Lead-Sync nach Form-Submit. Fallback: Leads landen mit
            <code className="mx-1 px-1 py-0.5 bg-[#e1f0fb] rounded text-[#1a3252]">convexa_synced=false</code>
            in der DB, falls Token leer ist — kein Datenverlust, Re-Sync später möglich.
          </p>
        </div>

        <div className="space-y-4">
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

      {/* Card 3: E-Mail Benachrichtigungen */}
      <Card>
        <h2 className="mb-4 font-heading text-xl font-bold text-[#1a3252]">
          E-Mail-Benachrichtigungen
        </h2>

        <Field
          id="sales_notification_email"
          label="Benachrichtigungs-E-Mail (Vertrieb)"
          helperText="E-Mail-Adresse für Vertrieb-Benachrichtigungen bei neuen Leads"
          value={salesNotificationEmail}
          onChange={setSalesNotificationEmail}
          type="email"
          autoComplete="email"
        />
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
