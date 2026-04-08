// Tests for Task Group 3 — GET /api/confluence?action=test route handler.
// Supabase auth and outbound fetch to Confluence are fully mocked.
// No real network calls are made.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: { getUser: vi.fn() },
  })),
}))

vi.mock('@/lib/confluence/client', () => ({
  createLeadPage: vi.fn(),
  testConnection: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/confluence')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new Request(url.toString(), { method: 'GET' })
}

// Configures the admin client mock to return specific credentials from einstellungen.
function mockDbCreds(
  baseUrl: string,
  email: string,
  apiToken: string,
) {
  const rows = [
    { schluessel: 'confluence_base_url', wert: baseUrl },
    { schluessel: 'confluence_email', wert: email },
    { schluessel: 'confluence_api_token', wert: apiToken },
  ]
  mockAdminFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/confluence?action=test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns HTTP 401 with { success: false, message } when no authenticated session exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { GET } = await import('../route')
    const response = await GET(makeGetRequest({ action: 'test' }))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.message).toBe('Nicht authentifiziert.')
  })

  it('returns HTTP 400 when action param is unrecognised', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { GET } = await import('../route')
    const response = await GET(makeGetRequest({ action: 'unknown' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })

  it('returns { success: true, message: "Verbindung erfolgreich." } when Confluence API responds with HTTP 200', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockDbCreds('https://test.atlassian.net', 'admin@test.com', 'token123')

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ accountId: 'user-1' }), { status: 200 }))

    const { GET } = await import('../route')
    const response = await GET(makeGetRequest({ action: 'test' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.message).toBe('Verbindung erfolgreich.')

    fetchSpy.mockRestore()
  })

  it('returns { success: false, message } with status code when Confluence API returns non-200 — credentials not exposed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockDbCreds('https://test.atlassian.net', 'admin@test.com', 'bad-secret-token')

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('Unauthorized', { status: 401 }))

    const { GET } = await import('../route')
    const response = await GET(makeGetRequest({ action: 'test' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.message).toContain('401')
    // Credentials must NOT appear in the response body
    const responseText = JSON.stringify(body)
    expect(responseText).not.toContain('bad-secret-token')
    expect(responseText).not.toContain('admin@test.com')

    fetchSpy.mockRestore()
  })
})
