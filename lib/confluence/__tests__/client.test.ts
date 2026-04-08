// Tests for lib/confluence/client.ts
// All Supabase and HTTP calls are mocked — no live network or DB connections.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the Supabase admin client used inside resolveCredentials()
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

// Mock next/headers (required by createClient internals even when mocked)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CREDS = {
  confluence_base_url: 'https://example.atlassian.net',
  confluence_email: 'admin@example.com',
  confluence_api_token: 'token-abc',
  confluence_space_key: 'SPACE1',
  confluence_parent_page_id: '99999',
}

// Sets up the Supabase mock to return the given key/value pairs from einstellungen.
function mockDbCreds(overrides: Partial<typeof VALID_CREDS> = {}) {
  const merged = { ...VALID_CREDS, ...overrides }
  const rows = Object.entries(merged)
    .filter(([, v]) => v !== null)
    .map(([schluessel, wert]) => ({ schluessel, wert }))

  mockIn.mockResolvedValue({ data: rows, error: null })
  mockSelect.mockReturnValue({ in: mockIn })
  mockFrom.mockReturnValue({ select: mockSelect })
}

// Sets up environment variables for the five Confluence keys.
function setEnvCreds(overrides: Partial<Record<string, string>> = {}) {
  const defaults: Record<string, string> = {
    CONFLUENCE_BASE_URL: 'https://env.atlassian.net',
    CONFLUENCE_EMAIL: 'env@example.com',
    CONFLUENCE_API_TOKEN: 'env-token',
    CONFLUENCE_SPACE_KEY: 'ENVSPACE',
    CONFLUENCE_PARENT_PAGE_ID: '88888',
  }
  const merged = { ...defaults, ...overrides }
  Object.entries(merged).forEach(([k, v]) => {
    process.env[k] = v
  })
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

// Minimal Lead fixture for tests.
const LEAD_FULL = {
  id: 'lead-uuid-1',
  produkt_id: 'prod-uuid-1',
  vorname: 'Max',
  nachname: 'Mustermann',
  email: 'max@example.de',
  telefon: '0151 1234567',
  interesse: 'Sofortschutz für Eltern',
  zielgruppe_tag: 'senioren_50plus',
  intent_tag: 'sofortschutz',
  confluence_page_id: null,
  confluence_synced: false,
  resend_sent: false,
  created_at: '2026-04-07T10:30:00.000Z',
}

const LEAD_NULL_FIELDS = {
  id: 'lead-uuid-2',
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

describe('createLeadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnvCreds()
  })

  afterEach(() => {
    clearEnvCreds()
    vi.resetModules()
  })

  it('returns { pageId } when the Confluence API responds with 200', async () => {
    mockDbCreds()

    // Stub global.fetch: first call = page creation, second = label attachment
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url)
      if (urlStr.includes('/labels')) {
        return new Response(JSON.stringify({}), { status: 200 })
      }
      return new Response(JSON.stringify({ id: '123' }), { status: 200 })
    })

    const { createLeadPage } = await import('../client')
    const result = await createLeadPage(LEAD_FULL, 'Sterbegeld24Plus', 'sterbegeld24plus')

    expect(result).toEqual({ pageId: '123' })
    fetchSpy.mockRestore()
  })

  it('throws with descriptive message when a required credential is missing', async () => {
    // Return empty rows from DB and no env vars set
    mockIn.mockResolvedValue({ data: [], error: null })
    mockSelect.mockReturnValue({ in: mockIn })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { createLeadPage } = await import('../client')

    await expect(createLeadPage(LEAD_FULL, 'Test Produkt', 'test')).rejects.toThrow(
      /Missing Confluence credential/,
    )
  })

  it('renders null vorname/nachname as empty strings in title — no "null" in title', async () => {
    mockDbCreds()

    const titlesSeen: string[] = []
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? '{}')
      if (body.title) titlesSeen.push(body.title)
      return new Response(JSON.stringify({ id: '456' }), { status: 200 })
    })

    const { createLeadPage } = await import('../client')
    await createLeadPage(LEAD_NULL_FIELDS, 'Sterbegeld', 'sterbegeld')

    expect(titlesSeen.length).toBeGreaterThan(0)
    const title = titlesSeen[0]
    // Must not contain the string "null"
    expect(title).not.toContain('null')
    // Must not have double spaces from missing name parts
    expect(title).not.toMatch(/  /)
    fetchSpy.mockRestore()
  })

  it('renders null lead fields as empty table cells — never as the string "null"', async () => {
    mockDbCreds()

    const bodiesSeen: string[] = []
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const reqBody = JSON.parse((init?.body as string) ?? '{}')
      if (reqBody.body?.value) bodiesSeen.push(reqBody.body.value)
      return new Response(JSON.stringify({ id: '789' }), { status: 200 })
    })

    const { createLeadPage } = await import('../client')
    await createLeadPage(LEAD_NULL_FIELDS, 'Sterbegeld', 'sterbegeld')

    expect(bodiesSeen.length).toBeGreaterThan(0)
    const bodyHtml = bodiesSeen[0]
    // The HTML must never contain the bare string "null" as a value
    expect(bodyHtml).not.toMatch(/>null</i)
    fetchSpy.mockRestore()
  })

  it('does not throw when label API call fails — still returns { pageId }', async () => {
    mockDbCreds()

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url)
      if (urlStr.includes('/labels')) {
        return new Response('Bad Request', { status: 400 })
      }
      return new Response(JSON.stringify({ id: '321' }), { status: 200 })
    })

    const { createLeadPage } = await import('../client')
    // Should not throw even though label call returns 400
    const result = await createLeadPage(LEAD_FULL, 'Sterbegeld24Plus', 'sterbegeld24plus')

    expect(result).toEqual({ pageId: '321' })
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
  })
})

describe('testConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnvCreds()
  })

  afterEach(() => {
    clearEnvCreds()
    vi.resetModules()
  })

  it('returns { success: false, message } when fetch throws — never throws itself', async () => {
    mockDbCreds()

    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))

    const { testConnection } = await import('../client')
    const result = await testConnection()

    expect(result.success).toBe(false)
    expect((result as { success: false; message: string }).message).toContain('Network failure')
    fetchSpy.mockRestore()
  })

  it('returns { success: false, message } on non-2xx response — never throws', async () => {
    mockDbCreds()

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const { testConnection } = await import('../client')
    const result = await testConnection()

    expect(result.success).toBe(false)
    expect((result as { success: false; message: string }).message).toContain('401')
    fetchSpy.mockRestore()
  })

  it('returns { success: true } when Confluence API returns 200', async () => {
    mockDbCreds()

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }))

    const { testConnection } = await import('../client')
    const result = await testConnection()

    expect(result).toEqual({ success: true })
    fetchSpy.mockRestore()
  })

  it('returns { success: false, message } when credentials are missing — never throws', async () => {
    // No DB creds, no env vars
    mockIn.mockResolvedValue({ data: [], error: null })
    mockSelect.mockReturnValue({ in: mockIn })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { testConnection } = await import('../client')
    const result = await testConnection()

    expect(result.success).toBe(false)
    expect((result as { success: false; message: string }).message).toMatch(
      /Missing Confluence credential/,
    )
  })
})
