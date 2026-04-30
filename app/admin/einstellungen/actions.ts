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
  // Convexa-Endpoint + Form-Token (gemäß PDF "Einspielung von Leaddaten" 2026-04-30).
  // Token darf leer sein — Client fällt dann auf process.env.CONVEXA_FORM_TOKEN zurück.
  convexa_base_url: z.string().url('Bitte eine gültige URL eingeben.').or(z.literal('')),
  convexa_form_token: z.string().max(200).optional().default(''),
  sales_notification_email: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben.'),
  // AI text-LLM provider + model (validated against the catalog at call time).
  ai_text_provider: z.enum(['anthropic', 'openai']),
  ai_text_model: z.string().min(1, 'Modell darf nicht leer sein.'),
})

const BESCHREIBUNG: Record<string, string> = {
  convexa_base_url: 'Convexa API Base-URL (Default: https://api.convexa.app)',
  convexa_form_token: 'Convexa Form-Token aus URL https://api.convexa.app/submissions/{token} — Default für alle Produkte ohne eigenen Token',
  sales_notification_email: 'E-Mail-Adresse für Vertrieb-Benachrichtigungen bei neuen Leads',
  ai_text_provider: 'KI-Provider für Text-Generierung: anthropic | openai',
  ai_text_model: 'Konkretes Modell beim gewählten Provider',
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
    convexa_form_token: (formData.get('convexa_form_token') as string) ?? '',
    sales_notification_email: (formData.get('sales_notification_email') as string) ?? '',
    ai_text_provider: (formData.get('ai_text_provider') as string) ?? 'openai',
    ai_text_model: (formData.get('ai_text_model') as string) ?? 'gpt-4o-mini',
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
    // TODO: encrypt convexa_form_token before storing (Supabase Vault or pgcrypto)
    await upsertKey('convexa_form_token', values.convexa_form_token)
    await upsertKey('sales_notification_email', values.sales_notification_email)
    await upsertKey('ai_text_provider', values.ai_text_provider)
    await upsertKey('ai_text_model', values.ai_text_model)
  } catch {
    return { success: false, error: 'Fehler beim Speichern. Bitte erneut versuchen.' }
  }

  return { success: true }
}
