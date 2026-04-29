'use client'

// SettingsForm — Client Component for the Einstellungen admin page.
// Manages controlled state for Convexa CRM + sales notification settings
// plus the API-token show/hide toggle and save feedback.
import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { saveSettings } from '@/app/admin/einstellungen/actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingsFormProps {
  convexaBaseUrl: string
  convexaApiToken: string
  convexaWorkspaceId: string
  salesNotificationEmail: string
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
  const [convexaApiToken, setConvexaApiToken] = useState(props.convexaApiToken)
  const [convexaWorkspaceId, setConvexaWorkspaceId] = useState(props.convexaWorkspaceId)
  const [salesNotificationEmail, setSalesNotificationEmail] = useState(props.salesNotificationEmail)

  const [showToken, setShowToken] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setSaveResult(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('convexa_base_url', convexaBaseUrl)
      fd.set('convexa_api_token', convexaApiToken)
      fd.set('convexa_workspace_id', convexaWorkspaceId)
      fd.set('sales_notification_email', salesNotificationEmail)

      const result = await saveSettings(fd)

      if (result.success) {
        setSaveResult({ success: true, message: 'Einstellungen gespeichert.' })
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
            helperText="Default: https://app.convexa.app"
            placeholder="https://app.convexa.app"
            value={convexaBaseUrl}
            onChange={setConvexaBaseUrl}
            autoComplete="url"
          />

          <Field
            id="convexa_api_token"
            label="API-Token"
            helperText="Bearer-Token von Convexa (wird sicher gespeichert)"
            value={convexaApiToken}
            onChange={setConvexaApiToken}
            type={showToken ? 'text' : 'password'}
            autoComplete="current-password"
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

          <Field
            id="convexa_workspace_id"
            label="Workspace-ID"
            helperText="Convexa Workspace-/Mandanten-ID"
            value={convexaWorkspaceId}
            onChange={setConvexaWorkspaceId}
          />
        </div>
      </Card>

      {/* Card 2: E-Mail Benachrichtigungen */}
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
