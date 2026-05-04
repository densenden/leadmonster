/**
 * Zod-Validation für die `produkt_typen`-Tabelle und die `filter_axes`-jsonb-
 * Struktur. Wird von Admin-Server-Actions und vom Versicherungsart-Editor
 * genutzt.
 */
import { z } from 'zod'

// FilterAxisOption: value darf string, number oder null sein.
export const filterAxisOptionSchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  label: z.string().min(1).max(100),
})

export const filterAxisSchema = z
  .object({
    key: z.string().min(1).max(60).regex(/^[a-z0-9_]+$/, 'snake_case-Slug erwartet'),
    label: z.string().min(1).max(100),
    source: z.enum(['besonderheiten', 'column']),
    type: z.enum(['enum_max', 'enum_min', 'enum_exact']),
    options: z.array(filterAxisOptionSchema).min(1).max(20),
    default_value: z.union([z.string(), z.number(), z.null()]).optional(),
    show_as_column: z.boolean(),
    lead_field: z
      .string()
      .max(60)
      .regex(/^[a-z0-9_]+$/, 'snake_case-Slug erwartet')
      .optional(),
  })
  // Wenn source='column', muss key in der Whitelist der erweiterbaren tarife-Spalten sein.
  .refine(
    a => a.source !== 'column' || ['berufsklasse'].includes(a.key),
    {
      message:
        'Spalten-basierte Achsen sind aktuell nur für `berufsklasse` erlaubt — neue Spalten brauchen eine Migration.',
      path: ['key'],
    },
  )

export const produktTypSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, 'Slug nur kleinbuchstaben, Zahlen, _ und -'),
  name: z.string().min(2).max(120),
  summen: z
    .array(z.number().int().positive())
    .min(1)
    .max(20)
    .refine(arr => arr.every((v, i) => i === 0 || arr[i - 1] < v), {
      message: 'Summen müssen aufsteigend sortiert sein.',
    }),
  default_summe: z.number().int().positive(),
  default_age: z.number().int().min(0).max(120),
  min_age: z.number().int().min(0).max(120),
  max_age: z.number().int().min(0).max(120),
  summe_label: z.string().min(1).max(60),
  beitrag_label: z.string().min(1).max(60),
  summe_suffix: z.string().min(1).max(20),
  einheit: z.enum(['eur_summe', 'eur_monat']),
  filter_axes: z.array(filterAxisSchema).max(5),
  image_brand_look: z
    .object({
      palette: z.string().min(1).max(300),
      lighting: z.string().min(1).max(300),
      motifs: z.string().min(1).max(500),
    })
    .nullable()
    .optional(),
  image_typ_scenes: z.array(z.string().min(1).max(500)).max(5).nullable().optional(),
  wissensfundus_label: z.string().min(1).max(60),
  active: z.boolean(),
})
.refine(d => d.min_age <= d.max_age, {
  message: 'min_age muss <= max_age sein.',
  path: ['max_age'],
})
.refine(d => d.summen.includes(d.default_summe), {
  message: 'default_summe muss eine der Summen-Optionen sein.',
  path: ['default_summe'],
})
.refine(d => d.default_age >= d.min_age && d.default_age <= d.max_age, {
  message: 'default_age muss zwischen min_age und max_age liegen.',
  path: ['default_age'],
})

export type ProduktTypInput = z.infer<typeof produktTypSchema>
export type FilterAxisInput = z.infer<typeof filterAxisSchema>
