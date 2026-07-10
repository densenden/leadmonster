/**
 * Convexa CRM Client — POST eines Leads ins Convexa-System.
 *
 * Stand 2026-04-30: Convexa-API-Spec ist eingespielt. Endpoint ist
 *   POST https://api.convexa.app/submissions/{Formular-Token}
 * Der Token authentifiziert das Formular und wird als Pfad-Parameter
 * gesendet (kein Bearer-Header).
 *
 * Token-Auflösung (in absteigender Priorität):
 *   1. produkte.convexa_form_token   (pro Produkt, optional)
 *   2. einstellungen.convexa_form_token (DB-globaler Default)
 *   3. process.env.CONVEXA_FORM_TOKEN  (.env.local)
 *
 * Wenn kein Token verfügbar ist, wirft `pushLeadToConvexa` mit Code
 * `CONVEXA_NOT_CONFIGURED` — der Lead-Flow fängt das ab und schreibt
 * den Lead lokal in Supabase, sodass er später re-synct werden kann.
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/supabase/types'
import { CONVEXA_FORM_VERSION, CONVEXA_LEAD_SOURCE } from './constants'
import type { ConvexaLeadPayload, ConvexaLeadResponse } from './types'

function str(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

/** "Musterstraße 1, 80331 München" for Convexa forms that expect one address field. */
export function formatConvexaAddress(
  strasse: unknown,
  plz: unknown,
  ort: unknown,
): string {
  const street = str(strasse).trim()
  const zip = str(plz).trim()
  const city = str(ort).trim()
  const parts: string[] = []
  if (street) parts.push(street)
  const cityLine = [zip, city].filter(Boolean).join(' ')
  if (cityLine) parts.push(cityLine)
  return parts.join(', ')
}

/** Human-readable waiting period for Convexa UI columns. */
export function formatConvexaWartezeit(months: unknown): string {
  if (months === null || months === undefined || months === '') return ''
  const n = Number(months)
  if (Number.isNaN(n)) return str(months)
  if (n === 0) return 'Keine Wartezeit'
  return `${n} Monate`
}

/** Two-decimal EUR string for Convexa MonatsbeitragEur. */
export function formatConvexaMonatsbeitrag(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return str(value)
  return n.toFixed(2)
}

const DEFAULT_BASE_URL = 'https://api.convexa.app'

interface TokenResolution {
  baseUrl: string
  formToken: string
  source: 'produkt' | 'einstellungen' | 'env'
}

/**
 * Liest den Form-Token zuerst pro Produkt (`produkte.convexa_form_token`),
 * dann global aus `einstellungen`, schließlich aus `process.env`.
 * Liefert null, wenn nichts konfiguriert ist.
 */
async function resolveToken(produktId?: string): Promise<TokenResolution | null> {
  const supabase = createAdminClient()

  // 1. Pro-Produkt-Token
  if (produktId) {
    const { data: produkt } = await supabase
      .from('produkte')
      .select('convexa_form_token')
      .eq('id', produktId)
      .maybeSingle()
    const token = (produkt as { convexa_form_token?: string | null } | null)?.convexa_form_token
    if (token && token.trim()) {
      return {
        baseUrl: await resolveBaseUrl(supabase),
        formToken: token.trim(),
        source: 'produkt',
      }
    }
  }

  // 2./3. Globaler Default — DB-Settings vor ENV
  const { data } = await supabase
    .from('einstellungen')
    .select('schluessel,wert')
    .in('schluessel', ['convexa_form_token', 'convexa_base_url'])

  const db = Object.fromEntries(
    (data ?? []).map((r: { schluessel: string; wert: string | null }) => [r.schluessel, r.wert]),
  )

  const dbToken = db.convexa_form_token && db.convexa_form_token.trim()
  const envToken = process.env.CONVEXA_FORM_TOKEN && process.env.CONVEXA_FORM_TOKEN.trim()
  const formToken = dbToken || envToken
  if (!formToken) return null

  const baseUrl =
    (db.convexa_base_url && db.convexa_base_url.trim()) ||
    process.env.CONVEXA_BASE_URL ||
    DEFAULT_BASE_URL

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    formToken,
    source: dbToken ? 'einstellungen' : 'env',
  }
}

async function resolveBaseUrl(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'convexa_base_url')
    .maybeSingle()
  const dbUrl = (data as { wert?: string | null } | null)?.wert?.trim()
  return (dbUrl || process.env.CONVEXA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
}

/**
 * Baut den PascalCase-Payload für Convexa. Enthält die in der Doku genannten
 * Standard-Felder + alle Tracking-Kontextdaten als Custom-Fields.
 */
