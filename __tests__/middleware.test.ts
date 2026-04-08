// Middleware session refresh tests.
// Verifies that the middleware calls supabase.auth.getUser() on matched routes
// and returns a response. Static paths are excluded via the matcher config.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}))

// Minimal NextRequest mock to simulate an incoming request.
function makeMockRequest(pathname: string) {
  const url = `https://leadmonster.de${pathname}`
  return {
    url,
    headers: new Headers(),
    cookies: {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    },
  }
}

describe('middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockClear()
  })

  it('calls supabase.auth.getUser() on a matched route', async () => {
    const { middleware } = await import('../middleware')

    await middleware(makeMockRequest('/admin') as unknown as Parameters<typeof middleware>[0])

    expect(mockGetUser).toHaveBeenCalledTimes(1)
  })

  it('returns a response object', async () => {
    const { middleware } = await import('../middleware')

    const response = await middleware(makeMockRequest('/admin/dashboard') as unknown as Parameters<typeof middleware>[0])

    // NextResponse.next() returns an object; the middleware must return it.
    expect(response).toBeDefined()
    expect(typeof response).toBe('object')
  })

  it('matcher config excludes _next/static, _next/image, and favicon.ico paths', async () => {
    // Import config and verify the matcher pattern explicitly excludes static asset paths.
    const { config } = await import('../middleware')
    const matcherPattern = config.matcher[0]

    // The pattern is a negative lookahead — confirm the excluded paths are listed.
    expect(matcherPattern).toContain('_next/static')
    expect(matcherPattern).toContain('_next/image')
    expect(matcherPattern).toContain('favicon.ico')
  })
})
