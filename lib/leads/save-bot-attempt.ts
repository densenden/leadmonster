/**
 * Save rejected bot/spam lead attempts into lead_bot_attempts.
 * Never syncs to Convexa or sends email — quarantine only.
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'

export type BotRejectReason =
  | 'honeypot'
  | 'captcha_required'
  | 'captcha_failed'
  | 'too_fast'
  | 'spam_heuristic'
  | 'form_session_invalid'

export interface BotAttemptInput {
  reason: BotRejectReason
  produktId?: string | null
  email?: string | null
  vorname?: string | null
  nachname?: string | null
  telefon?: string | null
  sourceUrl?: string | null
  clientIp?: string | null
  userAgent?: string | null
  /** Sanitized form snapshot — never store Turnstile tokens. */
  payload?: Record<string, unknown>
}

/**
 * Best-effort insert. Failures are logged but never thrown —
 * quarantine must not break the public form response.
 */
export async function saveBotAttempt(input: BotAttemptInput): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { turnstileToken: _omitToken, ...safePayload } = (input.payload ?? {}) as Record<
      string,
      unknown
    >

    const { error } = await supabase.from('lead_bot_attempts').insert({
      reason: input.reason,
      produkt_id: input.produktId || null,
      email: input.email ?? null,
      vorname: input.vorname ?? null,
      nachname: input.nachname ?? null,
      telefon: input.telefon ?? null,
      source_url: input.sourceUrl ?? null,
      client_ip: input.clientIp && input.clientIp !== 'unknown' ? input.clientIp : null,
      user_agent: input.userAgent ?? null,
      payload: safePayload as Json,
    })

    if (error) {
      console.error('[lead_bot_attempts] insert failed:', error.message)
    }
  } catch (err) {
    console.error('[lead_bot_attempts] unexpected error:', err)
  }
}
