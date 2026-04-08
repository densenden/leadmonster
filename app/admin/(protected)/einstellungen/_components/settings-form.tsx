'use client'

// SettingsForm — Client Component for the Einstellungen admin page.
// Manages controlled state for all six settings fields, the API-token
// show/hide toggle, save feedback, and the Confluence connection test.
import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { saveSettings } from '@/app/admin/einstellungen/actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingsFormProps {
  confluenceBaseUrl: string
  confluenceEmail: string
  confluenceApiToken: string
  confluenceSpaceKey: string
  confluenceParentPageId: string
  salesNotificationEmail: string
}

// ---------------------------------------------------------------------------
// Eye / EyeOff SVG icons (inline — no lucide-react dependency required)
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
}

function Field({ id, label, helperText, value, onChange, type = 'text', autoComplete, rightElement }: FieldProps) {
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
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-[#e5e5e5] px-3 py-2.5 text-sm text-[#333333] placeholder-[#999999] focus:border-[#abd5f4] focus:outline-none focus:ring-2 focus:ring-[#abd5f4]/50"
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
  // Controlled field state — each field initialised from props
  const [confluenceBaseUrl, setConfluenceBaseUrl] = useState(props.confluenceBaseUrl)
  const [confluenceEmail, setConfluenceEmail] = useState(props.confluenceEmail)
  const [confluenceApiToken, setConfluenceApiToken] = useState(props.confluenceApiToken)
  const [confluenceSpaceKey, setConfluenceSpaceKey] = useState(props.confluenceSpaceKey)
  const [confluenceParentPageId, setConfluenceParentPageId] = useState(props.confluenceParentPageId)
  const [salesNotificationEmail, setSalesNotificationEmail] = useState(props.salesNotificationEmail)

  // UI state
  const [showToken, setShowToken] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  const [isPending, startTransition] = useTransition()

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSave() {
    setSaveResult(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('confluence_base_url', confluenceBaseUrl)
      fd.set('confluence_email', confluenceEmail)
      fd.set('confluence_api_token', confluenceApiToken)
      fd.set('confluence_space_key', confluenceSpaceKey)
      fd.set('confluence_parent_page_id', confluenceParentPageId)
      fd.set('sales_notification_email', salesNotificationEmail)

      const result = await saveSettings(fd)

      if (result.success) {
        setSaveResult({ success: true, message: 'Einstellungen gespeichert.' })
      } else {
        setSaveResult({ success: false, message: result.error })
      }
    })
  }

  async function handleTestConnection() {
    setTestResult(null)
    setIsTesting(true)
    try {
      const res = await fetch('/api/confluence?action=test')
      const json = await res.json()
      setTestResult({ success: json.success, message: json.message })
    } catch {
      setTestResult({ success: false, message: 'Verbindungstest fehlgeschlagen.' })
    } finally {
      setIsTesting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Card 1: Confluence Integration */}
      <Card>
        <h2 className="mb-4 font-heading text-xl font-bold text-[#333333]">
          Confluence Integration
        </h2>

        <div className="space-y-4">
          <Field
            id="confluence_base_url"
            label="Confluence URL"
            helperText="Basis-URL der Confluence-Instanz (z.B. https://company.atlassian.net)"
            value={confluenceBaseUrl}
            onChange={setConfluenceBaseUrl}
            autoComplete="url"
          />

          <Field
            id="confluence_email"
            label="E-Mail-Adresse"
            helperText="E-Mail-Adresse des Confluence-Benutzers"
            value={confluenceEmail}
            onChange={setConfluenceEmail}
            type="email"
            autoComplete="email"
          />

          <Field
            id="confluence_api_token"
            label="API-Token"
            helperText="API-Token für Confluence (wird sicher gespeichert)"
            value={confluenceApiToken}
            onChange={setConfluenceApiToken}
            type={showToken ? 'text' : 'password'}
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? 'Passwort verbergen' : 'Passwort anzeigen'}
                className="rounded p-1 text-[#999999] hover:text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#abd5f4]/50"
              >
                {showToken ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          />

          <Field
            id="confluence_space_key"
            label="Space-Key"
            helperText="Schlüssel des Confluence-Spaces für Leads"
            value={confluenceSpaceKey}
            onChange={setConfluenceSpaceKey}
          />

          <Field
            id="confluence_parent_page_id"
            label="Parent Page ID"
            helperText="ID der übergeordneten Confluence-Seite für Leads"
            value={confluenceParentPageId}
            onChange={setConfluenceParentPageId}
          />
        </div>

        {/* Test connection */}
        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            aria-label="Confluence-Verbindung testen"
          >
            {isTesting ? 'Teste Verbindung…' : 'Verbindung testen'}
          </Button>

          {testResult && (
            <Badge variant={testResult.success ? 'success' : 'danger'}>
              {testResult.message}
            </Badge>
          )}
        </div>
      </Card>

      {/* Card 2: E-Mail Benachrichtigungen */}
      <Card>
        <h2 className="mb-4 font-heading text-xl font-bold text-[#333333]">
          E-Mail Benachrichtigungen
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
