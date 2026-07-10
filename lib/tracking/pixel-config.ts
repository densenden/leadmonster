// Meta Pixel — admin reference (server-safe, no window).

import { META_PIXEL_ID } from './meta-pixel'

export interface MetaPixelEventDoc {
  name: string
  type: 'standard'
  trigger: string
  adminHint: string
}

export interface MetaPixelAdminConfig {
  pixelId: string
  envVar: string
  consentCategory: 'marketing'
  eventsManagerUrl: string
  events: MetaPixelEventDoc[]
}

export interface MetaLeadEventPreview {
  event: 'Lead'
  note: string
  parameters: Record<string, string | number>
}

/** Static docs for admin “Meta Pixel” tab. */
export function getMetaPixelAdminConfig(): MetaPixelAdminConfig {
  return {
    pixelId: META_PIXEL_ID,
    envVar: 'NEXT_PUBLIC_META_PIXEL_ID',
    consentCategory: 'marketing',
    eventsManagerUrl: `https://business.facebook.com/events_manager2/list/pixel/${META_PIXEL_ID}`,
    events: [
      {
        name: 'PageView',
        type: 'standard',
        trigger: 'Cookie-Einwilligung Marketing + jeder Seitenwechsel',
        adminHint: 'Reichweite / Traffic — keine Conversion.',
      },
      {
        name: 'ViewContent',
        type: 'standard',
        trigger: 'VergleichsRechner: Tariftabelle mit ≥1 Zeile (einmal pro Besuch)',
        adminHint: 'Mitte des Funnels — Interesse am Produktvergleich.',
      },
      {
        name: 'Lead',
        type: 'standard',
        trigger: 'Erfolgreicher Lead-Form-Submit (HTTP 201, kein Honeypot)',
        adminHint: 'Conversion — Kampagnen-Optimierung & ROAS (value in EUR wenn Beitrag bekannt).',
      },
    ],
  }
}

/** Preview of the Lead event Meta would receive for this lead (if marketing cookies accepted). */
export function buildMetaLeadEventPreview(lead: {
  intent_tag: string | null
  zielgruppe_tag: string | null
  monatsbeitrag_eur: number | null
}): MetaLeadEventPreview {
  const contentName = lead.intent_tag ?? lead.zielgruppe_tag ?? 'anfrage'
  const parameters: Record<string, string | number> = {
    content_name: contentName,
  }
  if (lead.monatsbeitrag_eur != null && !Number.isNaN(Number(lead.monatsbeitrag_eur))) {
    parameters.value = Number(lead.monatsbeitrag_eur)
    parameters.currency = 'EUR'
  }
  return {
    event: 'Lead',
    note: 'Nur wenn der Besucher Marketing-Cookies akzeptiert hat und das Formular erfolgreich war.',
    parameters,
  }
}
