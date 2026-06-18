/**
 * Produkt-Typ-spezifische Konfiguration für den VergleichsRechner.
 *
 * Single source of truth ist die DB-Tabelle `produkt_typen` (Migration
 * 20260504000000_produkt_typen_und_filter.sql). Der Admin pflegt dort
 * Summen-Optionen, Labels, Filter-Achsen, Brand-Look usw.
 *
 * Diese Datei liefert NUR den sync Reader + Code-Default-Map. Der DB-Reader
 * lebt in lib/tarife/produkt-config-db.ts (server-only). Diese Trennung ist
 * notwendig, damit Client-Components (z. B. VergleichsRechner) den sync
 * Reader importieren können, ohne den Server-Code (createAdminClient,
 * next/headers) in den Client-Bundle zu ziehen.
 *
 * Server Components / Server Actions sollten den async Reader aus
 * produkt-config-db.ts benutzen, damit Admin-Änderungen in `produkt_typen`
 * ohne Deployment greifen. Tests und sync-only Konsumenten benutzen den
 * Code-Default aus dieser Datei.
 */

import type { FilterAxis } from './filter-config-schema'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Bekannte Default-Slugs — bleibt für rückwärtskompatible Type-Hints,
 *  zur Laufzeit ist jeder string ein gültiger Typ (FK auf produkt_typen). */
export type ProduktTyp = 'sterbegeld' | 'pflege' | 'leben' | 'unfall' | 'bu'

export interface ProduktVergleichConfig {
  summen: readonly number[]
  default_summe: number
  default_age: number
  min_age: number
  max_age: number
  summe_label: string
  beitrag_label: string
  summe_suffix: string
  produkt_label: string
  /** Pro Typ optionale Filter-Achsen (z. B. Wartezeit, Berufsklasse). */
  filter_axes: FilterAxis[]
}

// ---------------------------------------------------------------------------
// Code-Default-Map (Hard-Fallback)
// ---------------------------------------------------------------------------

export const PRODUKT_VERGLEICH_CONFIG: Record<ProduktTyp, ProduktVergleichConfig> = {
  sterbegeld: {
    summen: [5000, 8000, 10000, 12500, 15000],
    default_summe: 8000,
    default_age: 65,
    // Matches vergleich-tarife-seeds/sterbegeld.csv (geburtsjahr 1945–1970).
    min_age: 56,
    max_age: 81,
    summe_label: 'Wunschsumme',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€',
    produkt_label: 'Sterbegeldversicherung',
    filter_axes: [
      {
        key: 'wartezeit_monate',
        label: 'Akzeptable Wartezeit',
        source: 'besonderheiten',
        type: 'enum_max',
        options: [
          { value: null, label: 'Egal' },
          { value: 0, label: 'Keine Wartezeit (mit Gesundheitsfragen)' },
          { value: 12, label: 'bis 12 Monate' },
          { value: 36, label: 'bis 36 Monate' },
        ],
        default_value: null,
        show_as_column: true,
        lead_field: 'akzeptierte_wartezeit_monate',
      },
    ],
  },
  pflege: {
    summen: [500, 1000, 1500, 2000, 3000],
    default_summe: 1000,
    default_age: 55,
    min_age: 30,
    max_age: 75,
    summe_label: 'Gewünschte Pflegerente',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€ / Monat',
    produkt_label: 'Pflegezusatzversicherung',
    filter_axes: [],
  },
  leben: {
    summen: [50000, 100000, 200000, 350000, 500000],
    default_summe: 100000,
    default_age: 40,
    min_age: 18,
    max_age: 65,
    summe_label: 'Versicherungssumme',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€',
    produkt_label: 'Risikolebensversicherung',
    filter_axes: [],
  },
  bu: {
    summen: [1000, 1500, 2000, 2500, 3000],
    default_summe: 1500,
    default_age: 30,
    min_age: 18,
    max_age: 55,
    summe_label: 'Gewünschte BU-Rente',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€ / Monat',
    produkt_label: 'Berufsunfähigkeitsversicherung',
    filter_axes: [
      {
        key: 'berufsklasse',
        label: 'Berufsklasse',
        source: 'column',
        type: 'enum_exact',
        options: [
          { value: 'A', label: 'A — Akademisch / Bürotätigkeit' },
          { value: 'B', label: 'B — Leichte körperliche Arbeit' },
          { value: 'C', label: 'C — Mittelschwere körperliche Arbeit' },
          { value: 'D', label: 'D — Schwere körperliche Arbeit' },
        ],
        default_value: 'A',
        show_as_column: true,
        lead_field: 'berufsklasse',
      },
    ],
  },
  unfall: {
    summen: [50000, 100000, 200000, 300000, 500000],
    default_summe: 100000,
    default_age: 45,
    min_age: 18,
    max_age: 75,
    summe_label: 'Invaliditätssumme',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€',
    produkt_label: 'Unfallversicherung',
    filter_axes: [],
  },
}

export const FALLBACK: ProduktVergleichConfig = PRODUKT_VERGLEICH_CONFIG.sterbegeld

// ---------------------------------------------------------------------------
// Sync Reader — Code-Default Map
// ---------------------------------------------------------------------------

/** Sync-Lookup mit Sterbegeld-Fallback bei unbekanntem Typ.
 *  Geeignet für Tests, Client-Components, Storybook usw.
 *  Server-Code, das die DB-Konfiguration berücksichtigen will, nutzt
 *  `getProduktConfigFromDb` aus produkt-config-db.ts. */
export function getProduktConfig(typ: string | null | undefined): ProduktVergleichConfig {
  if (!typ) return FALLBACK
  return PRODUKT_VERGLEICH_CONFIG[typ as ProduktTyp] ?? FALLBACK
}
