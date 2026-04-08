// Tests for app/robots.ts — validates the MetadataRoute.Robots output.
// Mocks NEXT_PUBLIC_BASE_URL via process.env to keep tests pure/offline.
import { describe, it, expect, afterEach } from 'vitest'
import robots from '@/app/robots'

const AI_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
  'anthropic-ai',
  'CCBot',
  'ChatGPT-User',
]

describe('robots', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  it('disallows /admin/ for the catch-all * user agent', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : []
    const catchAll = rules.find((r) => r.userAgent === '*')
    expect(catchAll).toBeDefined()
    expect(catchAll?.disallow).toBe('/admin/')
  })

  it('sets the sitemap URL using NEXT_PUBLIC_BASE_URL', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
    const result = robots()
    expect(result.sitemap).toBe('https://leadmonster.de/sitemap.xml')
  })

  it('explicitly lists all required AI crawlers with allow: "/"', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://leadmonster.de'
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : []

    for (const crawler of AI_CRAWLERS) {
      const rule = rules.find((r) => r.userAgent === crawler)
      expect(rule, `Missing rule for ${crawler}`).toBeDefined()
      // AI crawlers must have allow and no disallow
      expect(rule?.allow).toBe('/')
      expect(rule?.disallow).toBeUndefined()
    }
  })

  // When NEXT_PUBLIC_BASE_URL is missing the route returns a valid robots file
  // with an empty rules array (no sitemap URL). This is a valid MetadataRoute.Robots
  // value and avoids the TypeScript error caused by returning a bare {}.
  it('returns a valid robots file with empty rules when NEXT_PUBLIC_BASE_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    const result = robots()
    expect(result).toEqual({ rules: [] })
    expect(result.sitemap).toBeUndefined()
  })
})
