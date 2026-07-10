import { describe, it, expect } from 'vitest'
import {
  acceptAllPreferences,
  categoryAllowed,
  necessaryOnlyPreferences,
  parseConsentJson,
  serializeConsent,
  isConsentRecord,
} from '../consent'

describe('cookie consent helpers', () => {
  it('parses valid consent json', () => {
    const prefs = acceptAllPreferences()
    const parsed = parseConsentJson(serializeConsent(prefs))
    expect(parsed).toEqual(prefs)
  })

  it('rejects invalid consent json', () => {
    expect(parseConsentJson('{bad json')).toBeNull()
    expect(parseConsentJson('{"statistics":true}')).toBeNull()
  })

  it('validates consent records', () => {
    expect(isConsentRecord(acceptAllPreferences())).toBe(true)
    expect(isConsentRecord({ version: 99, necessary: true, statistics: false, marketing: false, updatedAt: 'x' })).toBe(false)
  })

  it('allows only opted-in optional categories', () => {
    const necessary = necessaryOnlyPreferences()
    expect(categoryAllowed(necessary, 'necessary')).toBe(true)
    expect(categoryAllowed(necessary, 'statistics')).toBe(false)
    expect(categoryAllowed(necessary, 'marketing')).toBe(false)

    const all = acceptAllPreferences()
    expect(categoryAllowed(all, 'statistics')).toBe(true)
    expect(categoryAllowed(all, 'marketing')).toBe(true)
    expect(categoryAllowed(null, 'statistics')).toBe(false)
  })
})
