// Zod-Schema für Autoren-Profile (`redaktion`-Tabelle).
// Wird in Server-Actions UND im Client-Form geprüft.
import { z } from 'zod'

export const EXPERTISE_OPTIONS = [
  'sterbegeld',
  'pflege',
  'leben',
  'bu',
  'unfall',
  'bkv',
  'handwerker',
  'allgemein',
] as const

export const redaktionSchema = z.object({
  slug: z.string()
    .min(2, 'Slug muss mindestens 2 Zeichen lang sein.')
    .max(80, 'Slug zu lang.')
    .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestrich enthalten.'),
  vorname: z.string().min(1, 'Vorname ist Pflicht.').max(60),
  nachname: z.string().min(1, 'Nachname ist Pflicht.').max(60),
  titel: z.string().max(60).optional().nullable(),
  rolle: z.string().min(3, 'Rolle ist Pflicht.').max(120),
  kurz_bio: z.string()
    .min(50, 'Kurz-Bio sollte mindestens 50 Zeichen lang sein.')
    .max(500, 'Kurz-Bio darf maximal 500 Zeichen lang sein.'),
  lang_bio_md: z.string().min(100, 'Lang-Bio sollte mindestens 100 Zeichen lang sein.'),
  expertise: z.array(z.enum(EXPERTISE_OPTIONS)).max(8),
  qualifikationen: z.array(z.string().min(1)).max(20),
  vermittlerregister_nr: z.string().max(60).optional().nullable(),
  ihk_kammer: z.string().max(120).optional().nullable(),
  paragraph_34d: z.string().max(120).optional().nullable(),
  jahre_erfahrung: z.number().int().min(0).max(80).optional().nullable(),
  email: z.string().email('Ungültige E-Mail.').optional().nullable().or(z.literal('')),
  telefon: z.string().max(40).optional().nullable(),
  linkedin_url: z.string().url('Ungültige URL.').optional().nullable().or(z.literal('')),
  xing_url: z.string().url('Ungültige URL.').optional().nullable().or(z.literal('')),
  website_url: z.string().url('Ungültige URL.').optional().nullable().or(z.literal('')),
  foto_alt: z.string().max(200).optional().nullable(),
  public: z.boolean(),
})

export type RedaktionSchema = z.infer<typeof redaktionSchema>

// Slug aus Vorname + Nachname generieren (für Auto-Fill in der Form).
export function slugifyName(vorname: string, nachname: string): string {
  return `${vorname}-${nachname}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
