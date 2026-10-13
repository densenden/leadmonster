import { describe, expect, it } from 'vitest'
import {
  isProbePath,
  isValidProduktSlug,
} from '@/lib/produkte/is-valid-produkt-slug'

describe('isValidProduktSlug', () => {
  it('accepts real product slugs', () => {
    expect(isValidProduktSlug('sterbegeld24plus')).toBe(true)
    expect(isValidProduktSlug('pflege')).toBe(true)
    expect(isValidProduktSlug('bu')).toBe(true)
  })

  it('rejects scanner junk and file-like paths', () => {
    expect(isValidProduktSlug('.env')).toBe(false)
    expect(isValidProduktSlug('.env.local')).toBe(false)
    expect(isValidProduktSlug('wp-login.php')).toBe(false)
    expect(isValidProduktSlug('favicon.ico')).toBe(false)
    expect(isValidProduktSlug('meta.json')).toBe(false)
    expect(isValidProduktSlug('UPPER')).toBe(false)
    expect(isValidProduktSlug('has_underscore')).toBe(false)
  })
})

describe('isProbePath', () => {
  it('flags env and php probes', () => {
    expect(isProbePath('/.env')).toBe(true)
    expect(isProbePath('/.env.backup')).toBe(true)
    expect(isProbePath('/wp-ws68.php')).toBe(true)
    expect(isProbePath('/admin.php')).toBe(true)
    expect(isProbePath('/.gitconfig')).toBe(true)
  })

  it('allows normal product paths', () => {
    expect(isProbePath('/')).toBe(false)
    expect(isProbePath('/pflege')).toBe(false)
    expect(isProbePath('/pflege/faq')).toBe(false)
  })
})
