// Einstellungen admin page — Server Component.
// Fetches all six settings from the einstellungen table and passes them to
// the SettingsForm client component. Auth is handled by the parent layout guard.
import { createAdminClient } from '@/lib/supabase/server'
import { SettingsForm } from './_components/settings-form'

// All six settings keys managed on this page.
const SETTINGS_KEYS = [
  'confluence_base_url',
  'confluence_email',
  'confluence_api_token',
  'confluence_space_key',
  'confluence_parent_page_id',
  'sales_notification_email',
] as const

export default async function EinstellungenPage() {
  const supabase = createAdminClient()

  // Fetch all six keys in a single query.
  const { data: rows } = await supabase
    .from('einstellungen')
    .select('schluessel,wert')
    .in('schluessel', [...SETTINGS_KEYS])

  // Build a lookup map — fall back to empty string for missing rows.
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
        confluenceBaseUrl={get('confluence_base_url')}
        confluenceEmail={get('confluence_email')}
        confluenceApiToken={get('confluence_api_token')}
        confluenceSpaceKey={get('confluence_space_key')}
        confluenceParentPageId={get('confluence_parent_page_id')}
        salesNotificationEmail={get('sales_notification_email')}
      />
    </div>
  )
}
