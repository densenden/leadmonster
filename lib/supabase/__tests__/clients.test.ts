// Supabase client factory smoke tests.
// These tests verify that both client factory functions return a valid Supabase
// client object with a `from` method. No real network calls are made.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock environment variables before module imports so factories receive values.
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// Mock @supabase/ssr to avoid real network connections.
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(),
    auth: { getSession: vi.fn(), getUser: vi.fn() },
  })),
  createServerClient: vi.fn(() => ({
    from: vi.fn(),
    auth: { getSession: vi.fn(), getUser: vi.fn() },
  })),
}))

// Mock @supabase/supabase-js to avoid real network connections in admin client tests.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: { getSession: vi.fn(), getUser: vi.fn() },
  })),
}))

// Mock next/headers so server.ts can be imported outside Next.js runtime.
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}))

describe('Supabase browser client (lib/supabase/client.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createClient returns an object with a from method', async () => {
    const { createClient } = await import('../client')
    const client = createClient()

    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  // Configuration validation: confirm the browser client uses the anon key,
  // not the service role key. This guards against accidentally swapping keys.
  it('browser createClient passes the anon key (not the service role key) to createBrowserClient', async () => {
    const { createBrowserClient } = await import('@supabase/ssr')
    const { createClient } = await import('../client')

    createClient()

    const mockFn = vi.mocked(createBrowserClient)
    expect(mockFn).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
    expect(mockFn).not.toHaveBeenCalledWith(
      expect.any(String),
      'test-service-role-key'
    )
  })
})

describe('Supabase server client (lib/supabase/server.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createAdminClient returns an object with a from method', async () => {
    const { createAdminClient } = await import('../server')
    const client = createAdminClient()

    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  // Configuration validation: confirm the admin client uses the service role key,
  // not the anon key. The service role key bypasses RLS — using the wrong key here
  // would silently break server-side data access.
  it('createAdminClient passes the service role key (not the anon key) to createClient', async () => {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const { createAdminClient } = await import('../server')

    createAdminClient()

    const mockFn = vi.mocked(createSupabaseClient)
    expect(mockFn).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-role-key'
    )
    expect(mockFn).not.toHaveBeenCalledWith(
      expect.any(String),
      'test-anon-key'
    )
  })
})
