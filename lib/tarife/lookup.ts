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
