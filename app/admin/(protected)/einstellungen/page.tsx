// Einstellungen admin page — Server Component.
// Fetches Convexa + sales notification settings from the einstellungen table
// and passes them to the SettingsForm client component. Auth is handled by
// the parent layout guard.
import { createAdminClient } from '@/lib/supabase/server'
import { SettingsForm } from './_components/settings-form'

const SETTINGS_KEYS = [
  'convexa_base_url',
  'convexa_form_token',
  'convexa_sync_enabled',
  // Legacy — werden nur noch gelesen, falls in der DB vorhanden, Schreibpfad
  // ignoriert sie. Können nach einem späteren Cleanup entfernt werden.
  'convexa_api_token',
  'convexa_workspace_id',
  'sales_notification_email',
  'resend_enabled',
  'ai_text_provider',
  'ai_text_model',
  'openai_api_key',
  'turnstile_enabled',
  'captcha_provider',
  'turnstile_site_key',
  'turnstile_secret_key',
  'hcaptcha_site_key',
  'hcaptcha_secret_key',
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
  const openaiApiKeyConfigured = get('openai_api_key').trim().length >= 8
  const turnstileSecretConfigured = get('turnstile_secret_key').trim().length >= 8
  const hcaptchaSecretConfigured = get('hcaptcha_secret_key').trim().length >= 8
  const captchaProvider = (() => {
    const v = get('captcha_provider').trim().toLowerCase()
    return v === 'hcaptcha' ? 'hcaptcha' : 'turnstile'
  })()
  const convexaSyncEnabled = (() => {
    const v = get('convexa_sync_enabled').trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes'
  })()
  const turnstileEnabled = (() => {
    const v = get('turnstile_enabled').trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes'
  })()
  const resendEnabled = (() => {
    const v = get('resend_enabled').trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes'
  })()

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-8 font-heading text-3xl font-bold text-[#333333]">Einstellungen</h1>

      <SettingsForm
        convexaBaseUrl={get('convexa_base_url')}
        convexaFormToken={get('convexa_form_token')}
        convexaSyncEnabled={convexaSyncEnabled}
        convexaApiToken={get('convexa_api_token')}
        convexaWorkspaceId={get('convexa_workspace_id')}
        salesNotificationEmail={get('sales_notification_email')}
        resendEnabled={resendEnabled}
        aiTextProvider={get('ai_text_provider')}
        aiTextModel={get('ai_text_model')}
        openaiApiKeyConfigured={openaiApiKeyConfigured}
        turnstileEnabled={turnstileEnabled}
        captchaProvider={captchaProvider}
        turnstileSiteKey={get('turnstile_site_key')}
        turnstileSecretConfigured={turnstileSecretConfigured}
        hcaptchaSiteKey={get('hcaptcha_site_key')}
        hcaptchaSecretConfigured={hcaptchaSecretConfigured}
      />
    </div>
  )
}
