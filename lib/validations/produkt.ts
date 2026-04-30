// Zod validation schemas for the Produkt create and update flows.
// Used in the API route handler for server-side enforcement.
// The inferred TypeScript types are used downstream in the form component.
// NOTE: Zod v4 requires two-argument z.record(keyType, valueType) for string records.
import { z } from 'zod'

export const produktSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  // Includes 'bu' (Berufsunfähigkeit) per migration 20260429000000_convexa_blog_tarife_bu.sql
  typ: z.enum(['sterbegeld', 'pflege', 'leben', 'unfall', 'bu']),
  // Includes 'review' (intermediate state between entwurf and publiziert)
  status: z.enum(['entwurf', 'review', 'aktiv', 'archiviert']).optional(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  zielgruppe: z.array(z.string()).optional(),
  fokus: z.enum(['sicherheit', 'preis', 'sofortschutz']).optional(),
  anbieter: z.array(z.string().min(1)).optional(),
  argumente: z.record(z.string(), z.string()).optional(),
})

// Extends the base schema with a required id field for PATCH requests.
export const produktUpdateSchema = produktSchema.extend({
  id: z.string().uuid(),
})

// Inferred TypeScript type for create payloads — used in the form component.
export type ProduktFormValues = z.infer<typeof produktSchema>
