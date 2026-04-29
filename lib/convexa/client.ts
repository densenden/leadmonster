/**
 * Convexa CRM Client — POST eines Leads ins Convexa-System.
 *
 * Status: SKELETON — endgültiger Endpoint und Auth-Verfahren werden gesetzt,
 * sobald Convexa-Support antwortet (siehe docs/convexa-api-anfrage.md).
 *
 * Strategie bis dahin:
 *   - Modul ist im Code aktiv und wird vom Lead-Flow aufgerufen
 *   - Wenn `CONVEXA_API_TOKEN` leer ist: kein HTTP-Call, Lead wird in DB
 *     mit `convexa_synced=false` markiert (Re-Sync später möglich)
 *   - Wenn Token gesetzt aber API-Fehler: Lead bleibt in DB, Fehler in
 *     `convexa_error` gespeichert, Re-Sync via Admin-Button möglich
 *
 * Konfigurations-Auflösung wie bei lib/confluence/client.ts:
 *   1. einstellungen-Tabelle (DB-Override pro Account)
 *   2. process.env (Fallback)
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/supabase/types'
import type {
  ConvexaLeadPayload,
  ConvexaLeadResponse,
} from './types'

interface Creds {
  baseUrl: string
  apiToken: string
  workspaceId: string | null
}

/**
 * Liest Convexa-Credentials zuerst aus DB-Tabelle einstellungen, dann
 * aus den Umgebungsvariablen. Liefert null, wenn kein Token vorliegt —
 * der Aufrufer muss in dem Fall auf Lokal-Speicherung zurückfallen.
 */
async function resolveCredentials(): Promise<Creds | null> {
  const supabase = createAdminClient()
  const keys = ['convexa_base_url', 'convexa_api_token', 'convexa_workspace_id']
  const { data } = await supabase
    .from('einstellungen')
    .select('schluessel,wert')
    .in('schluessel', keys)

  const db = Object.fromEntries(
    (data ?? []).map((r: { schluessel: string; wert: string | null }) => [r.schluessel, r.wert]),
  )

  const apiToken =
    (db.convexa_api_token && db.convexa_api_token.trim()) ||
    process.env.CONVEXA_API_TOKEN ||
    ''
  if (!apiToken) return null

  const baseUrl =
    (db.convexa_base_url && db.convexa_base_url.trim()) ||
    process.env.CONVEXA_BASE_URL ||
    'https://app.convexa.app'

  const workspaceId =
    (db.convexa_workspace_id && db.convexa_workspace_id.trim()) ||
    process.env.CONVEXA_WORKSPACE_ID ||
    null

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiToken, workspaceId }
}

/**
 * Mappt unseren Lead auf das angenommene Convexa-Schema.
 */
function buildPayload(
  lead: Lead,
  produktName: string,
  produktSlug: string,
  produktTyp: string,
  workspaceId?: string | null,
): ConvexaLeadPayload {
  return {
    email: lead.email,
    first_name: lead.vorname ?? undefined,
    last_name: lead.nachname ?? undefined,
    phone: lead.telefon ?? undefined,
    notes: lead.interesse ?? undefined,
    product_tag: produktSlug,
    product_type: produktTyp,
    zielgruppe: lead.zielgruppe_tag ?? undefined,
    intent: lead.intent_tag ?? undefined,
    source_url: lead.source_url ?? undefined,
    utm_source: lead.utm_source ?? undefined,
    utm_medium: lead.utm_medium ?? undefined,
    utm_campaign: lead.utm_campaign ?? undefined,
    workspace_id: workspaceId ?? undefined,
  }
}

/**
 * Push eines Leads zu Convexa. Wirft im Fehlerfall — Aufrufer fängt ab und
 * speichert convexa_error. Liefert die Convexa-Lead-ID, wenn die API
 * erfolgreich antwortet.
 */
export async function pushLeadToConvexa(
  lead: Lead,
  context: { produktName: string; produktSlug: string; produktTyp: string },
): Promise<ConvexaLeadResponse> {
  const creds = await resolveCredentials()
  if (!creds) {
    throw new Error('CONVEXA_NOT_CONFIGURED')
  }

  const payload = buildPayload(
    lead,
    context.produktName,
    context.produktSlug,
    context.produktTyp,
    creds.workspaceId,
  )

  // ANNAHME — sobald Convexa die offizielle Spec liefert, hier anpassen.
  // Der Endpoint /api/v1/leads ist Standard-CRM-Konvention.
  const url = `${creds.baseUrl}/api/v1/leads`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creds.apiToken}`,
      Accept: 'application/json',
      'User-Agent': 'LeadMonster/1.0 (+https://finanzteam26.de)',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Convexa ${res.status}: ${txt.slice(0, 500)}`)
  }

  const json = (await res.json().catch(() => ({}))) as Partial<ConvexaLeadResponse>
  if (!json.id) {
    // Manche APIs antworten mit {data:{id:...}}. Wir versuchen einen Fallback.
    const fallbackId =
      (json as { data?: { id?: string } }).data?.id ??
      String((json as { lead_id?: string }).lead_id ?? '')
    if (!fallbackId) {
      throw new Error('Convexa-Antwort ohne Lead-ID')
    }
    return { id: fallbackId, status: 'created' }
  }

  return { id: json.id, status: json.status ?? 'created', created_at: json.created_at }
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
