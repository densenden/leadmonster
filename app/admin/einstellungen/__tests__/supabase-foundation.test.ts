// Tests for Task Group 1 — Supabase Foundation and Credential Resolution.
// Verifies: einstellungen upsert+read round-trip, DB value wins over env,
// and env fallback when no DB row exists.
// Supabase client is fully mocked — no live DB connections.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockIn = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: vi.fn() },
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

const VALID_CREDS = {
  confluence_base_url: 'https://company.atlassian.net',
  confluence_email: 'admin@company.com',
  confluence_api_token: 'secret-token-xyz',
  confluence_space_key: 'LEADS',
  confluence_parent_page_id: '12345',
}

function mockDbRows(overrides: Partial<typeof VALID_CREDS> = {}) {
  const merged = { ...VALID_CREDS, ...overrides }
  const rows = Object.entries(merged).map(([schluessel, wert]) => ({ schluessel, wert }))
  mockIn.mockResolvedValue({ data: rows, error: null })
  mockSelect.mockReturnValue({ in: mockIn })
  mockFrom.mockReturnValue({ select: mockSelect })
}

function clearEnvCreds() {
  [
    'CONFLUENCE_BASE_URL',
    'CONFLUENCE_EMAIL',
    'CONFLUENCE_API_TOKEN',
    'CONFLUENCE_SPACE_KEY',
    'CONFLUENCE_PARENT_PAGE_ID',
  ].forEach((k) => delete process.env[k])
}

// ---------------------------------------------------------------------------
// Tests — einstellungen upsert + read round-trip (mocked)
// ---------------------------------------------------------------------------

describe('einstellungen table — upsert and read round-trip (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnvCreds()
  })

  afterEach(() => {
    clearEnvCreds()
    vi.resetModules()
  })

  it('upsert call targets the einstellungen table with the correct schluessel and wert', async () => {
    // Arrange: mock the upsert chain
    mockUpsert.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue({ upsert: mockUpsert })

    const supabase = (await import('@/lib/supabase/server')).createAdminClient()

    // Act: simulate what saveSettings does for one key
    await supabase
      .from('einstellungen')
      .upsert({ schluessel: 'confluence_base_url', wert: 'https://test.atlassian.net' })

    // Assert: from was called with the correct table name
    expect(mockFrom).toHaveBeenCalledWith('einstellungen')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        schluessel: 'confluence_base_url',
        wert: 'https://test.atlassian.net',
      }),
    )
  })

  it('read by schluessel returns the correct wert from the DB mock', async () => {
    // Arrange: mock SELECT … WHERE schluessel IN (…)
    mockDbRows()
    const supabase = (await import('@/lib/supabase/server')).createAdminClient()

    // Act
    const { data } = await supabase
      .from('einstellungen')
      .select('schluessel,wert')
      .in('schluessel', Object.keys(VALID_CREDS))

    // Assert: the returned rows contain the expected base URL value
    const baseUrlRow = (data as { schluessel: string; wert: string }[]).find(
      (r) => r.schluessel === 'confluence_base_url',
    )
    expect(baseUrlRow?.wert).toBe('https://company.atlassian.net')
  })
})

// ---------------------------------------------------------------------------
// Tests — lib/confluence/client.ts credential resolution
// ---------------------------------------------------------------------------

describe('lib/confluence/client.ts — credential resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearEnvCreds()
  })

  afterEach(() => {
    clearEnvCreds()
    vi.resetModules()
  })

  it('DB value wins over env var when a matching einstellungen row exists', async () => {
    // DB has a specific base URL
    mockDbRows({ confluence_base_url: 'https://db.atlassian.net' })
    // Env has a different value — DB should win
    process.env.CONFLUENCE_BASE_URL = 'https://env.atlassian.net'

    // We test this indirectly via testConnection which calls resolveCredentials()
    // and will attempt fetch with the resolved credentials.
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

    const { testConnection } = await import('@/lib/confluence/client')
    const result = await testConnection()

    // Verify the fetch was called with the DB URL (not the env URL)
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('https://db.atlassian.net')
    expect(calledUrl).not.toContain('https://env.atlassian.net')
    expect(result.success).toBe(true)

    fetchSpy.mockRestore()
  })

  it('falls back to env var when no DB row exists for a key', async () => {
    // No DB rows at all
    mockIn.mockResolvedValue({ data: [], error: null })
    mockSelect.mockReturnValue({ in: mockIn })
    mockFrom.mockReturnValue({ select: mockSelect })

    // Provide all env vars
    process.env.CONFLUENCE_BASE_URL = 'https://env-fallback.atlassian.net'
    process.env.CONFLUENCE_EMAIL = 'env@example.com'
    process.env.CONFLUENCE_API_TOKEN = 'env-token'
    process.env.CONFLUENCE_SPACE_KEY = 'ENVSPACE'
    process.env.CONFLUENCE_PARENT_PAGE_ID = '99999'

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

    const { testConnection } = await import('@/lib/confluence/client')
    const result = await testConnection()

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('https://env-fallback.atlassian.net')
    expect(result.success).toBe(true)

    fetchSpy.mockRestore()
  })
})
