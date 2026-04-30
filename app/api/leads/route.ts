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
import { sendLeadConfirmation, sendSalesNotification } from '@/lib/resend/mailer'

// IP-based rate limiting: max 3 submissions per IP per 60-minute window.
// Module-level Map persists across requests within the same server process.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Validate lead submission fields — email, produktId, zielgruppeTag, intentTag are required.
const leadSchema = z.object({
  produktId: z.string().min(1),
  zielgruppeTag: z.string().min(1),
  intentTag: z.string().min(1).optional(),
  // Anbieter-Wunsch aus VergleichsRechner-CTA — leer/undefined wenn der User
  // keinen spezifischen Anbieter ausgewählt hat.
  gewuenschterAnbieter: z.string().max(100).optional(),
  vorname: z.string().max(100).optional(),
  nachname: z.string().max(100).optional(),
  email: z.string().email(),
  telefon: z.string().max(30).optional(),
  interesse: z.string().max(1000).optional(),
  website: z.string().optional(), // honeypot — any non-empty value triggers silent rejection
})

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
    intent_tag: parsed.data.intentTag,
  }
  // Only include gewuenschter_anbieter when set — keeps the payload narrow.
  if (parsed.data.gewuenschterAnbieter) {
    insertPayload.gewuenschter_anbieter = parsed.data.gewuenschterAnbieter
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
