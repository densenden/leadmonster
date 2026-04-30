// Zod validation schemas for all Claude output shapes.
// Every schema here is used to parse and validate the raw JSON returned
// by the Anthropic API before any DB write occurs.
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Section-level schemas — discriminated by the `type` field
// ---------------------------------------------------------------------------

export const HeroSectionSchema = z.object({
  type: z.literal('hero'),
  headline: z.string(),
  subline: z.string(),
  cta_text: z.string(),
  cta_anchor: z.string().default('#formular'),
})

export const FeaturesSectionSchema = z.object({
  type: z.literal('features'),
  items: z
    .array(z.object({ icon: z.string(), title: z.string(), text: z.string() }))
    .min(4)
    .max(6),
})

export const TrustSectionSchema = z.object({
  type: z.literal('trust'),
  stat_items: z.array(z.object({ value: z.string(), label: z.string() })).min(3).max(6),
})

export const FaqSectionSchema = z.object({
  type: z.literal('faq'),
  // Relaxed from exact length(10) so smaller LLMs that under-deliver by 1-2 don't fail the whole pipeline.
  items: z.array(z.object({ frage: z.string(), antwort: z.string() })).min(8).max(15),
})

export const VergleichSectionSchema = z.object({
  type: z.literal('vergleich'),
  anbieter: z.array(
    z.object({
      name: z.string(),
      wartezeit: z.string(),
      gesundheitsfragen: z.string(),
      garantierte_aufnahme: z.boolean(),
      beitrag_beispiel: z.string(),
      besonderheit: z.string(),
    }),
  ).min(3).max(10),
})

export const RatgeberSectionSchema = z.object({
  type: z.literal('ratgeber'),
  slug: z.string(),
  titel: z.string(),
  intro: z.string(),
  body_paragraphs: z.array(z.string()).min(4).max(6),
  cta_text: z.string(),
})

export const TarifSectionSchema = z.object({
  type: z.literal('tarif'),
  alters_stufen: z.array(
    z.object({
      von: z.number(),
      bis: z.number(),
      beitrag_ab: z.number(),
      beitrag_bis: z.number(),
    }),
  ),
  disclaimer: z.string().min(1),
})

// VergleichsRechner — wird programmatisch in den Generator injiziert (siehe
// lib/anthropic/generator.ts). Der LLM soll diese Section NICHT selbst erzeugen,
// das Schema steht hier nur, damit der Discriminated-Union-Parse nicht bricht,
// falls der LLM sich doch nicht an die Anweisung hält.
export const VergleichsrechnerSectionSchema = z.object({
  type: z.literal('vergleichsrechner'),
  headline: z.string(),
  intro: z.string(),
  input_hint: z.string().default('Geburtsjahr und Wunschsumme wählen'),
  cta_label: z.string().default('Anbieter anfragen'),
  anbieter_count_hint: z.number().int().optional(),
})

// Discriminated union of all section types — used to validate individual sections
// within any page response.
export const SectionUnionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  FeaturesSectionSchema,
  TrustSectionSchema,
  FaqSectionSchema,
  VergleichSectionSchema,
  RatgeberSectionSchema,
  TarifSectionSchema,
  VergleichsrechnerSectionSchema,
])

// TypeScript type derived from the union schema — use this in application code
// instead of hand-written interfaces so the schema remains the single source of truth.
export type SectionUnion = z.infer<typeof SectionUnionSchema>

// ---------------------------------------------------------------------------
// Page-response envelope schemas — each wraps sections + SEO fields
// ---------------------------------------------------------------------------

// Note: Zod v4 requires explicit key schema in z.record().
// z.record(z.string(), z.unknown()) is the v4-compatible form of z.record(z.unknown()).
// LLMs frequently exceed length limits by 5-15 chars. Clip via transform
// instead of rejecting — better UX than failing the whole pipeline because
// meta_title is 64 chars instead of 60.
const BaseResponseSchema = z.object({
  sections: z.array(SectionUnionSchema),
  meta_title: z.string().transform(s => s.slice(0, 60)),
  meta_desc: z.string().transform(s => s.slice(0, 160)),
  schema_markup: z.record(z.string(), z.unknown()),
})

export const HauptseiteResponseSchema = BaseResponseSchema
export const FaqResponseSchema = BaseResponseSchema
export const VergleichResponseSchema = BaseResponseSchema
export const TarifResponseSchema = BaseResponseSchema
export const RatgeberResponseSchema = BaseResponseSchema

// Map keyed by PageType — used in the generator to look up the correct schema
// for each page-type call without a switch statement.
export const PageResponseSchemas = {
  hauptseite: HauptseiteResponseSchema,
  faq: FaqResponseSchema,
  vergleich: VergleichResponseSchema,
  tarif: TarifResponseSchema,
  ratgeber: RatgeberResponseSchema,
} as const
