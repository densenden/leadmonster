// Auth-specific Supabase client tests.
// Verifies that browser and server clients are wired to the correct keys and
// that the server client uses the Next.js cookie adapter. No real network calls.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// Track cookie adapter calls to verify the adapter is wired correctly.
const mockCookieGet = vi.fn().mockReturnValue(undefined)
const mockCookieSet = vi.fn()
const mockCookieStore = {
  get: mockCookieGet,
  set: mockCookieSet,
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookieStore),
}))

const mockBrowserClient = {
  from: vi.fn(),
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn(), getUser: vi.fn() },
}

const mockServerClient = {
  from: vi.fn(),
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
}

const mockAdminSupabaseClient = {
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => mockBrowserClient),
  createServerClient: vi.fn(() => mockServerClient),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockAdminSupabaseClient),
}))

describe('browser createClient (lib/supabase/client.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls createBrowserClient with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY', async () => {
    const { createBrowserClient } = await import('@supabase/ssr')
    const { createClient } = await import('../client')

    createClient()

    expect(vi.mocked(createBrowserClient)).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
  })
})

describe('server createClient (lib/supabase/server.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockCookieGet.mockClear()
    mockCookieSet.mockClear()
  })

  it('calls createServerClient with NEXT_PUBLIC_SUPABASE_ANON_KEY (not service role key)', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    const { createClient } = await import('../server')

    createClient()

    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
    expect(vi.mocked(createServerClient)).not.toHaveBeenCalledWith(
      expect.any(String),
      'test-service-role-key',
      expect.anything()
    )
  })

  it('cookie adapter reads cookies via the Next.js cookies() store', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    const { createClient } = await import('../server')

    createClient()

    // Extract the cookie adapter passed to createServerClient.
    const callArgs = vi.mocked(createServerClient).mock.calls[0]
    // Use unknown cast to avoid TS errors on the mocked generic types.
    const cookieOptions = (callArgs[2] as unknown) as {
      cookies: { get: (name: string) => string | undefined }
    }

    mockCookieGet.mockReturnValue({ value: 'session-token' })
    const value = cookieOptions.cookies.get('sb-test-cookie')

    expect(mockCookieGet).toHaveBeenCalledWith('sb-test-cookie')
    expect(value).toBe('session-token')
  })
})

describe('createAdminClient (lib/supabase/server.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls createClient from @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY', async () => {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const { createAdminClient } = await import('../server')

    createAdminClient()

    expect(vi.mocked(createSupabaseClient)).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-role-key'
    )
  })
})
