// Zod validation schema for Wissensfundus (knowledge base) articles.
// Used for both server-side enforcement in server actions and
// client-side UX mirroring in WissensfundusForm.
import { z } from 'zod'

export const wissensfundusSchema = z.object({
  // Restricted to the five supported insurance knowledge categories.
  kategorie: z.enum(['sterbegeld', 'pflege', 'leben', 'unfall', 'allgemein']),

  // Short descriptive label; enforces a meaningful, non-trivial title.
  thema: z.string().min(3, 'Thema muss mindestens 3 Zeichen lang sein.').max(120, 'Thema darf maximal 120 Zeichen lang sein.'),

  // Main article body; must contain substantive content.
  inhalt: z.string().min(20, 'Inhalt muss mindestens 20 Zeichen lang sein.'),

  // Tags arrive as a pre-split string array; empty strings must be filtered by the caller.
  tags: z
    .array(z.string().min(1, 'Tags dürfen nicht leer sein.'))
    .max(10, 'Maximal 10 Tags erlaubt.'),
})

// Inferred TypeScript type matching the validated shape; used in server actions and generators.
export type WissensfundusSchema = z.infer<typeof wissensfundusSchema>
