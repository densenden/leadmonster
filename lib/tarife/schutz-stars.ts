/**
 * Client-safe Schutz star scoring for VergleichsRechner.
 * Kept separate from lookup.ts because lookup imports Supabase server code.
 */

export interface SchutzBesonderheiten {
  wartezeit_monate?: number
  gp?: boolean
  doppelte_unfall?: boolean
  rueckholung?: boolean
  lebenslang?: boolean
  [key: string]: unknown
}

/** Max stars shown in VergleichsRechner Schutz column. */
export const SCHUTZ_STARS_MAX = 5

/** Deterministic 0–999 bucket for stable “50%” display rules (SSR-safe). */
function stableBucket(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h + seed.charCodeAt(i) * (i + 1)) % 1000
  }
  return h
}

function isIdealAnbieter(name: string): boolean {
  return name.toLowerCase().includes('ideal')
}

/**
 * Counts positive protection flags for star display in the comparison table.
 * Five slots: no waiting period, no health check, double payout on accident,
 * repatriation, lifelong payment option.
 */
export function countSchutzStars(
  b: SchutzBesonderheiten,
  opts: { includeWartezeit?: boolean; includeGp?: boolean } = {},
): number {
  const includeWartezeit = opts.includeWartezeit ?? true
  const includeGp = opts.includeGp ?? true
  let score = 0
  if (includeWartezeit && b.wartezeit_monate === 0) score++
  if (includeGp && b.gp === false) score++
  if (b.doppelte_unfall) score++
  if (b.rueckholung) score++
  if (b.lebenslang) score++
  return score
}

/**
 * Display score for the Schutz column — +1 vs raw score for better UX impression.
 * Ideal at raw 3 stars: 50% of rows show 5 stars (deterministic per anbieter+tarif).
 */
export function displaySchutzStars(
  anbieterName: string,
  b: SchutzBesonderheiten,
  tarifName?: string | null,
): number {
  const base = countSchutzStars(b)
  let display = Math.min(base + 1, SCHUTZ_STARS_MAX)

  if (isIdealAnbieter(anbieterName) && base === 3) {
    const seed = `${anbieterName}|${tarifName ?? ''}|${b.wartezeit_monate ?? ''}`
    display = stableBucket(seed) % 2 === 0 ? SCHUTZ_STARS_MAX : 4
  }

  return display
}
