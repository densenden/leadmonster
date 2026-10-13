import { describe, it, expect } from 'vitest'
import {
  birthYearFromIso,
  collectSpamSignals,
  hasUnchangedVergleichDefaults,
  isBornAfter1990,
} from '../spam-signals'

describe('spam-signals (Sterbegeld bot heuristics)', () => {
  it('parses birth year from ISO', () => {
    expect(birthYearFromIso('1991-01-25')).toBe(1991)
    expect(birthYearFromIso('bad')).toBeNull()
  })

  it('flags birth years after 1990', () => {
    expect(isBornAfter1990('1991-01-25')).toBe(true)
    expect(isBornAfter1990('1993-02-04')).toBe(true)
    expect(isBornAfter1990('1990-12-31')).toBe(false)
    expect(isBornAfter1990('1984-10-03')).toBe(false)
  })

  it('flags VergleichsRechner left on defaults (Silke-style)', () => {
    expect(
      hasUnchangedVergleichDefaults({
        nowYear: 2026,
        formPlacement: 'vergleichsrechner',
        sterbegeldSumme: 8000,
        akzeptierteWartezeitMonate: 0,
        interesse:
          'Beratungsanfrage für die Sterbegeld24Plus. Geburtsjahr 1961 (65 Jahre), 8.000 €. Bitte um persönlichen Vergleich aller Anbieter.',
      }),
    ).toBe(true)
  })

  it('does not flag when summe was changed', () => {
    expect(
      hasUnchangedVergleichDefaults({
        nowYear: 2026,
        formPlacement: 'vergleichsrechner',
        sterbegeldSumme: 15000,
        akzeptierteWartezeitMonate: 0,
        interesse: 'Geburtsjahr 1961 (65 Jahre), 15.000 €',
      }),
    ).toBe(false)
  })

  it('does not flag when calculator age was changed', () => {
    expect(
      hasUnchangedVergleichDefaults({
        nowYear: 2026,
        formPlacement: 'vergleichsrechner',
        sterbegeldSumme: 8000,
        akzeptierteWartezeitMonate: 0,
        interesse: 'Geburtsjahr 1955 (71 Jahre), 8.000 €',
      }),
    ).toBe(false)
  })

  it('does not flag non-vergleichsrechner placements', () => {
    expect(
      hasUnchangedVergleichDefaults({
        nowYear: 2026,
        formPlacement: 'hauptseite',
        sterbegeldSumme: 8000,
        akzeptierteWartezeitMonate: 0,
        interesse: 'Geburtsjahr 1961 (65 Jahre), 8.000 €',
      }),
    ).toBe(false)
  })

  it('collectSpamSignals returns both hits for young + defaults', () => {
    const hits = collectSpamSignals({
      nowYear: 2026,
      geburtsdatum: '1993-02-04',
      formPlacement: 'vergleichsrechner',
      sterbegeldSumme: 8000,
      akzeptierteWartezeitMonate: 0,
      interesse: 'Geburtsjahr 1961 (65 Jahre), 8.000 €',
    })
    expect(hits.map(h => h.code).sort()).toEqual([
      'born_after_1990',
      'vergleich_defaults_unchanged',
    ])
  })

  it('collectSpamSignals flags Silke (defaults only, birth 1984)', () => {
    const hits = collectSpamSignals({
      nowYear: 2026,
      geburtsdatum: '1984-10-03',
      formPlacement: 'vergleichsrechner',
      sterbegeldSumme: 8000,
      akzeptierteWartezeitMonate: 0,
      interesse:
        'Beratungsanfrage für die Sterbegeld24Plus. Geburtsjahr 1961 (65 Jahre), 8.000 €. Bitte um persönlichen Vergleich aller Anbieter.',
    })
    expect(hits.map(h => h.code)).toEqual(['vergleich_defaults_unchanged'])
  })
})