export function buildPayload(
  lead: Lead,
  context: { produktName: string; produktSlug: string; produktTyp: string },
): ConvexaLeadPayload {
  const leadAny = lead as unknown as Record<string, unknown>

  const filterKontext =
    leadAny.filter_kontext &&
    typeof leadAny.filter_kontext === 'object' &&
    !Array.isArray(leadAny.filter_kontext)
      ? (leadAny.filter_kontext as Record<string, unknown>)
      : {}

  const formPlacement =
    typeof filterKontext.form_placement === 'string' ? filterKontext.form_placement : ''

  const wartezeitMonate = leadAny.akzeptierte_wartezeit_monate

  return {
    Email: lead.email,
    FirstName: str(lead.vorname),
    LastName: str(lead.nachname),
    Phone: str(lead.telefon),
    Interest: str(lead.interesse),
    Product: context.produktName,
    ProductSlug: context.produktSlug,
    ProductType: context.produktTyp,
    Zielgruppe: str(lead.zielgruppe_tag),
    Intent: str(lead.intent_tag),
    GewuenschterAnbieter: str(leadAny.gewuenschter_anbieter),
    AkzeptierteWartezeitMonate: str(wartezeitMonate),
    GewuenschteWartezeit: formatConvexaWartezeit(wartezeitMonate),
    Berufsklasse: str(leadAny.berufsklasse),
    Birthdate: str(leadAny.geburtsdatum),
    Street: str(leadAny.strasse),
    Zip: str(leadAny.plz),
    City: str(leadAny.ort),
    Address: formatConvexaAddress(leadAny.strasse, leadAny.plz, leadAny.ort),
    InsuredAmount: str(leadAny.sterbegeld_summe),
    MonatsbeitragEur: formatConvexaMonatsbeitrag(leadAny.monatsbeitrag_eur),
    FilterKontext: JSON.stringify(filterKontext),
    SourceUrl: str(lead.source_url),
    UtmSource: str(lead.utm_source),
    UtmMedium: str(lead.utm_medium),
    UtmCampaign: str(lead.utm_campaign),
    FormVersion: CONVEXA_FORM_VERSION,
    LeadSource: CONVEXA_LEAD_SOURCE,
    FormPlacement: formPlacement,
  }
}

/**
 * Push eines Leads zu Convexa. Fehlerfall wirft mit Code-Prefix `CONVEXA_*`
 * — der Aufrufer fängt das ab und schreibt den Fehler in `convexa_error`.
 *
 * Convexa antwortet bei Erfolg laut Doku mit reinem 200 OK ohne Body.
 * Wir generieren eine synthetische ID, damit `convexa_lead_id` nicht NULL
 * bleibt (z. B. für Re-Sync-Filter). Die echte Lead-Identität liegt bei Convexa.
 */
export async function pushLeadToConvexa(
  lead: Lead,
  context: { produktName: string; produktSlug: string; produktTyp: string },
): Promise<ConvexaLeadResponse> {
  const tokenInfo = await resolveToken(lead.produkt_id ?? undefined)
  if (!tokenInfo) {
    throw new Error('CONVEXA_NOT_CONFIGURED')
  }

  const payload = buildPayload(lead, context)
  const url = `${tokenInfo.baseUrl}/submissions/${encodeURIComponent(tokenInfo.formToken)}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'LeadMonster/1.0 (+https://finanzteam26.de)',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`CONVEXA_NETWORK_ERROR: ${msg}`)
  }

  if (res.status === 404) {
    throw new Error('CONVEXA_INVALID_TOKEN: Form-Token ungültig, abgelaufen oder deaktiviert')
  }
  if (res.status === 400) {
    const body = await res.text().catch(() => '')
    throw new Error(`CONVEXA_BAD_REQUEST: ${body.slice(0, 300)}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`CONVEXA_HTTP_ERROR ${res.status}: ${body.slice(0, 300)}`)
  }

  // 200 OK — synthetische ID erzeugen
  const synthId = `convexa-${lead.id}-${Date.now().toString(36)}`
  return { id: synthId, status: 'created', http_status: res.status }
}

/**
 * Idempotente Re-Sync-Funktion für den Admin-Bereich. Liest alle Leads
 * mit convexa_synced=false (oder einer Liste von IDs) und versucht den
 * Push erneut. Speichert Erfolg/Fehler in der DB.
 */
export async function resyncPendingLeads(opts?: { limit?: number; ids?: string[] }) {
  const supabase = createAdminClient()
  const limit = opts?.limit ?? 50

  let query = supabase
    .from('leads')
    .select('*, produkte:produkt_id(name, slug, typ)')
    .eq('convexa_synced', false)
    .limit(limit)

  if (opts?.ids?.length) {
    query = query.in('id', opts.ids)
  }

  const { data: leads, error } = await query
  if (error) throw error

  let ok = 0
  let fail = 0

  for (const lead of leads ?? []) {
    const produkt = (lead as unknown as { produkte: { name: string; slug: string; typ: string } | null }).produkte
    try {
      const result = await pushLeadToConvexa(lead as Lead, {
        produktName: produkt?.name ?? 'Unbekannt',
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
      ok++
    } catch (err) {
      await supabase
        .from('leads')
        .update({
          convexa_synced: false,
          convexa_error: err instanceof Error ? err.message : String(err),
        })
        .eq('id', lead.id)
      fail++
    }
  }

  return { ok, fail, total: (leads ?? []).length }
}
