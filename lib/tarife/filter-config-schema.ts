/**
 * Filter-Achsen-Schema für VergleichsRechner und Tarif-Editor.
 *
 * Eine FilterAxis beschreibt eine optionale Strukturachse, die zusätzlich zu
 * Geburtsjahr+Summe filtert. Beispiele:
 *   - Sterbegeld: wartezeit_monate (aus besonderheiten jsonb, Filter „maximal akzeptiert")
 *   - BU: berufsklasse (aus eigener Spalte, Filter „exakt")
 *   - Pflege: pflegegrad_ab (aus besonderheiten jsonb, Filter „minimal")
 *
 * Pro Produkttyp werden die Achsen in `produkt_typen.filter_axes` (jsonb)
 * konfiguriert und vom VergleichsRechner sowie vom Tarif-Editor gelesen.
 */

export type FilterAxisSource = 'besonderheiten' | 'column'
export type FilterAxisType = 'enum_max' | 'enum_min' | 'enum_exact'

export type FilterAxisValue = string | number | null

export interface FilterAxisOption {
  value: FilterAxisValue
  label: string
}

export interface FilterAxis {
  /** Datenfeld-Key — bei `besonderheiten` der jsonb-Schlüssel, bei `column`
   *  der tarife-Spaltenname. */
  key: string
  /** UI-Label für den Filter-Select. */
  label: string
  /** Wo liegt der Wert physisch in der `tarife`-Tabelle. */
  source: FilterAxisSource
  /** Filter-Operator:
   *   - `enum_max`: tarife.<key> <= ausgewählter Wert (z. B. Wartezeit max. 12 Monate)
   *   - `enum_min`: tarife.<key> >= ausgewählter Wert
   *   - `enum_exact`: tarife.<key> = ausgewählter Wert
   *  `null` als Wert bedeutet „kein Filter angewendet" (Egal-Option). */
  type: FilterAxisType
  /** Auswählbare Optionen im Frontend-Select. */
  options: FilterAxisOption[]
  /** Standard-Auswahl beim ersten Render. `null` = „Egal". */
  default_value?: FilterAxisValue
  /** Soll die Achse auch als zusätzliche Spalte in der Vergleichs-Tabelle
   *  angezeigt werden? Sinnvoll für Wartezeit + Berufsklasse. */
  show_as_column: boolean
  /** Wenn gesetzt: der gewählte Wert wird beim Lead-Submit in `leads.<lead_field>`
   *  gespeichert + an Convexa gepusht. */
  lead_field?: string
}
