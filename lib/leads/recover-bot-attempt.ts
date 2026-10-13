/**
 * Promote a quarantine bot attempt into a real lead (manual false-positive recover).
 *
 * Flow:
 *  1. Load lead_bot_attempts row
 *  2. Build leads insert from row columns + payload snapshot
 *  3. Insert lead, optionally Convexa + emails (same as /api/leads post-save)
 *  4. Mark attempt recovered_at + recovered_lead_id (keep audit row)
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { Json, Lead, TablesInsert } from '@/lib/supabase/types'
import { isConvexaSyncEnabled, pushLeadToConvexa } from '@/lib/convexa/client'
import {
  isResendEnabled,
  sendLeadConfirmation,
} from '@/lib/resend/mailer'
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/lead-consent'

export interface RecoverBotAttemptResult {
  ok: true
  leadId: string
  convexaSynced: boolean
  emailsSent: boolean
  warnings: string[]
}

export interface RecoverBotAttemptError {
  ok: false
  error: string
}

function asRecord(payload: Json | null | undefined): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
  return payload as Record<string, unknown>
}

function pickStr(...values: unknown[]): string | null {
  for (const v of values) {
    if (v === null || v === undefined) continue
    const s = String(v).trim()
    if (s) return s
  }
  return null
}

function pickNum(...values: unknown[]): number | null {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

/**
 * Recover one quarantine row. Idempotent when already recovered (returns existing lead id).
 */
