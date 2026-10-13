import { describe, it, expect } from 'vitest'
import { formatBotAttemptDetails } from '../bot-attempt-details'

describe('formatBotAttemptDetails', () => {
  it('formats spam heuristic signals in German', () => {
    const lines = formatBotAttemptDetails({
      signals: [
        { code: 'born_after_1990', detail: 'x' },
        { code: 'vergleich_defaults_unchanged', detail: 'y' },
      ],
      geburtsdatum: '1994-04-25',
      sterbegeldSumme: 8000,
      akzeptierteWartezeitMonate: 0,
      formPlacement: 'vergleichsrechner',
      interesse: 'Beratungsanfrage für die Sterbegeld24Plus. Geburtsjahr 1961 (65 Jahre), 8.000 €.',
    })

    expect(lines).toContain('Geburtsjahr nach 1990')
    expect(lines).toContain('VergleichsRechner-Defaults unverändert')
    expect(lines).toContain('Geburtsdatum: 1994-04-25')
    expect(lines.some(l => l.includes('8.000'))).toBe(true)
    expect(lines).toContain('Platzierung: vergleichsrechner')
  })

  it('formats captcha + dwell payloads', () => {
    const lines = formatBotAttemptDetails({
      captchaCode: 'CAPTCHA_FAILED',
      dwellMs: 420,
    })
    expect(lines).toContain('Captcha: CAPTCHA_FAILED')
    expect(lines).toContain('Dwell: 420 ms')
  })

  it('returns dash when payload empty', () => {
    expect(formatBotAttemptDetails({})).toEqual(['—'])
    expect(formatBotAttemptDetails(null)).toEqual(['—'])
  })
})
