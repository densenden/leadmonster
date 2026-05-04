import { z } from 'zod'

// Validation für Redirect-CRUD im Admin-UI.
// Pfade müssen mit `/` beginnen, keine Domains, kein Self-Redirect.

const pathSchema = z
  .string()
  .min(1, 'Pfad darf nicht leer sein')
  .max(500, 'Pfad zu lang (max 500 Zeichen)')
  .regex(/^\//, 'Pfad muss mit "/" beginnen')
  .refine(
    (v) => !/^https?:\/\//i.test(v),
    'Bitte ohne Domain — nur den Pfad ab "/"',
  )

export const redirectSchema = z
  .object({
    legacy_path: pathSchema,
    target_path: pathSchema,
    status: z.coerce.number().int().refine(
      (v) => v === 301 || v === 302,
      'Status muss 301 oder 302 sein',
    ),
    notiz: z.string().max(500).nullable().optional(),
  })
  .refine((d) => d.legacy_path !== d.target_path, {
    message: 'Quell- und Ziel-Pfad dürfen nicht identisch sein',
    path: ['target_path'],
  })

export type RedirectInput = z.infer<typeof redirectSchema>
