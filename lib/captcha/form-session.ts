/**
 * Server-signed form-open session.
 * Client can forge formLoadedAt JSON — cookie HMAC is harder for dumb bots.
 *
 * Cookie is set on GET /api/captcha/config and checked on POST /api/leads.
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { MIN_FORM_DWELL_MS } from '@/lib/captcha/form-timing'

export const FORM_SESSION_COOKIE = 'lm_form_open'

const MAX_FORM_AGE_MS = 6 * 60 * 60 * 1000 // 6h — abandon old tabs

function signingSecret(): string {
  // Prefer dedicated secret; fall back to INTERNAL_SECRET so local/prod works.
  return (
    process.env.FORM_SESSION_SECRET?.trim() ||
    process.env.INTERNAL_SECRET?.trim() ||
    'dev-only-form-session-secret'
  )
}

function sign(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url')
}

/** Creates cookie value: `<openedAtMs>.<sig>` */
export function createFormSessionToken(openedAtMs: number = Date.now()): string {
  const payload = String(openedAtMs)
  return `${payload}.${sign(payload)}`
}

export type FormSessionResult =
  | { ok: true; dwellMs: number; openedAtMs: number }
  | { ok: false; code: 'TOO_FAST' | 'FORM_SESSION_INVALID'; message: string; dwellMs?: number }

/**
 * Verifies HMAC cookie and min dwell. Missing/bad cookie → FORM_SESSION_INVALID
 * when captcha is enabled (caller decides).
 */
export function verifyFormSessionToken(
  token: string | undefined | null,
  nowMs: number = Date.now(),
  minDwellMs: number = MIN_FORM_DWELL_MS,
): FormSessionResult {
  if (!token || typeof token !== 'string') {
    return {
      ok: false,
      code: 'FORM_SESSION_INVALID',
      message: 'Formular-Sitzung fehlt. Bitte Seite neu laden und erneut versuchen.',
    }
  }

  const dot = token.indexOf('.')
  if (dot <= 0) {
    return {
      ok: false,
      code: 'FORM_SESSION_INVALID',
      message: 'Formular-Sitzung ungültig. Bitte Seite neu laden.',
    }
  }

  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(payload)

  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return {
        ok: false,
        code: 'FORM_SESSION_INVALID',
        message: 'Formular-Sitzung ungültig. Bitte Seite neu laden.',
      }
    }
  } catch {
    return {
      ok: false,
      code: 'FORM_SESSION_INVALID',
      message: 'Formular-Sitzung ungültig. Bitte Seite neu laden.',
    }
  }

  const openedAtMs = Number(payload)
  if (!Number.isFinite(openedAtMs) || openedAtMs <= 0) {
    return {
      ok: false,
      code: 'FORM_SESSION_INVALID',
      message: 'Formular-Sitzung ungültig. Bitte Seite neu laden.',
    }
  }

  const dwellMs = nowMs - openedAtMs

  if (dwellMs < 0 || dwellMs > MAX_FORM_AGE_MS) {
    return {
      ok: false,
      code: 'FORM_SESSION_INVALID',
      message: 'Formular-Sitzung abgelaufen. Bitte Seite neu laden.',
    }
  }

  if (dwellMs < minDwellMs) {
    return {
      ok: false,
      code: 'TOO_FAST',
      message: 'Formular zu schnell abgesendet. Bitte kurz warten und erneut versuchen.',
      dwellMs,
    }
  }

  return { ok: true, dwellMs, openedAtMs }
}

/** Set-Cookie header value for the form session (HttpOnly). */
export function formSessionSetCookieHeader(token: string): string {
  // SameSite=Lax so normal navigations keep it; Secure in production.
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${FORM_SESSION_COOKIE}=${token}; Path=/; Max-Age=21600; HttpOnly; SameSite=Lax${secure}`
}

/** Read cookie value from a Cookie request header. */
export function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    if (key === name) return part.slice(idx + 1).trim()
  }
  return null
}
