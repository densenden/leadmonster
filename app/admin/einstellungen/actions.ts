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
  convexa_sync_enabled: z.enum(['true', 'false']).optional().default('false'),
  sales_notification_email: z.string().email('Bitte eine gültige E-Mail-Adresse eingeben.'),
  resend_enabled: z.enum(['true', 'false']).optional().default('false'),
  // AI text-LLM provider + model (validated against the catalog at call time).
  ai_text_provider: z.enum(['anthropic', 'openai']),
  ai_text_model: z.string().min(1, 'Modell darf nicht leer sein.'),
  /** Empty = keep existing DB key; min 8 when user enters a new key */
  openai_api_key: z.string().max(200).optional().default(''),
  // Cloudflare Turnstile / hCaptcha (lead-form bot protection)
  turnstile_enabled: z.enum(['true', 'false']).optional().default('false'),
  captcha_provider: z.enum(['turnstile', 'hcaptcha']).optional().default('turnstile'),
  turnstile_site_key: z.string().max(200).optional().default(''),
  /** Empty = keep existing secret; min 8 when user enters a new secret */
  turnstile_secret_key: z.string().max(200).optional().default(''),
  hcaptcha_site_key: z.string().max(200).optional().default(''),
  /** Empty = keep existing secret; min 8 when user enters a new secret */
  hcaptcha_secret_key: z.string().max(200).optional().default(''),
})

const BESCHREIBUNG: Record<string, string> = {
  convexa_base_url: 'Convexa API Base-URL (Default: https://api.convexa.app)',
  convexa_form_token: 'Convexa Form-Token aus URL https://api.convexa.app/submissions/{token} — Default für alle Produkte ohne eigenen Token',
  convexa_sync_enabled: 'Convexa Lead-Sync aktiv (true) oder pausiert (false)',
  sales_notification_email: 'E-Mail-Adresse für Vertrieb-Benachrichtigungen bei neuen Leads',
  resend_enabled: 'Resend-Mails aktiv (true) oder pausiert (false). Bestätigung + Vertriebs-Ping, unabhängig von Convexa.',
  ai_text_provider: 'KI-Provider für Text-Generierung: anthropic | openai',
  ai_text_model: 'Konkretes Modell beim gewählten Provider',
  openai_api_key: 'OpenAI API-Key für Bildgenerierung (gpt-image-1) und Vision-Stil-Analyse',
  turnstile_enabled: 'Captcha auf Lead-Formularen aktiv (true/false) — gilt für Turnstile und hCaptcha',
  captcha_provider: 'Captcha-Anbieter: turnstile | hcaptcha',
  turnstile_site_key: 'Cloudflare Turnstile Site Key (öffentlich, für das Widget)',
  turnstile_secret_key: 'Cloudflare Turnstile Secret Key (nur Server, nie im Browser)',
  hcaptcha_site_key: 'hCaptcha Site Key (öffentlich, für das Widget)',
  hcaptcha_secret_key: 'hCaptcha Secret Key (nur Server, nie im Browser)',
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
    convexa_sync_enabled: (formData.get('convexa_sync_enabled') as string) ?? 'false',
    sales_notification_email: (formData.get('sales_notification_email') as string) ?? '',
    resend_enabled: (formData.get('resend_enabled') as string) ?? 'false',
    ai_text_provider: (formData.get('ai_text_provider') as string) ?? 'openai',
    ai_text_model: (formData.get('ai_text_model') as string) ?? 'gpt-4o-mini',
    openai_api_key: (formData.get('openai_api_key') as string) ?? '',
    turnstile_enabled: (formData.get('turnstile_enabled') as string) ?? 'false',
    captcha_provider: (formData.get('captcha_provider') as string) ?? 'turnstile',
    turnstile_site_key: (formData.get('turnstile_site_key') as string) ?? '',
    turnstile_secret_key: (formData.get('turnstile_secret_key') as string) ?? '',
    hcaptcha_site_key: (formData.get('hcaptcha_site_key') as string) ?? '',
    hcaptcha_secret_key: (formData.get('hcaptcha_secret_key') as string) ?? '',
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
    await upsertKey('convexa_sync_enabled', values.convexa_sync_enabled)
    await upsertKey('sales_notification_email', values.sales_notification_email)
    await upsertKey('resend_enabled', values.resend_enabled)
    await upsertKey('ai_text_provider', values.ai_text_provider)
    await upsertKey('ai_text_model', values.ai_text_model)
    const newOpenAiKey = values.openai_api_key.trim()
    if (newOpenAiKey.length >= 8) {
      await upsertKey('openai_api_key', newOpenAiKey)
    }
    await upsertKey('turnstile_enabled', values.turnstile_enabled)
    await upsertKey('captcha_provider', values.captcha_provider)
    await upsertKey('turnstile_site_key', values.turnstile_site_key.trim())
    const newTurnstileSecret = values.turnstile_secret_key.trim()
    if (newTurnstileSecret.length >= 8) {
      await upsertKey('turnstile_secret_key', newTurnstileSecret)
    }
    await upsertKey('hcaptcha_site_key', values.hcaptcha_site_key.trim())
    const newHcaptchaSecret = values.hcaptcha_secret_key.trim()
    if (newHcaptchaSecret.length >= 8) {
      await upsertKey('hcaptcha_secret_key', newHcaptchaSecret)
    }
  } catch {
    return { success: false, error: 'Fehler beim Speichern. Bitte erneut versuchen.' }
  }

  return { success: true }
}
