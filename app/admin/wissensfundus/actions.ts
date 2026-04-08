'use server'

// Server actions for Wissensfundus CRUD operations.
// All mutations validate the Supabase session first to prevent direct POST attacks.
// Uses the service-role client exclusively — never the anon/browser client.
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/supabase/types'
import { wissensfundusSchema } from '@/lib/validation/wissensfundus'

// Verify the calling user is authenticated via a server-side session check.
// Returns the user object or null if no valid session exists.
async function requireAuth() {
  const supabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Parse tags from a comma-separated string into a filtered string array.
function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

// Create a new wissensfundus article.
// Validates the session and all fields before inserting into the DB.
export async function createArtikel(formData: FormData): Promise<ActionResult> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const rawTags = parseTags((formData.get('tags') as string) ?? '')

  const parsed = wissensfundusSchema.safeParse({
    kategorie: formData.get('kategorie'),
    thema: formData.get('thema'),
    inhalt: formData.get('inhalt'),
    tags: rawTags,
  })

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('wissensfundus').insert(parsed.data)
  if (error) return { success: false, error: 'Datenbankfehler beim Erstellen' }

  revalidatePath('/admin/wissensfundus')
  return { success: true }
}

// Update an existing wissensfundus article by id.
// Validates the session, id, and all fields before updating.
export async function updateArtikel(id: string, formData: FormData): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }

  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const rawTags = parseTags((formData.get('tags') as string) ?? '')

  const parsed = wissensfundusSchema.safeParse({
    kategorie: formData.get('kategorie'),
    thema: formData.get('thema'),
    inhalt: formData.get('inhalt'),
    tags: rawTags,
  })

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('wissensfundus')
    .update(parsed.data)
    .eq('id', id)

  if (error) return { success: false, error: 'Datenbankfehler beim Aktualisieren' }

  revalidatePath('/admin/wissensfundus')
  return { success: true }
}

// Delete a wissensfundus article by id.
// Validates the session and id before executing the deletion.
export async function deleteArtikel(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }

  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('wissensfundus').delete().eq('id', id)
  if (error) return { success: false, error: 'Datenbankfehler beim Löschen' }

  revalidatePath('/admin/wissensfundus')
  return { success: true }
}
