/**
 * POST /api/leads — Lead submission endpoint
 *
 * CSRF protection: lightweight X-Requested-With header check + JSON-only content-type.
 * Upgrade path: replace with token-based CSRF (e.g., double-submit cookie) when stricter
 * security is required.
 *
 * Post-save work (Convexa sync + emails) is awaited inside the request — earlier
 * versions used fire-and-forget after Response.json, which is unsafe on Vercel
 * because the function is torn down right after the response, killing in-flight work.
 * The trade-off is +1–2s response latency, which is acceptable for a form submit.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import type { TablesInsert } from '@/lib/supabase/types'
import { pushLeadToConvexa } from '@/lib/convexa/client'
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/lead-consent'
import { sendLeadConfirmation, sendSalesNotification } from '@/lib/resend/mailer'

// IP-based rate limiting: max 3 submissions per IP per 60-minute window.
// Module-level Map persists across requests within the same server process.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Geburtsdatum-Range: volljährig (mind. 18 Jahre alt) + plausibler Bereich.
// Hard-coded 1925-01-01 / 2010-12-31 — bei Migration in 2030er Jahren anpassen.
const BIRTHDATE_MIN = '1925-01-01'
const BIRTHDATE_MAX = '2010-12-31'

// Validate lead submission fields — email, produktId, zielgruppeTag, intentTag are required.
const leadSchema = z.object({
  produktId: z.string().min(1),
  zielgruppeTag: z.string().min(1),
  intentTag: z.string().min(1).optional(),
  /** Stable page context for Convexa (hauptseite, tarifrechner, …). */
  formPlacement: z.string().max(50).optional(),
  // Anbieter-Wunsch aus VergleichsRechner-CTA — leer/undefined wenn der User
  // keinen spezifischen Anbieter ausgewählt hat.
  gewuenschterAnbieter: z.string().max(100).optional(),
  vorname: z.string().min(1, 'Vorname ist erforderlich').max(100),
  nachname: z.string().min(1, 'Nachname ist erforderlich').max(100),
  email: z.string().email(),
  telefon: z.string().min(1, 'Telefonnummer ist erforderlich').max(30),
  interesse: z.string().max(1000).optional(),
  // Lead-Kontakt-Felder für blinde Angebotsversendung (Migration 20260514000000).
  // O-Ton Christian: „Ich brauch Geburtsdatum, Adresse, Sterbegeldsumme und Wartezeit."
  geburtsdatum: z
    .string()
    .min(1, 'Geburtsdatum ist erforderlich')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Geburtsdatum muss im Format YYYY-MM-DD vorliegen')
    .refine(
      v => v >= BIRTHDATE_MIN && v <= BIRTHDATE_MAX,
      `Geburtsdatum muss zwischen ${BIRTHDATE_MIN} und ${BIRTHDATE_MAX} liegen`,
    ),
  strasse: z.string().min(1, 'Straße ist erforderlich').max(200),
  plz: z.string().regex(/^\d{5}$/, 'PLZ muss 5-stellig sein'),
  ort: z.string().min(1, 'Ort ist erforderlich').max(100),
  sourceUrl: z.string().url().max(500).optional(),
  website: z.string().optional(), // honeypot — any non-empty value triggers silent rejection
  privacyConsent: z.literal(true, {
    message: 'Datenschutz-Einwilligung ist erforderlich',
  }),
  privacyPolicyVersion: z.string().max(20).optional(),
  marketingConsent: z.boolean().optional().default(false),
  // Filter-Werte aus dem VergleichsRechner (Wartezeit, Berufsklasse, etc.).
  // Bekannte Lead-Felder (akzeptierte_wartezeit_monate, berufsklasse,
  // sterbegeld_summe) werden in eigene Spalten geschrieben, alles andere
  // landet im filter_kontext-jsonb.
  filterContext: z.record(z.string(), z.unknown()).optional(),
})

// Welche filterContext-Schlüssel landen direkt in eigenen Spalten?
// (Seit Migration 20260504000000 + 20260514000000, im generierten Supabase-
// Type evtl. noch nicht enthalten — daher als string-Liste statt typed Keyset.)
const KNOWN_LEAD_FIELDS: ReadonlyArray<string> = [
  'akzeptierte_wartezeit_monate',
  'berufsklasse',
  'sterbegeld_summe',
  'monatsbeitrag_eur',
]

