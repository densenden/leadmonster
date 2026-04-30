/**
 * Tarif-Lookup aus der DB-Tabelle `tarife`.
 *
 * Ablöser für lib/tarif-data.ts (statische Konstanten). Solange die
 * DB-Tabelle leer ist, fällt die Funktion automatisch auf die
 * statischen Defaults zurück, damit keine Produktseite kaputt geht.
 *
 * Nutzung im TarifRechner-Component (Server-Wrapper) oder im Generator.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { getAgeBracket as legacyGetBracket, type ProduktTyp } from '@/lib/tarif-data'

export interface TarifBracketDb {
  alter_von: number
  alter_bis: number
  summe: number
  beitrag_low: number
  beitrag_high: number
  einheit: string
}

export interface PremiumRange {
  low: number
  high: number
}

/**
 * Schlägt einen Beitragskorridor in der `tarife`-Tabelle nach.
 * Liefert undefined, wenn kein Match — Aufrufer kann dann auf legacy zurückfallen.
 */
export async function lookupTarif(
  produktId: string,
  age: number,
  summe: number,
): Promise<PremiumRange | undefined> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tarife')
    .select('alter_von, alter_bis, summe, beitrag_low, beitrag_high')
    .eq('produkt_id', produktId)
    .eq('summe', summe)
    .lte('alter_von', age)
    .gte('alter_bis', age)
    .limit(1)
    .single()

  if (error || !data) return undefined
  return { low: Number(data.beitrag_low), high: Number(data.beitrag_high) }
}

/**
 * Convenience: nutzt zuerst die DB, fällt auf statische Daten zurück.
 * `produktTyp` wird nur für den Fallback benötigt.
 */
export async function lookupTarifWithFallback(
  args: { produktId: string; produktTyp: ProduktTyp; age: number; summe: number },
): Promise<PremiumRange | undefined> {
  const db = await lookupTarif(args.produktId, args.age, args.summe)
  if (db) return db
  return legacyGetBracket(args.produktTyp, args.age, args.summe)
}

// ---------------------------------------------------------------------------
// VergleichsRechner — Multi-Anbieter-Lookup
// ---------------------------------------------------------------------------

export type AnbieterBadge = 'guenstigster' | 'bester_schutz' | 'schnellster_schutz'

export interface AnbieterBesonderheiten {
  wartezeit_monate?: number
  gp?: boolean              // Gesundheitsprüfung
  doppelte_unfall?: boolean
  rueckholung?: boolean
  lebenslang?: boolean
  // Frei für zukünftige Felder — JSONB ist offen.
  [key: string]: unknown
}

export interface AnbieterTarif {
  anbieter_name: string
  tarif_name: string | null
  beitrag_eur: number
  besonderheiten: AnbieterBesonderheiten
  badges: AnbieterBadge[]
}

interface RawAnbieterRow {
  anbieter_name: string
  tarif_name: string | null
  beitrag_low: number | string
  besonderheiten: AnbieterBesonderheiten | null
}

/**
 * Liefert alle Anbietertarife für ein Produkt+Alter+Summe, sortiert nach
 * Beitrag aufsteigend (cheapest first), mit Badges für Vergleichs-UX.
 *
 * Badge-Logik (deterministisch):
 *  - `guenstigster`        → erste Zeile nach Sortierung
 *  - `schnellster_schutz`  → minimale `wartezeit_monate` (Ties: alle bekommen Badge)
 *  - `bester_schutz`       → maximaler Score aus rueckholung + doppelte_unfall + lebenslang (Ties: alle)
 *
 * Liefert leeren Array, wenn keine passenden Tarife vorhanden sind. Aufrufer
 * sollen das Footer-Disclaimer-UI entsprechend rendern.
 */
export async function lookupVergleichTarife(
  produktId: string,
  age: number,
  summe: number,
): Promise<AnbieterTarif[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tarife')
    .select('anbieter_name, tarif_name, beitrag_low, besonderheiten')
    .eq('produkt_id', produktId)
    .eq('summe', summe)
    .lte('alter_von', age)
    .gte('alter_bis', age)
    .not('anbieter_name', 'is', null)
    .order('beitrag_low', { ascending: true })

  if (error || !data || data.length === 0) return []

  const normalized: AnbieterTarif[] = (data as RawAnbieterRow[]).map(row => ({
    anbieter_name: row.anbieter_name,
    tarif_name: row.tarif_name,
    beitrag_eur: Number(row.beitrag_low),
    besonderheiten: row.besonderheiten ?? {},
    badges: [],
  }))

  return assignBadges(normalized)
}

/**
 * Vergibt Badges an die übergebenen Tarife (Mutation in-place der `badges`-Arrays).
 * Erwartet eine bereits nach `beitrag_eur` aufsteigend sortierte Liste.
 */
export function assignBadges(tarife: AnbieterTarif[]): AnbieterTarif[] {
  if (tarife.length === 0) return tarife

  // Günstigster: erste Zeile
  tarife[0].badges.push('guenstigster')

  // Schnellster Schutz: minimale wartezeit_monate (alle Ties)
  const wartezeiten = tarife
    .map(t => t.besonderheiten.wartezeit_monate)
    .filter((w): w is number => typeof w === 'number')
  if (wartezeiten.length > 0) {
    const min = Math.min(...wartezeiten)
    for (const t of tarife) {
      if (t.besonderheiten.wartezeit_monate === min) {
        t.badges.push('schnellster_schutz')
      }
    }
  }

  // Bester Schutz: maximaler Score aus rueckholung + doppelte_unfall + lebenslang
  const scores = tarife.map(scoreSchutz)
  const maxScore = Math.max(...scores)
  if (maxScore > 0) {
    for (let i = 0; i < tarife.length; i++) {
      if (scores[i] === maxScore) {
        tarife[i].badges.push('bester_schutz')
      }
    }
  }

  return tarife
}

function scoreSchutz(t: AnbieterTarif): number {
  const b = t.besonderheiten
  return (b.rueckholung ? 1 : 0) + (b.doppelte_unfall ? 1 : 0) + (b.lebenslang ? 1 : 0)
}
