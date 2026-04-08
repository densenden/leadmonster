// Gap tests for lib/confluence/client.ts — covering critical edge cases not addressed in client.test.ts.
// All Supabase and HTTP calls are mocked — no live network or DB connections.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockIn = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockDbRows(rows: Array<{ schluessel: string; wert: string | null }>) {
  mockIn.mockResolvedValue({ data: rows, error: null })
  mockSelect.mockReturnValue({ in: mockIn })
  mockFrom.mockReturnValue({ select: mockSelect })
}

function setEnvCreds() {
  process.env.CONFLUENCE_BASE_URL = 'https://env.atlassian.net'
  process.env.CONFLUENCE_EMAIL = 'env@example.com'
  process.env.CONFLUENCE_API_TOKEN = 'env-token'
  process.env.CONFLUENCE_SPACE_KEY = 'ENVSPACE'
  process.env.CONFLUENCE_PARENT_PAGE_ID = '88888'
}

function clearEnvCreds() {
  ;[
    'CONFLUENCE_BASE_URL',
    'CONFLUENCE_EMAIL',
    'CONFLUENCE_API_TOKEN',
    'CONFLUENCE_SPACE_KEY',
    'CONFLUENCE_PARENT_PAGE_ID',
  ].forEach((k) => delete process.env[k])
}

const LEAD_ALL_NULL = {
  id: 'lead-null',
  produkt_id: null,
  vorname: null,
  nachname: null,
  email: 'anon@example.de',
  telefon: null,
  interesse: null,
  zielgruppe_tag: null,
  intent_tag: null,
  confluence_page_id: null,
  confluence_synced: false,
  resend_sent: false,
  created_at: '2026-04-07T10:30:00.000Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveCredentials — env fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnvCreds()
  })

  afterEach(() => {
    clearEnvCreds()
    vi.resetModules()
  })

  it('falls back to env vars when DB rows have null wert', async () => {
    // All five rows returned but with null wert values
    mockDbRows([
      { schluessel: 'confluence_base_url', wert: null },
      { schluessel: 'confluence_email', wert: null },
      { schluessel: 'confluence_api_token', wert: null },
      { schluessel: 'confluence_space_key', wert: null },
      { schluessel: 'confluence_parent_page_id', wert: null },
    ])
    setEnvCreds()

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: '777' }), { status: 200 }))

    const { createLeadPage } = await import('../client')
    const result = await createLeadPage(LEAD_ALL_NULL, 'Test', 'test')

    // Should have used env vars — page creation succeeded
    expect(result).toEqual({ pageId: '777' })
    // Verify the baseUrl came from env
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('env.atlassian.net'),
      expect.anything(),
    )
    fetchSpy.mockRestore()
  })

  it('falls back to env vars when the DB has no rows for those keys', async () => {
    // Empty DB result
    mockDbRows([])
    setEnvCreds()

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: '888' }), { status: 200 }))

    const { createLeadPage } = await import('../client')
    const result = await createLeadPage(LEAD_ALL_NULL, 'Test', 'test')

    expect(result).toEqual({ pageId: '888' })
    fetchSpy.mockRestore()
  })

  it('throws with the correct missing key name when both DB and env are absent', async () => {
    // No DB rows, no env vars
    mockDbRows([])
    // clearEnvCreds already called in beforeEach

    const { createLeadPage } = await import('../client')

    await expect(createLeadPage(LEAD_ALL_NULL, 'Test', 'test')).rejects.toThrow(
      'Missing Confluence credential: confluence_base_url',
    )
  })

  it('throws with correct key name when only some credentials are missing', async () => {
    // Provide four out of five via env, leave api_token missing
    process.env.CONFLUENCE_BASE_URL = 'https://env.atlassian.net'
    process.env.CONFLUENCE_EMAIL = 'env@example.com'
    // CONFLUENCE_API_TOKEN intentionally absent
    process.env.CONFLUENCE_SPACE_KEY = 'ENVSPACE'
    process.env.CONFLUENCE_PARENT_PAGE_ID = '88888'

    mockDbRows([])

    const { createLeadPage } = await import('../client')

    await expect(createLeadPage(LEAD_ALL_NULL, 'Test', 'test')).rejects.toThrow(
      'Missing Confluence credential: confluence_api_token',
    )
  })
})

