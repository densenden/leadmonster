/**
 * Spam signals for Sterbegeld / VergleichsRechner bot farms.
 *
 * Captcha-solving bots often:
 *  1. Leave VergleichsRechner on code defaults (age 65 → geburtsjahr, summe 8000)
 *  2. Put a young birth date (after 1990) into the LeadForm — odd for Sterbegeld
 *
 * Evidence 2026-08: fake leads all had interesse text
 *   "Geburtsjahr 1961 (65 Jahre), 8.000 €"
 * while LeadForm geburtsdatum was a different year.
 */
import { PRODUKT_VERGLEICH_CONFIG } from '@/lib/tarife/produkt-config'

export type SpamSignalCode = 'born_after_1990' | 'vergleich_defaults_unchanged'

export interface SpamSignalHit {
  code: SpamSignalCode
  detail: string
}

export interface SpamCheckInput {
  /** ISO YYYY-MM-DD from LeadForm. */
  geburtsdatum: string
  interesse?: string | null
  /** From filterContext / known lead column. */
  sterbegeldSumme?: number | null
  akzeptierteWartezeitMonate?: number | null
  /** e.g. vergleichsrechner — defaults rule only applies there. */
  formPlacement?: string | null
  /** Override "today" for tests. */
  nowYear?: number
}

/** Birth years strictly after 1990 (1991+) are a strong Sterbegeld fake signal. */
export const STERBEGELD_YOUNG_BIRTH_YEAR_AFTER = 1990

const STERBEGELD_DEFAULTS = PRODUKT_VERGLEICH_CONFIG.sterbegeld

export function birthYearFromIso(geburtsdatum: string): number | null {
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(geburtsdatum.trim())
  if (!m) return null
  const year = Number(m[1])
  return Number.isFinite(year) ? year : null
}

/** True when LeadForm birth year is 1991 or later. */
export function isBornAfter1990(geburtsdatum: string): boolean {
  const year = birthYearFromIso(geburtsdatum)
  if (year == null) return false
  return year > STERBEGELD_YOUNG_BIRTH_YEAR_AFTER
}

/**
 * VergleichsRechner defaults for Sterbegeld (code fallback):
 *   default_age 65 → geburtsjahr = CURRENT_YEAR - 65
 *   default_summe 8000
 *   wartezeit filter default null ("Egal") — often becomes 0 via cheapest tarif inherit
 *
 * Interesse prefill encodes the calculator geburtsjahr, e.g.
 *   "Geburtsjahr 1961 (65 Jahre), 8.000 €"
 */
export function hasUnchangedVergleichDefaults(input: {
  interesse?: string | null
  sterbegeldSumme?: number | null
  akzeptierteWartezeitMonate?: number | null
  formPlacement?: string | null
  nowYear?: number
}): boolean {
  const placement = (input.formPlacement ?? '').trim().toLowerCase()
  if (placement && placement !== 'vergleichsrechner') {
    return false
  }

  const nowYear = input.nowYear ?? new Date().getFullYear()
  const defaultGeburtsjahr = nowYear - STERBEGELD_DEFAULTS.default_age
  const defaultSumme = STERBEGELD_DEFAULTS.default_summe
  const defaultAge = STERBEGELD_DEFAULTS.default_age

  const summe = input.sterbegeldSumme
  if (summe !== defaultSumme) return false

  // Wartezeit left on "Egal" (null) or inherited 0 from first cheap tarif row.
  const wart = input.akzeptierteWartezeitMonate
  if (wart != null && wart !== 0) return false

  const interesse = input.interesse ?? ''
  if (!interesse) return false

  const hasDefaultYear =
    interesse.includes(`Geburtsjahr ${defaultGeburtsjahr}`) ||
    interesse.includes(`(${defaultAge} Jahre)`)
  if (!hasDefaultYear) return false

  // German formatted default summe in interesse (8.000 €) or plain 8000.
  const summeDe = defaultSumme.toLocaleString('de-DE')
  const hasDefaultSummeText =
    interesse.includes(`${summeDe} €`) ||
    interesse.includes(`${defaultSumme} €`) ||
    interesse.includes(String(defaultSumme))

  return hasDefaultSummeText
}

/**
 * Returns matching spam signals. Empty = ok for this layer.
 * Quarantine when ANY rule hits.
 */
export function collectSpamSignals(input: SpamCheckInput): SpamSignalHit[] {
  const hits: SpamSignalHit[] = []

  if (isBornAfter1990(input.geburtsdatum)) {
    const year = birthYearFromIso(input.geburtsdatum)
    hits.push({
      code: 'born_after_1990',
      detail: `geburtsdatum year ${year} is after ${STERBEGELD_YOUNG_BIRTH_YEAR_AFTER} (Sterbegeld fake signal)`,
    })
  }

  if (
    hasUnchangedVergleichDefaults({
      interesse: input.interesse,
      sterbegeldSumme: input.sterbegeldSumme,
      akzeptierteWartezeitMonate: input.akzeptierteWartezeitMonate,
      formPlacement: input.formPlacement,
      nowYear: input.nowYear,
    })
  ) {
    hits.push({
      code: 'vergleich_defaults_unchanged',
      detail:
        'VergleichsRechner left on defaults (summe 8000 + default age 65 in interesse + wartezeit Egal/0)',
    })
  }

  return hits
}
