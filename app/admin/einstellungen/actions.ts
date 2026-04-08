'use server'

// Server Action: saveSettings
// Validates and upserts all six admin settings into the einstellungen table.
// Session check is performed first — unauthenticated calls are rejected immediately.
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Zod validation schema
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  confluence_base_url: z.string().url('Bitte eine gültige URL eingeben.'),
  confluence_email: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben.'),
  confluence_api_token: z.string().min(1, 'API-Token darf nicht leer sein.'),
  confluence_space_key: z.string().min(1, 'Space-Key darf nicht leer sein.'),
  confluence_parent_page_id: z.string().min(1, 'Parent Page ID darf nicht leer sein.'),
  sales_notification_email: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben.'),
})

// Canonical beschreibung strings for each settings key.
const BESCHREIBUNG: Record<string, string> = {
  confluence_base_url: 'Basis-URL der Confluence-Instanz (z.B. https://company.atlassian.net)',
  confluence_email: 'E-Mail-Adresse des Confluence-Benutzers',
  confluence_api_token: 'API-Token für Confluence (wird sicher gespeichert)',
  confluence_space_key: 'Schlüssel des Confluence-Spaces für Leads',
  confluence_parent_page_id: 'ID der übergeordneten Confluence-Seite für Leads',
  sales_notification_email: 'E-Mail-Adresse für Vertrieb-Benachrichtigungen bei neuen Leads',
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function saveSettings(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  // 1. Session check — reject unauthenticated calls immediately.
  const authClient = createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return { success: false, error: 'Nicht authentifiziert.' }
  }

  const userId = user.id

  // 2. Extract and validate all six fields from FormData.
  const raw = {
    confluence_base_url: (formData.get('confluence_base_url') as string) ?? '',
    confluence_email: (formData.get('confluence_email') as string) ?? '',
    confluence_api_token: (formData.get('confluence_api_token') as string) ?? '',
    confluence_space_key: (formData.get('confluence_space_key') as string) ?? '',
    confluence_parent_page_id: (formData.get('confluence_parent_page_id') as string) ?? '',
    sales_notification_email: (formData.get('sales_notification_email') as string) ?? '',
  }

  const parsed = settingsSchema.safeParse(raw)

  if (!parsed.success) {
    // Return the first German field error message.
    const firstError = parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.'
    return { success: false, error: firstError }
  }

  const values = parsed.data
  const now = new Date().toISOString()
  const supabase = createAdminClient()

  // 3. Upsert each setting individually so each gets its canonical beschreibung.
  const upsertKey = async (schluessel: string, wert: string) => {
    const { error } = await supabase.from('einstellungen').upsert(
      {
        schluessel,
        wert,
        beschreibung: BESCHREIBUNG[schluessel],
        updated_by: userId,
        updated_at: now,
      },
      { onConflict: 'schluessel' },
    )
    if (error) throw error
  }

  try {
    await upsertKey('confluence_base_url', values.confluence_base_url)
    await upsertKey('confluence_email', values.confluence_email)
    // TODO: encrypt confluence_api_token before storing (Supabase Vault or pgcrypto)
    await upsertKey('confluence_api_token', values.confluence_api_token)
    await upsertKey('confluence_space_key', values.confluence_space_key)
    await upsertKey('confluence_parent_page_id', values.confluence_parent_page_id)
    await upsertKey('sales_notification_email', values.sales_notification_email)
  } catch {
    return { success: false, error: 'Fehler beim Speichern. Bitte erneut versuchen.' }
  }

  return { success: true }
}
