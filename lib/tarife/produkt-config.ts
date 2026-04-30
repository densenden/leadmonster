/**
 * Produkt-Typ-spezifische Konfiguration für den VergleichsRechner.
 *
 * Welche Summen sind sinnvoll? Heißt das Feld "Versicherungssumme" oder
 * "Monatsrente"? Wird der Beitrag mit "€/Monat" oder "€/Jahr" angezeigt?
 * Das hängt am Produkttyp — diese Datei ist die Single Source of Truth.
 */

export type ProduktTyp = 'sterbegeld' | 'pflege' | 'leben' | 'unfall' | 'bu'

export interface ProduktVergleichConfig {
  /** Auswählbare Summen / Renten in der UI. */
  summen: readonly number[]
  /** Default-Auswahl beim ersten Render. */
  default_summe: number
  /** Default-Alter für SSR-initialData. */
  default_age: number
  /** Min/Max-Alter im Geburtsjahr-Select. */
  min_age: number
  max_age: number
  /** Label für das Summen-Select-Feld. */
  summe_label: string
  /** Label für das Beitrags-Spalten-Heading in der Tabelle. */
  beitrag_label: string
  /** Suffix nach dem Summen-Wert (z. B. "€" oder "€ / Monat"). */
  summe_suffix: string
  /** Wording in Headline/Intro für die Section. */
  produkt_label: string
}

export const PRODUKT_VERGLEICH_CONFIG: Record<ProduktTyp, ProduktVergleichConfig> = {
  sterbegeld: {
    summen: [5000, 8000, 10000, 12500, 15000],
    default_summe: 8000,
    default_age: 65,
    min_age: 40,
    max_age: 86,
    summe_label: 'Wunschsumme',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€',
    produkt_label: 'Sterbegeldversicherung',
  },
  pflege: {
    // Monatliche Pflegerente
    summen: [500, 1000, 1500, 2000, 3000],
    default_summe: 1000,
    default_age: 55,
    min_age: 30,
    max_age: 75,
    summe_label: 'Gewünschte Pflegerente',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€ / Monat',
    produkt_label: 'Pflegezusatzversicherung',
  },
  leben: {
    // Versicherungssumme der Risikolebensversicherung
    summen: [50000, 100000, 200000, 350000, 500000],
    default_summe: 100000,
    default_age: 40,
    min_age: 18,
    max_age: 65,
    summe_label: 'Versicherungssumme',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€',
    produkt_label: 'Risikolebensversicherung',
  },
  bu: {
    // Monatliche BU-Rente
    summen: [1000, 1500, 2000, 2500, 3000],
    default_summe: 1500,
    default_age: 30,
    min_age: 18,
    max_age: 55,
    summe_label: 'Gewünschte BU-Rente',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€ / Monat',
    produkt_label: 'Berufsunfähigkeitsversicherung',
  },
  unfall: {
    // Invaliditätsgrundsumme (Progression dann separat)
    summen: [50000, 100000, 200000, 300000, 500000],
    default_summe: 100000,
    default_age: 45,
    min_age: 18,
    max_age: 75,
    summe_label: 'Invaliditätssumme',
    beitrag_label: 'Beitrag / Monat',
    summe_suffix: '€',
    produkt_label: 'Unfallversicherung',
  },
}

const FALLBACK: ProduktVergleichConfig = PRODUKT_VERGLEICH_CONFIG.sterbegeld

/** Sicherer Lookup mit Sterbegeld als Fallback bei unbekanntem Typ. */
export function getProduktConfig(typ: string | null | undefined): ProduktVergleichConfig {
  if (!typ) return FALLBACK
  return PRODUKT_VERGLEICH_CONFIG[typ as ProduktTyp] ?? FALLBACK
}
