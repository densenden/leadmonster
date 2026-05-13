// Discriminated union section types for Ratgeber (guide article) content.
// These map directly to the rendering components in RatgeberRenderer.
// The `type` field is the discriminant across all five variants.

/** Opening paragraph — AEO-optimised lead text giving a direct answer in the first sentence.
 *  Optional cover image is rendered prominently above the article body. */
export interface IntroSection {
  type: 'intro'
  text: string
  /** Hero-Cover-Bild des Ratgebers — automatisch nach Generierung angelegt
   *  (siehe POST /api/admin/produkte/[id]/ratgeber/[slug]/cover-image). */
  image_url?: string | null
  image_alt?: string | null
}

/** H2 section with one or more body paragraphs. Paragraphs may include H3 sub-headings. */
export interface BodySection {
  type: 'body'
  heading: string
  paragraphs: string[]
}

/** Numbered how-to step list. Rendered as an ordered list with large numbered markers. */
export interface StepsSection {
  type: 'steps'
  heading: string
  items: Array<{
    number: number
    title: string
    description: string
  }>
}

/** Lead form call-to-action block. Rendered as a LeadForm with a pre-set intentTag. */
export interface CtaSection {
  type: 'cta'
  headline: string
  cta_text: string
  cta_anchor: string
}

/** Card row of 2-3 sibling article links at the end of the article. */
export interface RelatedSection {
  type: 'related'
  articles: Array<{
    slug: string
    title: string
  }>
}

/** Bild + Text nebeneinander — bricht lange Textstrecken auf und gibt
 *  visuelle Atempausen. image_side schaltet die Anordnung um. */
export interface ImageTextSection {
  type: 'image_text'
  image_url: string
  image_alt: string
  image_side?: 'left' | 'right'
  heading?: string
  /** Markdown-Absätze (per renderMarkdown gerendert, [Link](/wissen/…) erlaubt). */
  body: string
}

/** Pull-Quote für emotionale Verankerung im Artikel. */
export interface QuoteSection {
  type: 'quote'
  quote: string
  author?: string
  author_role?: string
}

/** Info-/Warn-/Tipp-Kasten — verlinkt typischerweise zum Wissensfundus. */
export interface InfoBoxSection {
  type: 'info_box'
  variant?: 'info' | 'warning' | 'tip'
  heading: string
  body: string
  cta_label?: string
  cta_href?: string
}

/** Union aller Ratgeber-Section-Varianten. */
export type RatgeberSection =
  | IntroSection
  | BodySection
  | StepsSection
  | CtaSection
  | RelatedSection
  | ImageTextSection
  | QuoteSection
  | InfoBoxSection

/** Top-level content shape stored in generierter_content.content for ratgeber rows. */
export interface RatgeberContent {
  sections: RatgeberSection[]
}

/** Typed representation of a generierter_content row fetched for a ratgeber article.
 *  Fields are a subset of the full table row — only what the public pages need. */
export interface GenerierterContentRow {
  id: string
  produkt_id: string
  page_type: string
  slug: string | null
  title: string | null
  meta_title: string | null
  meta_desc: string | null
  content: RatgeberContent | null
  schema_markup: Record<string, unknown> | null
  status: 'entwurf' | 'review' | 'publiziert'
  generated_at: string
  published_at: string | null
  autor_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  next_review_at: string | null
}
