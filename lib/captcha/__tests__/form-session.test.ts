import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createFormSessionToken,
  verifyFormSessionToken,
  readCookieValue,
  FORM_SESSION_COOKIE,
} from '../form-session'
import { MIN_FORM_DWELL_MS } from '../form-timing'

describe('form-session', () => {
  beforeEach(() => {
    process.env.INTERNAL_SECRET = 'test-form-session-secret'
  })

  afterEach(() => {
    delete process.env.INTERNAL_SECRET
    delete process.env.FORM_SESSION_SECRET
  })

  it('accepts a fresh enough signed token', () => {
    const now = Date.parse('2026-08-03T12:00:00.000Z')
    const opened = now - MIN_FORM_DWELL_MS
    const token = createFormSessionToken(opened)
    const result = verifyFormSessionToken(token, now)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.dwellMs).toBe(MIN_FORM_DWELL_MS)
  })

  it('rejects too-fast sessions', () => {
    const now = Date.parse('2026-08-03T12:00:00.000Z')
    const token = createFormSessionToken(now - 500)
    const result = verifyFormSessionToken(token, now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TOO_FAST')
  })

  it('rejects forged signatures', () => {
    const now = Date.now()
    const token = `${now - 20_000}.forged-signature`
    const result = verifyFormSessionToken(token, now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('FORM_SESSION_INVALID')
  })

  it('reads cookie from header', () => {
    const header = `a=1; ${FORM_SESSION_COOKIE}=abc.def; b=2`
    expect(readCookieValue(header, FORM_SESSION_COOKIE)).toBe('abc.def')
    expect(readCookieValue(null, FORM_SESSION_COOKIE)).toBeNull()
  })
})
