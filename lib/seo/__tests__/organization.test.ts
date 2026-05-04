// Tests für die zentrale Org-Definition (Phase 1 Single-Domain-Migration).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildOrganization,
  resolveBaseUrl,
  LEGAL_NAME,
  CORPORATE_URL,
  DEFAULT_BASE_URL,
  ROOT_PRODUKT_SLUG,
} from '../organization'

describe('buildOrganization', () => {
  it('returns @type Organization with required fields', () => {
    const o = buildOrganization('https://www.example.com')
    expect(o['@type']).toBe('Organization')
    expect(o.name).toBe(LEGAL_NAME)
    expect(o.legalName).toBe(LEGAL_NAME)
    expect(o.url).toBe('https://www.example.com')
  })

  it('includes finanzteam26.de as sameAs', () => {
    const o = buildOrganization('https://www.sterbegeld24plus.de')
    expect(o.sameAs).toContain(CORPORATE_URL)
    expect(o.sameAs).toContain('https://finanzteam26.de')
  })
})

describe('resolveBaseUrl', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  it('uses DEFAULT_BASE_URL when no domain or env is set', () => {
    expect(resolveBaseUrl()).toBe(DEFAULT_BASE_URL)
  })

  it('prepends https:// when domain has no protocol', () => {
    expect(resolveBaseUrl('sterbegeld24plus.de')).toBe('https://sterbegeld24plus.de')
  })

  it('preserves https:// prefix in env var', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://staging.example.com'
    expect(resolveBaseUrl()).toBe('https://staging.example.com')
  })

  it('falls back from empty env to default', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', '')
    try {
      expect(resolveBaseUrl()).toBe(DEFAULT_BASE_URL)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('strips trailing slashes', () => {
    expect(resolveBaseUrl('sterbegeld24plus.de/')).toBe('https://sterbegeld24plus.de')
    expect(resolveBaseUrl('https://www.example.com//')).toBe('https://www.example.com')
  })

  it('domain argument takes precedence over env', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://from-env.com'
    expect(resolveBaseUrl('per-product.de')).toBe('https://per-product.de')
  })
})

describe('Constants', () => {
  it('LEGAL_NAME is the GmbH', () => {
    expect(LEGAL_NAME).toContain('finanzteam26')
    expect(LEGAL_NAME).toContain('GmbH')
  })

  it('DEFAULT_BASE_URL points to www.sterbegeld24plus.de', () => {
    expect(DEFAULT_BASE_URL).toBe('https://www.sterbegeld24plus.de')
  })

  it('ROOT_PRODUKT_SLUG is sterbegeld24plus', () => {
    expect(ROOT_PRODUKT_SLUG).toBe('sterbegeld24plus')
  })
})
