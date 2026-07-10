import { describe, it, expect } from 'vitest'
import { PRIVACY_POLICY_VERSION, resolveDatenschutzHref } from '../lead-consent'

describe('lead-consent helpers', () => {
  it('exposes a stable privacy policy version', () => {
    expect(PRIVACY_POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uses top-level datenschutz for root product', () => {
    expect(resolveDatenschutzHref('sterbegeld24plus')).toBe('/datenschutz')
  })

  it('uses product-scoped datenschutz for other products', () => {
    expect(resolveDatenschutzHref('pflegezusatz')).toBe('/pflegezusatz/datenschutz')
  })
})