describe('buildBody — all-null nullable fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnvCreds()
  })

  afterEach(() => {
    clearEnvCreds()
    vi.resetModules()
  })

  it('produces empty <td></td> (not "null") for all nullable lead fields', async () => {
    mockDbRows([
      { schluessel: 'confluence_base_url', wert: 'https://test.atlassian.net' },
      { schluessel: 'confluence_email', wert: 'test@example.com' },
      { schluessel: 'confluence_api_token', wert: 'token-xyz' },
      { schluessel: 'confluence_space_key', wert: 'SPACE1' },
      { schluessel: 'confluence_parent_page_id', wert: '12345' },
    ])

    const bodiesSeen: string[] = []
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const reqBody = JSON.parse((init?.body as string) ?? '{}')
      if (reqBody.body?.value) bodiesSeen.push(reqBody.body.value)
      return new Response(JSON.stringify({ id: '555' }), { status: 200 })
    })

    const { createLeadPage } = await import('../client')
    await createLeadPage(LEAD_ALL_NULL, 'Sterbegeld', 'sterbegeld')

    expect(bodiesSeen.length).toBeGreaterThan(0)
    const html = bodiesSeen[0]

    // Must not contain ">null<" or ">undefined<"
    expect(html).not.toMatch(/>null</i)
    expect(html).not.toMatch(/>undefined</i)

    // Empty table cells must be present: <td></td>
    expect(html).toContain('<td></td>')

    fetchSpy.mockRestore()
  })

  it('produces correct XHTML for a fully-populated lead', async () => {
    mockDbRows([
      { schluessel: 'confluence_base_url', wert: 'https://test.atlassian.net' },
      { schluessel: 'confluence_email', wert: 'test@example.com' },
      { schluessel: 'confluence_api_token', wert: 'token-xyz' },
      { schluessel: 'confluence_space_key', wert: 'SPACE1' },
      { schluessel: 'confluence_parent_page_id', wert: '12345' },
    ])

    const lead = {
      id: 'lead-full',
      produkt_id: 'prod-id',
      vorname: 'Max',
      nachname: 'Mustermann',
      email: 'max@example.de',
      telefon: '0151 1234567',
      interesse: 'Sofortschutz',
      zielgruppe_tag: 'senioren_50plus',
      intent_tag: 'sofortschutz',
      confluence_page_id: null,
      confluence_synced: false,
      resend_sent: false,
      created_at: '2026-04-07T10:30:00.000Z',
    }

    const bodiesSeen: string[] = []
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const reqBody = JSON.parse((init?.body as string) ?? '{}')
      if (reqBody.body?.value) bodiesSeen.push(reqBody.body.value)
      return new Response(JSON.stringify({ id: '666' }), { status: 200 })
    })

    const { createLeadPage } = await import('../client')
    await createLeadPage(lead, 'Sterbegeld24Plus', 'sterbegeld24plus')

    expect(bodiesSeen.length).toBeGreaterThan(0)
    const html = bodiesSeen[0]

    // Summary paragraphs must contain the lead data
    expect(html).toContain('Neuer Lead: Max Mustermann')
    expect(html).toContain('Produkt: Sterbegeld24Plus')
    expect(html).toContain('Interesse: Sofortschutz')
    expect(html).toContain('Zielgruppe: senioren_50plus')
    expect(html).toContain('Intent: sofortschutz')

    // Table must have a header row
    expect(html).toContain('<th>Feld</th>')
    expect(html).toContain('<th>Wert</th>')

    // Table must contain email (non-nullable)
    expect(html).toContain('max@example.de')

    fetchSpy.mockRestore()
  })
})

describe('createLeadPage — label API failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnvCreds()
  })

  afterEach(() => {
    clearEnvCreds()
    vi.resetModules()
  })

  it('logs console.error and returns { pageId } when the label API returns 4xx', async () => {
    mockDbRows([
      { schluessel: 'confluence_base_url', wert: 'https://test.atlassian.net' },
      { schluessel: 'confluence_email', wert: 'test@example.com' },
      { schluessel: 'confluence_api_token', wert: 'token-xyz' },
      { schluessel: 'confluence_space_key', wert: 'SPACE1' },
      { schluessel: 'confluence_parent_page_id', wert: '12345' },
    ])

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/labels')) {
        return new Response('Forbidden', { status: 403 })
      }
      return new Response(JSON.stringify({ id: '111' }), { status: 200 })
    })

    const lead = {
      id: 'lead-label-fail',
      produkt_id: 'prod-id',
      vorname: 'Anna',
      nachname: 'Schmidt',
      email: 'anna@example.de',
      telefon: null,
      interesse: null,
      zielgruppe_tag: 'familien',
      intent_tag: 'preis',
      confluence_page_id: null,
      confluence_synced: false,
      resend_sent: false,
      created_at: '2026-04-07T10:30:00.000Z',
    }

    const { createLeadPage } = await import('../client')
    // Must not throw — label failure is non-blocking
    const result = await createLeadPage(lead, 'Sterbegeld24Plus', 'sterbegeld24plus')

    expect(result).toEqual({ pageId: '111' })

    // Allow the fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 10))

    // console.error must have been called with a message containing the pageId
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('111'))

    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
  })
})
