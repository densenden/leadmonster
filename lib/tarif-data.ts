// Static illustrative tariff data for the pseudo tariff calculator.
// All values are intentionally imprecise — they serve as orientation only.
// Real premium data must be obtained via a licensed insurer API or broker system.

// Union of all supported product types in the LeadMonster system.
export type ProduktTyp = 'sterbegeld' | 'pflege' | 'leben' | 'unfall'

// Monthly premium range in EUR (low and high are inclusive illustrative values).
export interface PremiumRange {
  low: number
  high: number
}

// Map of desired sum (in EUR) to monthly premium range.
// Keys are the five supported sum tiers: 5000, 7500, 10000, 12500, 15000.
export type SumMap = Record<number, PremiumRange>

// An age bracket mapping a contiguous age range to all five sum tiers.
export interface AgeBracket {
  minAge: number
  maxAge: number
  sums: SumMap
}

// Top-level data structure keyed by product type.
// Each product type maps to an ordered list of age brackets (ascending by minAge).
export type TarifData = Record<ProduktTyp, AgeBracket[]>

// ---------------------------------------------------------------------------
// Static data constant
// ---------------------------------------------------------------------------

// Sterbegeld (funeral expense insurance) illustrative monthly premiums in EUR.
// Values are plausible but intentionally rounded to avoid regulatory misrepresentation.
// Source: internal estimations based on publicly available market ranges (not live tariff data).
export const TARIF_DATA: TarifData = {
  sterbegeld: [
    {
      minAge: 40,
      maxAge: 49,
      sums: {
        5000:  { low:  8, high: 12 },
        7500:  { low: 12, high: 17 },
        10000: { low: 15, high: 22 },
        12500: { low: 19, high: 27 },
        15000: { low: 22, high: 32 },
      },
    },
    {
      minAge: 50,
      maxAge: 59,
      sums: {
        5000:  { low: 12, high: 17 },
        7500:  { low: 16, high: 22 },
        10000: { low: 18, high: 26 },
        12500: { low: 22, high: 31 },
        15000: { low: 26, high: 37 },
      },
    },
    {
      minAge: 60,
      maxAge: 69,
      sums: {
        5000:  { low: 18, high: 25 },
        7500:  { low: 26, high: 35 },
        10000: { low: 33, high: 45 },
        12500: { low: 41, high: 55 },
        15000: { low: 48, high: 66 },
      },
    },
    {
      minAge: 70,
      maxAge: 79,
      sums: {
        5000:  { low: 28, high:  38 },
        7500:  { low: 41, high:  55 },
        10000: { low: 53, high:  71 },
        12500: { low: 65, high:  87 },
        15000: { low: 77, high: 103 },
      },
    },
    {
      minAge: 80,
      maxAge: 85,
      sums: {
        5000:  { low:  45, high:  60 },
        7500:  { low:  66, high:  88 },
        10000: { low:  86, high: 115 },
        12500: { low: 106, high: 141 },
        15000: { low: 125, high: 167 },
      },
    },
  ],

  // TODO: populate when products are implemented
  pflege: [],

  // TODO: populate when products are implemented
  leben: [],

  // TODO: populate when products are implemented
  unfall: [],
}

// ---------------------------------------------------------------------------
// Helper function
// ---------------------------------------------------------------------------

/**
 * Looks up the illustrative monthly premium range for a given product type,
 * age, and desired sum. Returns undefined for out-of-range inputs so callers
 * can gracefully degrade without throwing.
 *
 * @param typ - The product type key (e.g. 'sterbegeld').
 * @param age - The applicant's age in years (integer).
 * @param sum - The desired payout sum in EUR (one of 5000 | 7500 | 10000 | 12500 | 15000).
 * @returns PremiumRange when a bracket and sum match; undefined otherwise.
 */
export function getAgeBracket(
  typ: ProduktTyp,
  age: number,
  sum: number,
): PremiumRange | undefined {
  const brackets = TARIF_DATA[typ]
  const bracket = brackets.find(b => age >= b.minAge && age <= b.maxAge)
  if (!bracket) return undefined
  return bracket.sums[sum]
}
