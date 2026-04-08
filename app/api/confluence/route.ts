// POST /api/confluence — manually re-syncs a single lead to Confluence.
// GET  /api/confluence?action=test — tests the current Confluence connection.
// Auth-guarded: only authenticated admin sessions may access these endpoints.
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createLeadPage } from '@/lib/confluence/client'

// Validate that the request body contains a valid UUID before DB lookup.
const bodySchema = z.object({ leadId: z.string().uuid() })

export async function POST(request: NextRequest) {
  // Auth check — verify a valid Supabase session using the session-aware server client.
  const { data: { user } } = await createClient().auth.getUser()

  if (!user) {
    return Response.json(
      {
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'Admin session required' },
      },
      { status: 401 },
    )
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
      { status: 400 },
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'leadId must be a valid UUID',
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // Fetch the lead row — 404 if not found
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', parsed.data.leadId)
    .single()

  if (!lead) {
    return Response.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Lead not found' } },
      { status: 404 },
    )
  }

  // Guard: skip re-sync if already synced
  if (lead.confluence_synced) {
    return Response.json(
      {
        data: {
          message: 'Lead already synced to Confluence',
          confluencePageId: lead.confluence_page_id,
        },
        error: null,
      },
      { status: 200 },
    )
  }

  // Resolve produkt name and slug for the Confluence page
  const { data: produkt } = await supabase
    .from('produkte')
    .select('name,slug')
    .eq('id', lead.produkt_id ?? '')
    .single()

  try {
    const { pageId } = await createLeadPage(
      lead,
      produkt?.name ?? 'Unbekannt',
      produkt?.slug ?? '',
    )

    // Update the lead row with the newly created Confluence page ID
    await supabase
      .from('leads')
      .update({ confluence_page_id: pageId, confluence_synced: true })
      .eq('id', lead.id)

    return Response.json(
      { data: { confluencePageId: pageId }, error: null },
      { status: 200 },
    )
  } catch (err) {
    console.error(`Confluence re-sync failed lead=${lead.id}:`, err)
    return Response.json(
      {
        data: null,
        error: {
          code: 'CONFLUENCE_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// GET /api/confluence?action=test
// Tests the Confluence connection using the credentials resolved from the
// einstellungen table (DB-first) with env var fallback.
// Credential resolution is delegated entirely to lib/confluence/client.ts.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // 1. Auth check — reject unauthenticated requests.
  const {
    data: { user },
  } = await createClient().auth.getUser()

  if (!user) {
    return Response.json(
      { success: false, message: 'Nicht authentifiziert.' },
      { status: 401 },
    )
  }

  // 2. Validate the action query parameter.
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action !== 'test') {
    return Response.json(
      { success: false, message: 'Unbekannte Aktion. Erlaubte Aktionen: test' },
      { status: 400 },
    )
  }

  // 3. Resolve credentials via the admin client (same logic as lib/confluence/client.ts
  //    resolveCredentials — reads einstellungen table with env var fallback).
  //    We replicate the read here so we can pass credentials to the user/current endpoint
  //    without exposing them in the response body.
  const supabase = createAdminClient()

  const credKeys = [
    'confluence_base_url',
    'confluence_email',
    'confluence_api_token',
  ]

  const { data: rows } = await supabase
    .from('einstellungen')
    .select('schluessel,wert')
    .in('schluessel', credKeys)

  const db = Object.fromEntries(
    (rows ?? []).map((r: { schluessel: string; wert: string | null }) => [r.schluessel, r.wert]),
  )

  const resolve = (dbKey: string, envKey: string): string => {
    const dbValue = db[dbKey]
    return (dbValue != null && dbValue !== '') ? dbValue : (process.env[envKey] ?? '')
  }

  const baseUrl = resolve('confluence_base_url', 'CONFLUENCE_BASE_URL')
  const email = resolve('confluence_email', 'CONFLUENCE_EMAIL')
  const apiToken = resolve('confluence_api_token', 'CONFLUENCE_API_TOKEN')

  // 4. Test the connection — fetch /wiki/rest/api/user/current with Basic auth.
  //    Never expose credentials in the response body.
  try {
    const auth = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64')
    const res = await fetch(`${baseUrl}/wiki/rest/api/user/current`, {
      headers: { Authorization: auth },
    })

    if (res.ok) {
      // 5. HTTP 200 → success
      return Response.json(
        { success: true, message: 'Verbindung erfolgreich.' },
        { status: 200 },
      )
    }

    // 6. Non-200 → failure with status code (no credential data exposed)
    return Response.json(
      { success: false, message: `Verbindung fehlgeschlagen: ${res.status}` },
      { status: 200 },
    )
  } catch {
    // Network-level error — no credential data exposed
    return Response.json(
      { success: false, message: 'Verbindung fehlgeschlagen: Netzwerkfehler' },
      { status: 200 },
    )
  }
}
