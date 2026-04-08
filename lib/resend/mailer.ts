// Transactional email dispatch for lead confirmation and sales notifications.
// Both exported functions always resolve (never throw) — email failures are
// swallowed so the lead save HTTP response is never blocked.
//
// resend_sent flag is updated by the CALLER in app/api/leads/route.ts after
// both send calls resolve — not inside this module. This keeps the DB update
// co-located with the HTTP response logic and makes the flag semantically clear:
// it means "both emails were sent in this session".
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/supabase/types'

// Resend client — instantiated once at module level using the env-provided API key.
// The from address is never hardcoded: always read from process.env.RESEND_FROM_ADDRESS
// so it can be changed via environment config without a code deploy.
const resend = new Resend(process.env.RESEND_API_KEY)

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Template differentiation convention:
// - Confirmation templates (sent to the prospect): betreff MUST contain "[BESTAETIGUNG]"
// - Notification templates (sent to the sales team): betreff MUST contain "[BENACHRICHTIGUNG]"
//
// Rows with delay_hours > 0 are skipped here — they are reserved for future drip
// email sequences and must be handled by a separate scheduled job, not the
// synchronous lead submission handler.
async function fetchEmailTemplate(
  produktId: string | null | undefined,
  recipientType: 'confirmation' | 'notification',
): Promise<{ betreff: string; html_body: string } | null> {
  if (!produktId) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('email_sequenzen')
    .select('betreff, html_body, delay_hours')
    .eq('produkt_id', produktId)
    .eq('trigger', 'form_submit')
    .eq('aktiv', true)

  const token = recipientType === 'confirmation' ? '[BESTAETIGUNG]' : '[BENACHRICHTIGUNG]'

  const matching = (data ?? []).filter(
    (row: { betreff: string | null; html_body: string | null; delay_hours: number }) => {
      // Skip drip-sequence rows — reserved for future async handling
      if (row.delay_hours > 0) {
        console.warn(
          `[mailer] Skipping email_sequenzen row with delay_hours=${row.delay_hours} — reserved for future drip sequences`,
        )
        return false
      }
      return row.betreff?.includes(token) ?? false
    },
  )

  if (matching.length === 0) return null

  const row = matching[0] as { betreff: string; html_body: string }
  return { betreff: row.betreff, html_body: row.html_body }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Sends a German-language confirmation email to the lead.
// Returns true on success, false on any error — never throws.
export async function sendLeadConfirmation(lead: Lead): Promise<boolean> {
  try {
    const template = await fetchEmailTemplate(lead.produkt_id, 'confirmation')

    const subject = template?.betreff ?? `Ihre Anfrage ist bei uns eingegangen`

    // Fallback HTML uses inline CSS only for maximum email client compatibility.
    const html =
      template?.html_body ??
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#1a365d">Vielen Dank, ${lead.vorname ?? 'geschätzte/r Interessent/in'}!</h2>
<p>Ihre Anfrage ist bei uns eingegangen. Wir melden uns innerhalb von 24 Stunden bei Ihnen.</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0">
<tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Feld</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Ihre Angabe</th></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Vorname</td><td style="padding:8px;border:1px solid #ddd">${lead.vorname ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Nachname</td><td style="padding:8px;border:1px solid #ddd">${lead.nachname ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">E-Mail</td><td style="padding:8px;border:1px solid #ddd">${lead.email}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Telefon</td><td style="padding:8px;border:1px solid #ddd">${lead.telefon ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Interesse</td><td style="padding:8px;border:1px solid #ddd">${lead.interesse ?? ''}</td></tr>
</table>
<p style="color:#666;font-size:14px">Mit freundlichen Grüßen</p>
</body></html>`

    await resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS ?? 'noreply@leadmonster.de',
      to: lead.email,
      subject,
      html,
    })

    return true
  } catch (error) {
    console.error('[mailer] sendLeadConfirmation failed:', error)
    return false
  }
}

// Sends a German-language internal notification about a new lead to the sales team.
// The sales notification recipient is resolved from the einstellungen DB table first
// (same pattern as lib/confluence/client.ts resolveCredentials), then falls back to
// process.env.SALES_NOTIFICATION_EMAIL.
// Returns true on success, false on any error — never throws.
export async function sendSalesNotification(lead: Lead, produktName: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    // Resolve sales email and confluence base URL in a single DB query.
    // Prefers DB values (einstellungen.wert) over env var fallbacks — same pattern
    // used by lib/confluence/client.ts resolveCredentials().
    const { data: settings } = await supabase
      .from('einstellungen')
      .select('schluessel, wert')
      .in('schluessel', ['sales_notification_email', 'confluence_base_url'])

    const dbMap = Object.fromEntries(
      (settings ?? []).map((s: { schluessel: string; wert: string | null }) => [s.schluessel, s.wert]),
    )

    const salesEmail =
      (dbMap['sales_notification_email'] || process.env.SALES_NOTIFICATION_EMAIL) as
        | string
        | undefined

    if (!salesEmail) {
      console.error('[mailer] No sales_notification_email configured — skipping notification')
      return false
    }

    const confluenceBaseUrl = dbMap['confluence_base_url'] || process.env.CONFLUENCE_BASE_URL

    // Only render the Confluence link when both the page ID and base URL are available.
    const confluenceLink =
      lead.confluence_page_id && confluenceBaseUrl
        ? `<p><a href="${confluenceBaseUrl}/pages/${lead.confluence_page_id}" style="color:#1a365d">Confluence-Seite öffnen</a></p>`
        : ''

    const template = await fetchEmailTemplate(lead.produkt_id, 'notification')

    const subject =
      template?.betreff ??
      `Neuer Lead: ${lead.vorname ?? ''} ${lead.nachname ?? ''} — ${produktName}`

    // Fallback HTML uses inline CSS only for maximum email client compatibility.
    // intent_tag and zielgruppe_tag are rendered with font-weight:bold for quick scanning.
    const html =
      template?.html_body ??
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
<h2 style="color:#1a365d">Neuer Lead: ${lead.vorname ?? ''} ${lead.nachname ?? ''}</h2>
<p>Produkt: <strong>${produktName}</strong></p>
${confluenceLink}
<table style="border-collapse:collapse;width:100%;margin:16px 0">
<tr style="background:#1a365d;color:white"><th style="padding:8px;border:1px solid #ddd;text-align:left">Feld</th><th style="padding:8px;border:1px solid #ddd;text-align:left">Wert</th></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Vorname</td><td style="padding:8px;border:1px solid #ddd">${lead.vorname ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Nachname</td><td style="padding:8px;border:1px solid #ddd">${lead.nachname ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">E-Mail</td><td style="padding:8px;border:1px solid #ddd">${lead.email}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Telefon</td><td style="padding:8px;border:1px solid #ddd">${lead.telefon ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Interesse</td><td style="padding:8px;border:1px solid #ddd">${lead.interesse ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Zielgruppe</td><td style="padding:8px;border:1px solid #ddd;font-weight:bold">${lead.zielgruppe_tag ?? ''}</td></tr>
<tr><td style="padding:8px;border:1px solid #ddd">Intent</td><td style="padding:8px;border:1px solid #ddd;font-weight:bold">${lead.intent_tag ?? ''}</td></tr>
</table>
</body></html>`

    await resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS ?? 'noreply@leadmonster.de',
      to: salesEmail,
      subject,
      html,
    })

    return true
  } catch (error) {
    console.error('[mailer] sendSalesNotification failed:', error)
    return false
  }
}
