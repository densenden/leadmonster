// Einstellungen admin page — Server Component.
// Fetches Convexa + sales notification settings from the einstellungen table
// and passes them to the SettingsForm client component. Auth is handled by
// the parent layout guard.
import { createAdminClient } from '@/lib/supabase/server'
import { SettingsForm } from './_components/settings-form'

const SETTINGS_KEYS = [
  'convexa_base_url',
  'convexa_form_token',
  // Legacy — werden nur noch gelesen, falls in der DB vorhanden, Schreibpfad
  // ignoriert sie. Können nach einem späteren Cleanup entfernt werden.
  'convexa_api_token',
  'convexa_workspace_id',
  'sales_notification_email',
  'ai_text_provider',
  'ai_text_model',
] as const

export default async function EinstellungenPage() {
  const supabase = createAdminClient()

  const { data: rows } = await supabase
    .from('einstellungen')
    .select('schluessel,wert')
    .in('schluessel', [...SETTINGS_KEYS])

  const db = Object.fromEntries(
    (rows ?? []).map((r: { schluessel: string; wert: string | null }) => [
      r.schluessel,
      r.wert ?? '',
    ]),
  )

  const get = (key: string): string => db[key] ?? ''

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-8 font-heading text-3xl font-bold text-[#333333]">Einstellungen</h1>

      <SettingsForm
        convexaBaseUrl={get('convexa_base_url')}
        convexaFormToken={get('convexa_form_token')}
        convexaApiToken={get('convexa_api_token')}
        convexaWorkspaceId={get('convexa_workspace_id')}
        salesNotificationEmail={get('sales_notification_email')}
        aiTextProvider={get('ai_text_provider')}
        aiTextModel={get('ai_text_model')}
      />
    </div>
  )
}
