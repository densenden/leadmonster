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

/** Neueste Blog-/Ratgeber-Beiträge als Vorschau-Cards.
 *  Inhalte werden vom Server zur Render-Zeit aus generierter_content +
 *  blog_posts gelesen, daher hier nur Texte + Limit konfigurierbar. */
export interface BlogPreviewSection {
  type: 'blog_preview'
  headline?: string
  subline?: string
  cta_href?: string
  cta_label?: string
  limit?: number
}

/** Bild + Text nebeneinander. Wechselseitig (image_side='left'|'right') schafft
 *  visuellen Rhythmus zwischen klassischen Sektionen. CTA optional. */
export interface ImageTextSplitSection {
  type: 'image_text_split'
  image_url: string
  image_alt: string
  /** 'left' = Bild links, Text rechts. 'right' = Bild rechts, Text links. */
  image_side?: 'left' | 'right'
  eyebrow?: string
  headline: string
  /** Body als Markdown-Absätze. Erlaubt [Link](/wissen/…) für Auto-Cross-Links. */
  body: string
  cta_label?: string
  cta_href?: string
  /** Optionaler Hintergrundton: 'white' (default) | 'soft' (#f8f8f8) | 'navy' (Navy + helle Schrift). */
  background?: 'white' | 'soft' | 'navy'
}

/** Pull-Quote / Testimonial. Visueller Anker zwischen Sektionen. */
export interface QuoteCalloutSection {
  type: 'quote_callout'
  quote: string
  author?: string
  author_role?: string
  author_image_url?: string
}

/** Große Zahlen mit Beschreibung — größerer Block als TrustBar.
 *  Eignet sich für "3 Säulen", Auswirkungs-Statistik, Vergleich. */
export interface StatsBlockSection {
  type: 'stats_block'
  headline?: string
  subline?: string
  items: Array<{
    value: string
    label: string
    /** Optional 1-Satz-Detail unter dem Label. */
    detail?: string
  }>
}

/** 3-5 Prozess-Schritte mit Nummerierung — z. B. "So funktioniert der Abschluss". */
export interface ProcessStepsSection {
  type: 'process_steps'
  headline: string
  subline?: string
  items: Array<{
    number: number
    title: string
    description: string
  }>
}

/** Wissens-Callout / Info-Box. Linkt typisch auf /wissen/<slug>. */
export interface InfoBoxSection {
  type: 'info_box'
  variant?: 'info' | 'warning' | 'tip'
  headline: string
  body: string
  cta_label?: string
  cta_href?: string
}

export type ContentSection =
  | HeroSection
  | FeaturesSection
  | TrustSection
  | FaqSection
  | LeadFormSection
  | LegalTextSection
  | VergleichsrechnerSection
  | BlogPreviewSection
  | ImageTextSplitSection
  | QuoteCalloutSection
  | StatsBlockSection
  | ProcessStepsSection
  | InfoBoxSection