export async function recoverBotAttempt(
  attemptId: string,
): Promise<RecoverBotAttemptResult | RecoverBotAttemptError> {
  const supabase = createAdminClient()
  const warnings: string[] = []

  const { data: attempt, error: loadError } = await supabase
    .from('lead_bot_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle()

  if (loadError) {
    return { ok: false, error: `Laden fehlgeschlagen: ${loadError.message}` }
  }
  if (!attempt) {
    return { ok: false, error: 'Bot-Versuch nicht gefunden.' }
  }

  if (attempt.recovered_at && attempt.recovered_lead_id) {
    return {
      ok: true,
      leadId: attempt.recovered_lead_id,
      convexaSynced: false,
      emailsSent: false,
      warnings: ['Bereits freigegeben — kein zweiter Insert.'],
    }
  }

  const payload = asRecord(attempt.payload)
  const email = pickStr(attempt.email, payload.email)
  if (!email) {
    return { ok: false, error: 'E-Mail fehlt — Freigabe nicht möglich.' }
  }

  const produktId = pickStr(attempt.produkt_id, payload.produktId)
  if (!produktId) {
    return { ok: false, error: 'Produkt fehlt — Freigabe nicht möglich.' }
  }

  const vorname = pickStr(attempt.vorname, payload.vorname)
  const nachname = pickStr(attempt.nachname, payload.nachname)
  const telefon = pickStr(attempt.telefon, payload.telefon)
  const geburtsdatum = pickStr(payload.geburtsdatum)
  const strasse = pickStr(payload.strasse)
  const plz = pickStr(payload.plz)
  const ort = pickStr(payload.ort)
  const interesse = pickStr(payload.interesse)
  const intentTag = pickStr(payload.intentTag, payload.intent_tag) ?? 'anfrage'
  const zielgruppeTag =
    pickStr(payload.zielgruppeTag, payload.zielgruppe_tag) ?? 'allgemein'
  const gewuenschterAnbieter = pickStr(
    payload.gewuenschterAnbieter,
    payload.gewuenschter_anbieter,
  )
  const sourceUrl = pickStr(attempt.source_url, payload.sourceUrl, payload.source_url)
  const formPlacement = pickStr(payload.formPlacement, payload.form_placement)
  const sterbegeldSumme = pickNum(payload.sterbegeldSumme, payload.sterbegeld_summe)
  const akzeptierteWartezeit = pickNum(
    payload.akzeptierteWartezeitMonate,
    payload.akzeptierte_wartezeit_monate,
  )
  const monatsbeitrag = pickNum(payload.monatsbeitragEur, payload.monatsbeitrag_eur)
  const berufsklasse = pickStr(payload.berufsklasse)

  if (!strasse || !plz || !ort) {
    warnings.push(
      'Adresse unvollständig im Snapshot — Lead ohne Straße/PLZ/Ort freigegeben. Bitte in Convexa nachpflegen.',
    )
  }
  if (!geburtsdatum) {
    warnings.push('Geburtsdatum fehlte im Snapshot.')
  }

  const insertPayload: TablesInsert<'leads'> = {
    produkt_id: produktId,
    email,
    vorname,
    nachname,
    telefon,
    interesse,
    zielgruppe_tag: zielgruppeTag,
    intent_tag: intentTag,
  }

  const asRecordInsert = insertPayload as Record<string, unknown>
  if (geburtsdatum) asRecordInsert.geburtsdatum = geburtsdatum
  if (strasse) asRecordInsert.strasse = strasse
  if (plz) asRecordInsert.plz = plz
  if (ort) asRecordInsert.ort = ort
  if (sourceUrl) asRecordInsert.source_url = sourceUrl
  if (attempt.client_ip) asRecordInsert.client_ip = attempt.client_ip
  if (gewuenschterAnbieter) asRecordInsert.gewuenschter_anbieter = gewuenschterAnbieter
  if (sterbegeldSumme != null) asRecordInsert.sterbegeld_summe = sterbegeldSumme
  if (akzeptierteWartezeit != null) {
    asRecordInsert.akzeptierte_wartezeit_monate = akzeptierteWartezeit
  }
  if (monatsbeitrag != null) asRecordInsert.monatsbeitrag_eur = monatsbeitrag
  if (berufsklasse) asRecordInsert.berufsklasse = berufsklasse

  const consentAt = new Date().toISOString()
  asRecordInsert.privacy_consent_at = consentAt
  asRecordInsert.privacy_policy_version =
    pickStr(payload.privacyPolicyVersion) ?? PRIVACY_POLICY_VERSION
  asRecordInsert.marketing_consent = Boolean(payload.marketingConsent)

  const filterKontext: Record<string, unknown> = {
    recovered_from_bot_attempt: attempt.id,
    recovered_reason: attempt.reason,
  }
  if (formPlacement) filterKontext.form_placement = formPlacement
  asRecordInsert.filter_kontext = filterKontext

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insertError || !lead) {
    return {
      ok: false,
      error: `Lead-Insert fehlgeschlagen: ${insertError?.message ?? 'unbekannt'}`,
    }
  }

  let convexaSynced = false
  let emailsSent = false

  try {
    const { data: produkt } = await supabase
      .from('produkte')
      .select('name, slug, typ')
      .eq('id', produktId)
      .single()

    const produktName = produkt?.name ?? 'Unbekannt'
    const { data: fullLead } = await supabase.from('leads').select('*').eq('id', lead.id).single()

    if (fullLead) {
      if (await isConvexaSyncEnabled()) {
        try {
          const result = await pushLeadToConvexa(fullLead as Lead, {
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
          convexaSynced = true
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          warnings.push(`Convexa-Sync fehlgeschlagen: ${msg}`)
          await supabase
            .from('leads')
            .update({ convexa_synced: false, convexa_error: msg })
            .eq('id', lead.id)
        }
      } else {
        warnings.push('Convexa-Sync ist deaktiviert — Lead nur lokal gespeichert.')
      }

      if (await isResendEnabled()) {
        const confirmationSent = await sendLeadConfirmation(fullLead as Lead)
        emailsSent = confirmationSent
        if (!confirmationSent) warnings.push('Bestätigungs-Mail fehlgeschlagen.')
        if (emailsSent) {
          await supabase.from('leads').update({ resend_sent: true }).eq('id', lead.id)
        }
      } else {
        warnings.push('E-Mail-Versand ist deaktiviert — keine Resend-Mails gesendet.')
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(`Nachbearbeitung fehlgeschlagen: ${msg}`)
  }

  const { error: markError } = await supabase
    .from('lead_bot_attempts')
    .update({
      recovered_at: new Date().toISOString(),
      recovered_lead_id: lead.id,
    })
    .eq('id', attemptId)

  if (markError) {
    warnings.push(`Lead erstellt (${lead.id}), Markierung recovered fehlgeschlagen: ${markError.message}`)
  }

  return {
    ok: true,
    leadId: lead.id,
    convexaSynced,
    emailsSent,
    warnings,
  }
}
