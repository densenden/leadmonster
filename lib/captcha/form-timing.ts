/**
 * Minimum form fill time — bots often POST in under 1 second.
 * Real humans need longer to type name / address / birthdate.
 * Raised 2026-08-03: long lead form (address + birthdate + captcha).
 */
export const MIN_FORM_DWELL_MS = 8000

export type FormTimingResult =
  | { ok: true; dwellMs: number | null }
  | { ok: false; code: 'TOO_FAST'; message: string; dwellMs: number }

/**
 * Checks that the form was open long enough before submit.
 * Missing / invalid timestamp → treat as 0 dwell (reject when captcha is on).
 */
export function checkFormDwellTime(
  formLoadedAt: string | undefined | null,
  nowMs: number = Date.now(),
): FormTimingResult {
  if (!formLoadedAt || typeof formLoadedAt !== 'string') {
    return {
      ok: false,
      code: 'TOO_FAST',
      message: 'Formular zu schnell abgesendet. Bitte kurz warten und erneut versuchen.',
      dwellMs: 0,
    }
  }

  const loaded = Date.parse(formLoadedAt)
  if (Number.isNaN(loaded)) {
    return {
      ok: false,
      code: 'TOO_FAST',
      message: 'Formular zu schnell abgesendet. Bitte kurz warten und erneut versuchen.',
      dwellMs: 0,
    }
  }

  const dwellMs = nowMs - loaded
  // Clock skew / future timestamp → ignore and allow (do not punish NTP glitches).
  if (dwellMs < 0) {
    return { ok: true, dwellMs: null }
  }

  if (dwellMs < MIN_FORM_DWELL_MS) {
    return {
      ok: false,
      code: 'TOO_FAST',
      message: 'Formular zu schnell abgesendet. Bitte kurz warten und erneut versuchen.',
      dwellMs,
    }
  }

  return { ok: true, dwellMs }
}
