/**
 * Async DB-Reader für `produkt_typen` — server-only, getrennt von
 * `lib/tarife/produkt-config.ts`, damit Client-Components (z. B.
 * VergleichsRechner) den Sync-Reader importieren können, ohne den
 * Server-Code (createAdminClient, next/headers) in den Client-Bundle
 * zu ziehen.
 *
 * Cache-Invalidation: `revalidateTag('produkt_typen')` in Admin-Actions
 * nach Insert/Update/Delete in der `produkt_typen`-Tabelle.
 */
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { untyped } from '@/lib/supabase/untyped'
import type { FilterAxis } from './filter-config-schema'
import {
  type ProduktVergleichConfig,
  PRODUKT_VERGLEICH_CONFIG,
  getProduktConfig,
  FALLBACK,
} from './produkt-config'

// ---------------------------------------------------------------------------
// getProduktConfigFromDb — Lookup pro Slug mit 1h-Cache
// ---------------------------------------------------------------------------

interface ProduktTypRow {
  slug: string
  name: string
  summen: number[]
  default_summe: number
  default_age: number
  min_age: number
  max_age: number
  summe_label: string
  beitrag_label: string
  summe_suffix: string
  einheit: string
  filter_axes: FilterAxis[] | null
}

async function loadProduktTypFromDb(typ: string): Promise<ProduktVergleichConfig | null> {
  try {
    // Tabelle `produkt_typen` (Migration 20260504000000) ist im generierten
    // Supabase-Type noch nicht enthalten — `untyped()` umgeht das bis zum
    // nächsten `gen types`-Run.
    const supabase = untyped(createAdminClient())
    const { data, error } = await supabase
      .from('produkt_typen')
      .select(
        'slug, name, summen, default_summe, default_age, min_age, max_age, ' +
          'summe_label, beitrag_label, summe_suffix, einheit, filter_axes',
      )
      .eq('slug', typ)
      .eq('active', true)
      .maybeSingle()

    if (error || !data) return null

    const row = data as unknown as ProduktTypRow
    const summen = Array.isArray(row.summen) ? row.summen.map(Number) : []
    if (summen.length === 0) return null

    return {
      summen,
      default_summe: Number(row.default_summe),
      default_age: Number(row.default_age),
      min_age: Number(row.min_age),
      max_age: Number(row.max_age),
      summe_label: row.summe_label,
      beitrag_label: row.beitrag_label,
      summe_suffix: row.summe_suffix,
      produkt_label: row.name,
      filter_axes: Array.isArray(row.filter_axes) ? row.filter_axes : [],
    }
  } catch {
    return null
  }
}

const cachedLoadProduktTyp = unstable_cache(
  async (typ: string) => loadProduktTypFromDb(typ),
  ['produkt-typen-config'],
  { tags: ['produkt_typen'], revalidate: 3600 },
)

/** Async-Lookup, liest aus `produkt_typen`-Tabelle mit 1h-Cache + Tag.
 *  Fällt bei DB-Fehler oder leerem Result auf den Sync-Default zurück.
 *  Cache-Invalidation über `revalidateTag('produkt_typen')` in Admin-Actions. */
export async function getProduktConfigFromDb(
  typ: string | null | undefined,
): Promise<ProduktVergleichConfig> {
  if (!typ) return FALLBACK
  const fromDb = await cachedLoadProduktTyp(typ)
  if (fromDb) return fromDb
  return getProduktConfig(typ)
}

// ---------------------------------------------------------------------------
// listActiveProduktTypen — Liste aller aktiven Typen für Admin-Selects
// ---------------------------------------------------------------------------

export interface ProduktTypOption {
  slug: string
  name: string
  einheit: string
}

async function loadActiveTypenFromDb(): Promise<ProduktTypOption[] | null> {
  try {
    const supabase = untyped(createAdminClient())
    const { data, error } = await supabase
      .from('produkt_typen')
      .select('slug, name, einheit')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error || !data) return null
    return data as unknown as ProduktTypOption[]
  } catch {
    return null
  }
}

const cachedLoadActiveTypen = unstable_cache(
  async () => loadActiveTypenFromDb(),
  ['produkt-typen-aktive'],
  { tags: ['produkt_typen'], revalidate: 3600 },
)

/** Liefert alle aktiven Versicherungsarten für Admin-Dropdowns.
 *  Bei DB-Fehler greift ein Fallback aus den Code-Defaults. */
export async function listActiveProduktTypen(): Promise<ProduktTypOption[]> {
  const fromDb = await cachedLoadActiveTypen()
  if (fromDb && fromDb.length > 0) return fromDb
  return Object.entries(PRODUKT_VERGLEICH_CONFIG).map(([slug, cfg]) => ({
    slug,
    name: cfg.produkt_label,
    einheit: cfg.summe_suffix.includes('Monat') ? 'eur_monat' : 'eur_summe',
  }))
}
