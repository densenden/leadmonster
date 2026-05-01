import { z } from 'zod'

export const TRUST_TYPES = [
  'pressezitat',
  'siegel',
  'kunden_review',
  'partner_logo',
  'zahl',
  'auszeichnung',
  'verband',
] as const

export const TRUST_TYPE_LABELS: Record<typeof TRUST_TYPES[number], string> = {
  pressezitat: 'Pressezitat',
  siegel: 'Siegel',
  kunden_review: 'Kundenstimme',
  partner_logo: 'Partner-Logo',
  zahl: 'Trust-Zahl',
  auszeichnung: 'Auszeichnung',
  verband: 'Verbandszugehörigkeit',
}

export const trustSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestrich.'),
  typ: z.enum(TRUST_TYPES),
  titel: z.string().min(2).max(160),
  body: z.string().max(1500).optional().nullable(),
  bild_url: z.string().url('Ungültige URL.').optional().nullable().or(z.literal('')),
  bild_alt: z.string().max(200).optional().nullable(),
  quelle_url: z.string().url('Ungültige URL.').optional().nullable().or(z.literal('')),
  quelle_name: z.string().max(120).optional().nullable(),
  jahr: z.number().int().min(1900).max(2100).optional().nullable(),
  score: z.string().max(40).optional().nullable(),
  autor_name: z.string().max(120).optional().nullable(),
  autor_alter: z.string().max(40).optional().nullable(),
  produkt_id: z.string().uuid().optional().nullable().or(z.literal('')),
  reihenfolge: z.number().int().min(0).max(9999),
  aktiv: z.boolean(),
  belegt_durch: z.string().max(400).optional().nullable(),
})

export type TrustSchema = z.infer<typeof trustSchema>
