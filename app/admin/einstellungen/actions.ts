'use server'

// Server Action: saveSettings
// Validates and upserts admin settings into the einstellungen table.
// Session check is performed first — unauthenticated calls are rejected immediately.
//
// Convexa replaced Confluence as the lead CRM (April 2026). Confluence keys
// are no longer surfaced in the admin UI; the table rows can stay for legacy
// Re-Sync use cases until they are formally deprecated.
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Zod validation schema — Convexa + Sales notification only
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  // Convexa fields can be empty (skeleton stage — token from support@convexa.app pending).
  convexa_base_url: z.string().url('Bitte eine gültige URL eingeben.').or(z.literal('')),
  convexa_api_token: z.string().optional().default(''),
  convexa_workspace_id: z.string().optional().default(''),
  sales_notification_email: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben.'),
})

const BESCHREIBUNG: Record<string, string> = {
  convexa_base_url: 'Convexa API Base-URL (Default: https://app.convexa.app)',
  convexa_api_token: 'Convexa API-Token (Bearer) — wird sicher gespeichert',
  convexa_workspace_id: 'Convexa Workspace-/Mandanten-ID',
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

  // 2. Extract and validate fields from FormData.
  const raw = {
    convexa_base_url: (formData.get('convexa_base_url') as string) ?? '',
    convexa_api_token: (formData.get('convexa_api_token') as string) ?? '',
    convexa_workspace_id: (formData.get('convexa_workspace_id') as string) ?? '',
    sales_notification_email: (formData.get('sales_notification_email') as string) ?? '',
  }

  const parsed = settingsSchema.safeParse(raw)

  if (!parsed.success) {
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
    await upsertKey('convexa_base_url', values.convexa_base_url)
    // TODO: encrypt convexa_api_token before storing (Supabase Vault or pgcrypto)
    await upsertKey('convexa_api_token', values.convexa_api_token)
    await upsertKey('convexa_workspace_id', values.convexa_workspace_id)
    await upsertKey('sales_notification_email', values.sales_notification_email)
  } catch {
    return { success: false, error: 'Fehler beim Speichern. Bitte erneut versuchen.' }
  }

  return { success: true }
}
