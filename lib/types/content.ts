// Discriminated union types for the content sections stored in generierter_content.content.
// Each variant maps directly to a section component. The `type` field is the discriminant.

export interface HeroSection {
  type: 'hero'
  headline: string
  subline: string
  cta_text: string
  cta_anchor: string
  image_url?: string | null
  image_alt?: string | null
}

export interface FeaturesSection {
  type: 'features'
  items: Array<{ icon: string; title: string; text: string }>
}

export interface TrustSection {
  type: 'trust'
  stat_items: Array<{ value: string; label: string }>
}

export interface FaqSection {
  type: 'faq'
  items: Array<{ frage: string; antwort: string }>
}

export interface LeadFormSection {
  type: 'lead_form'
  headline?: string
  subline?: string
}

export interface LegalTextSection {
  type: 'legal_text'
  blocks: Array<{ heading: string; body: string }>
}

export interface VergleichsrechnerSection {
  type: 'vergleichsrechner'
  headline: string
  intro: string
  input_hint?: string
  cta_label?: string
  anbieter_count_hint?: number
}

export type ContentSection =
  | HeroSection
  | FeaturesSection
  | TrustSection
  | FaqSection
  | LeadFormSection
  | LegalTextSection
  | VergleichsrechnerSection
