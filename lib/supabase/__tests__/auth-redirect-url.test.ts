import { describe, expect, it, vi, afterEach } from 'vitest'

describe('getSupabaseEmailRedirectUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds redirect URL from request origin in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://finanzteam26.de')
    vi.stubEnv('VERCEL_URL', 'leadmonster-git-feature.vercel.app')

    const { getSupabaseEmailRedirectUrl } = await import('../auth-redirect-url')
    expect(
      getSupabaseEmailRedirectUrl('/auth/callback', {
        requestOrigin: 'https://leadmonster-git-feature.vercel.app',
      })
    ).toBe('https://leadmonster-git-feature.vercel.app/auth/callback')
  })

  it('uses VERCEL_URL when request origin is unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_URL', 'leadmonster-preview.vercel.app')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://finanzteam26.de')

    const { getSupabaseEmailRedirectUrl } = await import('../auth-redirect-url')
    expect(getSupabaseEmailRedirectUrl('/auth/callback')).toBe(
      'https://leadmonster-preview.vercel.app/auth/callback'
    )
  })

  it('uses NEXT_PUBLIC_BASE_URL when no request or Vercel URL is available', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_URL', '')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://finanzteam26.de')

    const { getSupabaseEmailRedirectUrl } = await import('../auth-redirect-url')
    expect(getSupabaseEmailRedirectUrl('/auth/callback')).toBe('https://finanzteam26.de/auth/callback')
  })

  it('rejects localhost-only options in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_URL', 'localhost:3000')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')

    const { getSupabaseEmailRedirectUrl } = await import('../auth-redirect-url')
    expect(() => getSupabaseEmailRedirectUrl('/auth/callback', { requestOrigin: 'http://localhost:3000' }))
      .toThrowError(
        'Supabase auth redirect base URL is missing or invalid in production. Set NEXT_PUBLIC_BASE_URL or provide a valid request origin/VERCEL_URL.'
      )
  })

  it('falls back to localhost in non-production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('VERCEL_URL', '')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '')

    const { getSupabaseEmailRedirectUrl } = await import('../auth-redirect-url')
    expect(getSupabaseEmailRedirectUrl('/auth/callback')).toBe('http://localhost:3000/auth/callback')
  })
})