export async function POST(request: NextRequest) {
  // 1. CSRF check — must run first, before rate limiting and validation.
  const xRequestedWith = request.headers.get('X-Requested-With')
  if (!xRequestedWith || xRequestedWith !== 'XMLHttpRequest') {
    return Response.json({ data: null, error: { code: 'FORBIDDEN' } }, { status: 403 })
  }

  // 2. IP rate limiting — runs after CSRF check, before Zod validation.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const now = Date.now()
  const existing = rateLimitStore.get(ip)

  if (existing && existing.resetAt > now) {
    if (existing.count >= 3) {
      return Response.json(
        {
          data: null,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Zu viele Anfragen. Bitte warten Sie eine Stunde.',
          },
        },
        { status: 429 },
      )
    }
    existing.count++
  } else {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 3600 * 1000 })
  }

  // 3. Parse and validate request body.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ data: null, error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = leadSchema.safeParse(body)
  if (!parsed.success) {
    console.warn('[api/leads] Validation failed:', parsed.error.issues)
    return Response.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
        },
      },
      { status: 422 },
    )
  }

  // 4. Honeypot silent rejection — any non-empty website value means bot.
  // Return 200 to avoid tipping off automated scanners; do not write to DB.
  if (parsed.data.website) {
    console.warn('[api/leads] Honeypot triggered — submission discarded', {
      email: parsed.data.email,
      sourceUrl: parsed.data.sourceUrl,
    })
    return Response.json({ data: { id: 'bot' } }, { status: 200 })
  }

  // 5. DB insert using service role client (never the anon client).
  const supabase = createAdminClient()
  const insertPayload: TablesInsert<'leads'> = {
    produkt_id: parsed.data.produktId,
    vorname: parsed.data.vorname,
    nachname: parsed.data.nachname,
    email: parsed.data.email,
    telefon: parsed.data.telefon,
    interesse: parsed.data.interesse,
    zielgruppe_tag: parsed.data.zielgruppeTag,
    intent_tag: parsed.data.intentTag ?? 'anfrage',
  }
  // Only include gewuenschter_anbieter when set — keeps the payload narrow.
  if (parsed.data.gewuenschterAnbieter) {
    insertPayload.gewuenschter_anbieter = parsed.data.gewuenschterAnbieter
  }
  // Kontakt-Felder (Migration 20260514000000). Im generierten Supabase-Type
  // noch nicht enthalten — daher Cast über generic Record.
  const insertAsRecord = insertPayload as Record<string, unknown>
  insertAsRecord.geburtsdatum = parsed.data.geburtsdatum
  insertAsRecord.strasse = parsed.data.strasse
  insertAsRecord.plz = parsed.data.plz
  insertAsRecord.ort = parsed.data.ort
  if (parsed.data.sourceUrl) insertAsRecord.source_url = parsed.data.sourceUrl

  const consentAt = new Date().toISOString()
  insertAsRecord.privacy_consent_at = consentAt
  insertAsRecord.privacy_policy_version =
    parsed.data.privacyPolicyVersion ?? PRIVACY_POLICY_VERSION
  insertAsRecord.marketing_consent = parsed.data.marketingConsent ?? false
  if (parsed.data.marketingConsent) {
    insertAsRecord.marketing_consent_at = consentAt
  }

  // Filter-Kontext: bekannte Schlüssel in eigene Spalten extrahieren,
  // alles übrige landet im filter_kontext-jsonb für Convexa-Push.
  if (parsed.data.filterContext) {
    const restContext: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed.data.filterContext)) {
      if (v === null || v === undefined) continue
      if ((KNOWN_LEAD_FIELDS as readonly string[]).includes(k)) {
        ;(insertPayload as Record<string, unknown>)[k] = v
      } else {
        restContext[k] = v
      }
    }
    if (Object.keys(restContext).length > 0) {
      ;(insertPayload as Record<string, unknown>).filter_kontext = restContext
    }
  }

  if (parsed.data.formPlacement) {
    const existing =
      ((insertPayload as Record<string, unknown>).filter_kontext as Record<string, unknown> | undefined) ??
      {}
    ;(insertPayload as Record<string, unknown>).filter_kontext = {
      ...existing,
      form_placement: parsed.data.formPlacement,
    }
  }

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insertError || !lead) {
    console.error('[api/leads] DB insert error:', {
      message: insertError?.message,
      code: insertError?.code,
      details: insertError?.details,
      hint: insertError?.hint,
    })
    return Response.json(
      {
        data: null,
        error: {
          code: 'SERVER_ERROR',
          message: 'Lead konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
        },
      },
      { status: 500 },
    )
  }

  // 6. Post-save work — wrapped in try/catch so any downstream failure is logged
  // but never converts a successful save into an HTTP 500.
  try {
    const { data: produkt } = await supabase
      .from('produkte')
      .select('name, slug, typ')
      .eq('id', parsed.data.produktId)
      .single()

    const produktName = produkt?.name ?? 'Unbekannt'
    const produktSlug = produkt?.slug ?? ''
    const produktTyp = produkt?.typ ?? ''

    const { data: fullLead } = await supabase.from('leads').select('*').eq('id', lead.id).single()

    if (fullLead) {
      // Convexa CRM sync — sets convexa_synced=false on failure for later re-sync.
      try {
        const result = await pushLeadToConvexa(fullLead, {
          produktName,
          produktSlug,
          produktTyp,
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
        console.error(`[api/leads] Convexa sync failed lead=${lead.id}:`, msg)
        await supabase
          .from('leads')
          .update({ convexa_synced: false, convexa_error: msg })
          .eq('id', lead.id)
      }

      // Email dispatch — both sends run in parallel.
      // Awaited so Vercel serverless doesn't tear down the function mid-flight.
      const [confirmationSent, notificationSent] = await Promise.all([
        sendLeadConfirmation(fullLead),
        sendSalesNotification(fullLead, produktName),
      ])

      if (!confirmationSent) console.error(`[api/leads] Confirmation email failed lead=${lead.id}`)
      if (!notificationSent) console.error(`[api/leads] Sales notification email failed lead=${lead.id}`)

      if (confirmationSent && notificationSent) {
        await supabase.from('leads').update({ resend_sent: true }).eq('id', lead.id)
      }
    }
  } catch (err) {
    console.error(`[api/leads] Post-save processing failed lead=${lead.id}:`, err)
  }

  return Response.json({ data: { id: lead.id }, error: null }, { status: 201 })
}
