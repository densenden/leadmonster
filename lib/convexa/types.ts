/**
 * Convexa CRM Datenmodell — offizielle Spec, Stand 2026-04-30.
 *
 * Quelle: PDF "Einspielung von Leaddaten" der convexa.app.
 * Endpoint: POST https://api.convexa.app/submissions/{Formular-Token}
 * Auth: Token wird ALS PFAD-PARAMETER in der URL übergeben — kein Bearer-Header.
 * Felder: PascalCase. FirstName / LastName / Email / Interest sind die in
 *   der Doku genannten "Standard"-Felder; weitere Lead-relevante Felder
 *   können beliebig mitgesendet werden ("Sie können alle Lead-relevanten
 *   Felder mitsenden").
 */

/**
 * Payload, der an Convexa gesendet wird. PascalCase ist Pflicht für die
 * dokumentierten Standard-Felder; eigene Custom-Felder fügen wir mit dem
 * gleichen Stil an, damit das Convexa-Backend ein konsistentes Mapping kann.
 *
 * Every field is always sent (empty string when unknown) so Convexa sees one
 * stable form schema regardless of which page embedded the LeadForm.
 */
export interface ConvexaLeadPayload {
  // Standard-Felder aus der Doku
  Email: string
  FirstName: string
  LastName: string
  Phone: string
  Interest: string

  // Produkt + Routing
  Product: string
  ProductSlug: string
  ProductType: string
  Zielgruppe: string
  Intent: string
  GewuenschterAnbieter: string

  // VergleichsRechner-Filter (Migration 20260504000000)
  AkzeptierteWartezeitMonate: string
  Berufsklasse: string

  // Lead-Kontakt-Felder für „blinde" Angebotsversendung (Migration 20260514000000)
  Birthdate: string
  Street: string
  Zip: string
  City: string
  /** Combined "Straße, PLZ Ort" — easier Convexa form mapping than three fields. */
  Address: string
  InsuredAmount: string

  /** Human-readable waiting period, e.g. "12 Monate" (Migration 20260514000000). */
  GewuenschteWartezeit: string

  /** Monthly premium from calculator (Migration 20260706000000). */
  MonatsbeitragEur: string

  /** JSON-serialisierte Restfelder aus filter_kontext (jsonb), `{}` when empty. */
  FilterKontext: string

  // Tracking
  SourceUrl: string
  UtmSource: string
  UtmMedium: string
  UtmCampaign: string

  /** Stable schema id — same value for every submission. */
  FormVersion: string
  /** Integration source — always LeadMonster. */
  LeadSource: string
  /** Page context (hauptseite, tarifrechner, …) — empty when unknown. */
  FormPlacement: string
}

/**
 * Convexa antwortet mit reinem 200 OK ohne JSON-Body laut Doku.
 * Wir generieren intern eine synthetische ID aus Datum+Zufall, damit der
 * convexa_lead_id-Index in unserer DB nicht NULL bleibt — die echte
 * Lead-Identität liegt bei Convexa.
 */
export interface ConvexaLeadResponse {
  id: string
  status: 'created'
  http_status: number
}

export interface ConvexaError {
  code: 'CONVEXA_NOT_CONFIGURED' | 'CONVEXA_INVALID_TOKEN' | 'CONVEXA_BAD_REQUEST' | 'CONVEXA_HTTP_ERROR' | 'CONVEXA_NETWORK_ERROR'
  message: string
  http_status?: number
}
