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
import { untyped } from '@/lib/supabase/untyped'
import { getAgeBracket as legacyGetBracket, type ProduktTyp } from '@/lib/tarif-data'
import type { FilterAxis, FilterAxisValue } from './filter-config-schema'
import { countSchutzStars } from './schutz-stars'
import { resolveFilterAxes } from './resolve-filter-axes'

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
export interface VergleichFilterArgs {
  /** Bereits geladene Achsen-Config (wenn der Aufrufer sie schon hat). */
  axes?: FilterAxis[]
  /** Bereits typed Werte (passend zu axes). */
  values?: Record<string, FilterAxisValue>
  /** Roh-URL-Werte; lookupVergleichTarife lädt dann die Achsen selbst über
   *  produkt.typ → produkt_typen.filter_axes und parst die Werte gegen die
   *  Optionen. */
  rawValues?: Record<string, string>
}

export async function lookupVergleichTarife(
  produktId: string,
  age: number,
  summe: number,
  filters?: VergleichFilterArgs,
): Promise<AnbieterTarif[]> {
  // `berufsklasse` ist seit Migration 20260504000000 vorhanden, aber noch
  // nicht im generierten Supabase-Type — `untyped()` umgeht den Type-Mismatch.
  const supabase = untyped(createAdminClient())

  // Filter-Achsen + Werte auflösen, falls nur rawValues geliefert wurden.
  const { axes, values } = await resolveFilterArgs(produktId, filters)

  let query = supabase
    .from('tarife')
    .select('anbieter_name, tarif_name, beitrag_low, besonderheiten, berufsklasse')
    .eq('produkt_id', produktId)
    .eq('summe', summe)
    .lte('alter_von', age)
    .gte('alter_bis', age)
    .not('anbieter_name', 'is', null)

  // Filter-Achsen aus produkt_typen.filter_axes anwenden.
  // null = „Egal" → kein Filter.
  for (const axis of axes) {
    const v = values[axis.key]
    if (v === null || v === undefined) continue

    if (axis.source === 'column') {
      // Echte Spalte → direkte PostgREST-Operatoren funktionieren mit
      // korrektem Spaltentyp.
      if (axis.type === 'enum_exact') {
        query = query.eq(axis.key, v as string | number)
      } else if (axis.type === 'enum_max') {
        query = query.lte(axis.key, v as number)
      } else if (axis.type === 'enum_min') {
        query = query.gte(axis.key, v as number)
      }
    } else if (axis.key === 'wartezeit_monate' && axis.type === 'enum_max') {
      // Prefer dedicated column (Migration 20260706000001) — avoids PostgREST
      // jsonb quirks and stale filter_axes option lists missing new values (e.g. 24).
      query = query.lte('wartezeit_monate', v as number)
    } else {
      // source = 'besonderheiten' (jsonb).
      // PostgREST-Quirk: numerische Vergleiche auf `jsonb->key` sind
      // unzuverlässig (JSONB-Vergleich vs. erwarteter Zahlvergleich).
      // Robuster Weg: aus den vorab bekannten Optionen die zulässigen
      // Werte berechnen und mit `.in()` über den Text-Cast `->>` filtern.
      const path = `besonderheiten->>${axis.key}`
      const allowed = axis.options
        .map(o => o.value)
        .filter((o): o is string | number => o !== null)
        .filter(o => {
          if (axis.type === 'enum_exact') return o === v
          if (axis.type === 'enum_max') return Number(o) <= Number(v)
          if (axis.type === 'enum_min') return Number(o) >= Number(v)
          return false
        })

      if (allowed.length === 0) {
        // Kein erlaubter Wert → leere Resultmenge erzwingen.
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      } else {
        // PostgREST `.in()` mit text-Cast braucht String-Werte.
        query = query.in(path, allowed.map(String))
      }
    }
  }

  const { data, error } = await query.order('beitrag_low', { ascending: true })

  if (error || !data || data.length === 0) return []

  const normalized: AnbieterTarif[] = (data as unknown as RawAnbieterRow[]).map(row => ({
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
  return countSchutzStars(t.besonderheiten, { includeWartezeit: false, includeGp: false })
}

/**
 * Wenn `filters.rawValues` (URL-Strings) übergeben wurden, lädt diese Funktion
 * die Achsen-Config für das Produkt aus `produkt_typen` und parst die Strings
 * in die typisierten Werte (number / string / null), die dann auf die Query
 * angewendet werden.
 */
async function resolveFilterArgs(
  produktId: string,
  filters?: VergleichFilterArgs,
): Promise<{ axes: FilterAxis[]; values: Record<string, FilterAxisValue> }> {
  if (filters?.axes && filters.values) {
    return { axes: filters.axes, values: filters.values }
  }

  if (!filters?.rawValues || Object.keys(filters.rawValues).length === 0) {
    return { axes: [], values: {} }
  }

  // Produkt-Typ holen, dann Achsen-Config aus produkt_typen.
  try {
    const supabase = untyped(createAdminClient())
    const { data: produkt } = await supabase
      .from('produkte')
      .select('typ')
      .eq('id', produktId)
      .maybeSingle()
    if (!produkt?.typ) return { axes: [], values: {} }

    const { getProduktConfigFromDb } = await import('./produkt-config-db')
    const config = await getProduktConfigFromDb(produkt.typ as string)
    const axes = resolveFilterAxes(produkt.typ as string, config.filter_axes)

    const values: Record<string, FilterAxisValue> = {}
    for (const axis of axes) {
      const raw = filters.rawValues[axis.key]
      if (raw === undefined || raw === null || raw === '') continue
      // Versuche Match gegen die definierten Optionen — sicherste Quelle der Type-Info.
      const opt = axis.options.find(o => String(o.value ?? '') === raw)
      if (opt) {
        values[axis.key] = opt.value
      } else {
        // Fallback: numerisch parsen
        const num = Number(raw)
        values[axis.key] = !Number.isNaN(num) && raw.trim() !== '' ? num : raw
      }
    }
    return { axes, values }
  } catch {
    return { axes: [], values: {} }
  }
}
