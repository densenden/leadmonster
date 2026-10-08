// Email confirmation for a new lead.
// The visitor gets a link. Convexa and the sales mail wait until they click.
import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { isConvexaSyncEnabled, pushLeadToConvexa } from '@/lib/convexa/client'
import { sendSalesNotification } from '@/lib/resend/mailer'
import { resolveBaseUrl } from '@/lib/seo/organization'
import type { Lead } from '@/lib/supabase/types'

const CONFIRM_TTL_MS = 72 * 60 * 60 * 1000

export function hashEmailConfirmToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function createEmailConfirmToken(): { raw: string; hash: string; expiresAt: string } {
  const raw = randomBytes(32).toString('base64url')
  return {
    raw,
    hash: hashEmailConfirmToken(raw),
    expiresAt: new Date(Date.now() + CONFIRM_TTL_MS).toISOString(),
  }
}

export function buildEmailConfirmUrl(rawToken: string): string {
  return `${resolveBaseUrl()}/anfrage/bestaetigen?token=${encodeURIComponent(rawToken)}`
}

export type ConfirmLeadResult = 'confirmed' | 'already' | 'expired' | 'invalid'

// Looks up the token, marks the lead confirmed, then pushes Convexa and the sales mail.
export async function confirmLeadByToken(rawToken: string | undefined): Promise<ConfirmLeadResult> {
  const token = rawToken?.trim()
  if (!token) return 'invalid'

  const supabase = createAdminClient()
  const hash = hashEmailConfirmToken(token)
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('email_confirm_token_hash', hash)
    .maybeSingle()

  if (error || !lead) return 'invalid'
  if (lead.email_confirmed_at) return 'already'

  const expiresAt = lead.email_confirm_expires_at
  if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) return 'expired'

  const confirmedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      email_confirmed_at: confirmedAt,
      email_confirm_token_hash: null,
      email_confirm_expires_at: null,
    })
    .eq('id', lead.id)
    .is('email_confirmed_at', null)

  if (updateError) {
    console.error('[email-confirm] update failed:', updateError.message)
    return 'invalid'
  }

  const confirmedLead = { ...lead, email_confirmed_at: confirmedAt } as Lead
  await pushConfirmedLead(confirmedLead)
  return 'confirmed'
}

async function pushConfirmedLead(lead: Lead): Promise<void> {
  const supabase = createAdminClient()

  const { data: produkt } = lead.produkt_id
    ? await supabase
        .from('produkte')
        .select('name, slug, typ')
        .eq('id', lead.produkt_id)
        .maybeSingle()
    : { data: null }

  const produktName = produkt?.name ?? 'Unbekannt'

  if (!lead.convexa_synced && (await isConvexaSyncEnabled())) {
    try {
      const result = await pushLeadToConvexa(lead, {
        produktName,
        produktSlug: produkt?.slug ?? '',
        produktTyp: produkt?.typ ?? '',
      })
      await supabase
        .from('leads')
        .update({
          convexa_lead_id: result.id,
          convexa_synced: true,
          convexa_error: null,
        })
        .eq('id', lead.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[email-confirm] Convexa sync failed lead=${lead.id}:`, msg)
      await supabase
        .from('leads')
        .update({ convexa_synced: false, convexa_error: msg })
        .eq('id', lead.id)
    }
  }

  const { data: fresh } = await supabase.from('leads').select('*').eq('id', lead.id).single()
  if (fresh) {
    const sent = await sendSalesNotification(fresh as Lead, produktName)
    if (!sent) console.error(`[email-confirm] Sales mail failed lead=${lead.id}`)
  }
}
