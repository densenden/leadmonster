/**
 * Zod-Validation für tarife-Rows (VergleichsRechner-Editor).
 */
import { z } from 'zod'

export const tarifSchema = z
  .object({
    id: z.string().uuid().optional(),
    produkt_id: z.string().uuid(),
    anbieter_name: z.string().min(1).max(100),
    tarif_name: z
      .string()
      .max(100)
      .nullable()
      .optional()
      .transform(v => (v ? v.trim() : null) || null),
    alter_von: z.coerce.number().int().min(0).max(120),
    alter_bis: z.coerce.number().int().min(0).max(120),
    summe: z.coerce.number().int().positive(),
    beitrag_low: z.coerce.number().nonnegative(),
    beitrag_high: z.coerce.number().nonnegative(),
    einheit: z.enum(['eur_summe', 'eur_monat']),
    berufsklasse: z
      .string()
      .max(20)
      .nullable()
      .optional()
      .transform(v => (v ? v.trim() : null) || null),
    besonderheiten: z.record(z.string(), z.unknown()).default({}),
  })
  .refine(d => d.alter_von <= d.alter_bis, {
    message: 'alter_von muss <= alter_bis sein',
    path: ['alter_bis'],
  })
  .refine(d => d.beitrag_low <= d.beitrag_high, {
    message: 'beitrag_low muss <= beitrag_high sein',
    path: ['beitrag_high'],
  })

export type TarifInput = z.infer<typeof tarifSchema>
