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
 */
export interface ConvexaLeadPayload {
  // Standard-Felder aus der Doku
  Email: string
  FirstName?: string
  LastName?: string

  // Erweiterungen — die Doku stellt frei, weitere Felder mitzusenden.
  // Convexa zeigt sie als Custom-Felder im Lead-Datensatz.
  Phone?: string
  Interest?: string                // Freitext aus dem Formular (interesse)
  Product?: string                 // Produktname (z. B. "Sterbegeld24Plus")
  ProductSlug?: string
  ProductType?: string
  Zielgruppe?: string
  Intent?: string                  // sicherheit | preis | sofortschutz
  GewuenschterAnbieter?: string
  SourceUrl?: string
  UtmSource?: string
  UtmMedium?: string
  UtmCampaign?: string
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
