// Confluence CRM integration — creates lead pages and manages label attachment.
// Credentials are resolved from the einstellungen DB table with env var fallback.
import { createAdminClient } from '@/lib/supabase/server'
import type { Lead } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Creds {
  baseUrl: string
  email: string
  apiToken: string
  spaceKey: string
  parentPageId: string
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Resolves all five Confluence credentials in a single DB query.
// Prefers the DB value (einstellungen.wert) over the env var fallback.
// Throws a descriptive Error if any required credential is missing from both sources.
async function resolveCredentials(): Promise<Creds> {
  const supabase = createAdminClient()

  const keys = [
    'confluence_base_url',
    'confluence_email',
    'confluence_api_token',
    'confluence_space_key',
    'confluence_parent_page_id',
  ]

  const { data } = await supabase
    .from('einstellungen')
    .select('schluessel,wert')
    .in('schluessel', keys)

  // Build a lookup map from the DB results
  const db = Object.fromEntries(
    (data ?? []).map((r: { schluessel: string; wert: string | null }) => [r.schluessel, r.wert]),
  )

  // Resolve each credential: DB value takes precedence, env var is fallback.
  const get = (dbKey: string, envKey: string): string => {
    const dbValue = db[dbKey]
    const v = dbValue != null && dbValue !== '' ? dbValue : process.env[envKey]
    if (!v) throw new Error(`Missing Confluence credential: ${dbKey}`)
    return v
  }

  return {
    baseUrl: get('confluence_base_url', 'CONFLUENCE_BASE_URL'),
    email: get('confluence_email', 'CONFLUENCE_EMAIL'),
    apiToken: get('confluence_api_token', 'CONFLUENCE_API_TOKEN'),
    spaceKey: get('confluence_space_key', 'CONFLUENCE_SPACE_KEY'),
    parentPageId: get('confluence_parent_page_id', 'CONFLUENCE_PARENT_PAGE_ID'),
  }
}

// Escapes special XML/HTML characters for safe embedding in Confluence storage format.
function xml(v: string | null | undefined): string {
  if (!v) return ''
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Builds the Confluence page title.
// Pattern: "Lead: {vorname} {nachname} — {produktName} — {DD.MM.YYYY}"
// Null vorname/nachname produce empty strings; the name segment is trimmed so no
// double spaces appear when both parts are empty.
function buildTitle(lead: Lead, produktName: string): string {
  const nameParts = [lead.vorname, lead.nachname].filter(Boolean)
  const name = nameParts.join(' ')
  const date = new Date(lead.created_at ?? Date.now()).toLocaleDateString('de-DE')
  // When name is empty, omit the trailing space so we get "Lead: — ..." not "Lead:  — ..."
  const nameSegment = name ? ` ${name}` : ''
  return `Lead:${nameSegment} — ${produktName} — ${date}`
}

// Builds the Confluence storage format (XHTML) body for the lead page.
// Null field values produce empty <td></td>, never the string "null" or "undefined".
function buildBody(lead: Lead, produktName: string): string {
  // Summary block — five paragraphs
  const nameParts = [lead.vorname, lead.nachname].filter(Boolean)
  const name = nameParts.map(xml).join(' ')
  const summary = [
    `<p>Neuer Lead: ${name}</p>`,
    `<p>Produkt: ${xml(produktName)}</p>`,
    `<p>Interesse: ${xml(lead.interesse)}</p>`,
    `<p>Zielgruppe: ${xml(lead.zielgruppe_tag)}</p>`,
    `<p>Intent: ${xml(lead.intent_tag)}</p>`,
  ].join('')

  // Table block — header + one row per field
  const fieldRows = [
    ['Vorname', lead.vorname],
    ['Nachname', lead.nachname],
    ['E-Mail', lead.email],
    ['Telefon', lead.telefon],
    ['Nachricht', lead.interesse],
    ['Zeitstempel', lead.created_at ?? ''],
  ]
    .map(
      ([label, value]) =>
        `<tr><td><strong>${label}</strong></td><td>${xml(value as string | null)}</td></tr>`,
    )
    .join('')

  const table = `<table><tr><th>Feld</th><th>Wert</th></tr>${fieldRows}</table>`

  return `${summary}${table}`
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

// Creates a new Confluence page for the given lead.
// Returns { pageId } on success.
// Throws if credentials are missing or the Confluence API returns a non-2xx response.
// Label attachment errors are logged and swallowed — they do not affect the return value.
export async function createLeadPage(
  lead: Lead,
  produktName: string,
  produktSlug: string,
): Promise<{ pageId: string }> {
  const c = await resolveCredentials()
  const auth = 'Basic ' + Buffer.from(`${c.email}:${c.apiToken}`).toString('base64')

  const res = await fetch(`${c.baseUrl}/wiki/api/v2/pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: JSON.stringify({
      spaceId: c.spaceKey,
      parentId: c.parentPageId,
      title: buildTitle(lead, produktName),
      body: {
        representation: 'storage',
        value: buildBody(lead, produktName),
      },
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new Error(`Confluence ${res.status}: ${errorBody}`)
  }

  const json = await res.json()
  const pageId = String(json.id)

  // Attach labels after successful page creation — fire-and-forget, non-blocking.
  const labels = [produktSlug, lead.zielgruppe_tag, lead.intent_tag]
    .filter(Boolean)
    .map((labelName) => ({ prefix: 'global', name: labelName as string }))

  if (labels.length > 0) {
    fetch(`${c.baseUrl}/wiki/api/v2/pages/${pageId}/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(labels),
    })
      .then((r) => {
        if (!r.ok) {
          console.error(`Confluence label attachment failed pageId=${pageId} status=${r.status}`)
        }
      })
      .catch((e) => {
        console.error(`Confluence label attachment threw pageId=${pageId}:`, e)
      })
}

  return { pageId }
}

// Tests the Confluence connection by hitting GET /wiki/api/v2/spaces.
// Never throws — all errors are returned as { success: false, message }.
export async function testConnection(): Promise<
  { success: true } | { success: false; message: string }
> {
  try {
    const c = await resolveCredentials()
    const auth = 'Basic ' + Buffer.from(`${c.email}:${c.apiToken}`).toString('base64')

    const r = await fetch(`${c.baseUrl}/wiki/api/v2/spaces`, {
      headers: { Authorization: auth },
    })

    return r.ok ? { success: true } : { success: false, message: `HTTP ${r.status}` }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}
