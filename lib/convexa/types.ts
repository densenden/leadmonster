/**
 * Convexa CRM Datenmodell — Annahmen, bis offizielle API-Doku vorliegt.
 *
 * Quelle: docs/convexa-api-anfrage.md (E-Mail-Vorlage an Convexa-Support)
 *
 * Sobald wir die offizielle Spezifikation erhalten, müssen Felder hier ggf.
 * angepasst werden. Konvention: Snake-Case in API-Payloads.
 */

export interface ConvexaLeadPayload {
  // Pflicht — Annahmen aus üblichen CRM-APIs
  email: string

  // Optional, in der Regel akzeptiert
  first_name?: string
  last_name?: string
  phone?: string
  notes?: string                 // Freitext aus Lead-Form

  // Tagging (zur Workflow-Steuerung in Convexa)
  product_tag?: string           // z. B. "sterbegeld24plus"
  product_type?: string          // z. B. "sterbegeld"
  zielgruppe?: string            // z. B. "senioren_50plus"
  intent?: string                // "sicherheit" | "preis" | "sofortschutz"

  // Tracking-Kontext
  source_url?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string

  // Workspace / Mandant
  workspace_id?: string
}

export interface ConvexaLeadResponse {
  id: string                     // Convexa-Lead-ID, in unsere DB gespeichert
  status?: string
  created_at?: string
}

export interface ConvexaError {
  code: string
  message: string
  details?: unknown
}
