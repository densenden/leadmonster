'use server'

/**
 * Server-Actions für die produkt_typen-Tabelle (Versicherungsart-Editor).
 * Alle Mutationen prüfen Auth, validieren via Zod und invalidieren den
 * `produkt_typen`-Cache-Tag, damit getProduktConfigFromDb() frische Daten
 * liest.
 */
import { revalidatePath, revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { untyped } from '@/lib/supabase/untyped'
import { produktTypSchema, type ProduktTypInput } from '@/lib/validation/produkt-typen'
import type { ActionResult } from '@/lib/supabase/types'

async function requireAuth() {
  const supabase = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

function flattenZodErrors(err: import('zod').ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_root'
    if (!out[key]) out[key] = []
    out[key].push(issue.message)
  }
  return out
}

export async function createProduktTyp(input: unknown): Promise<ActionResult> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = produktTypSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = untyped(createAdminClient())
  const row = mapToDbRow(parsed.data)
  const { error } = await supabase.from('produkt_typen').insert(row)

  if (error) {
    if (error.code === '23505') {
      return { success: false, fieldErrors: { slug: ['Dieser Slug ist bereits vergeben.'] } }
    }
    return { success: false, error: `Datenbankfehler: ${error.message}` }
  }

  revalidateTag('produkt_typen')
  revalidatePath('/admin/produkt-typen')
  return { success: true }
}

export async function updateProduktTyp(
  slug: string,
  input: unknown,
): Promise<ActionResult> {
  if (!slug) return { success: false, error: 'Ungültiger Slug' }

  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = produktTypSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, fieldErrors: flattenZodErrors(parsed.error) }
  }

  // Slug-Änderung wäre eine FK-Cascade-Operation auf produkte.typ — lassen wir
  // bewusst zu (FK ist mit ON UPDATE CASCADE definiert), die Action akzeptiert
  // den neuen Slug aus dem Input.
  const supabase = untyped(createAdminClient())
  const row = mapToDbRow(parsed.data)
  const { error } = await supabase
    .from('produkt_typen')
    .update(row)
    .eq('slug', slug)

  if (error) {
    return { success: false, error: `Datenbankfehler: ${error.message}` }
  }

  revalidateTag('produkt_typen')
  revalidatePath('/admin/produkt-typen')
  revalidatePath(`/admin/produkt-typen/${parsed.data.slug}`)
  return { success: true }
}

export async function archiveProduktTyp(slug: string): Promise<ActionResult> {
  if (!slug) return { success: false, error: 'Ungültiger Slug' }

  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const supabase = untyped(createAdminClient())
  const { error } = await supabase
    .from('produkt_typen')
    .update({ active: false })
    .eq('slug', slug)

  if (error) {
    return { success: false, error: `Datenbankfehler: ${error.message}` }
  }

  revalidateTag('produkt_typen')
  revalidatePath('/admin/produkt-typen')
  return { success: true }
}

function mapToDbRow(input: ProduktTypInput) {
  return {
    slug: input.slug,
    name: input.name,
    summen: input.summen,
    default_summe: input.default_summe,
    default_age: input.default_age,
    min_age: input.min_age,
    max_age: input.max_age,
    summe_label: input.summe_label,
    beitrag_label: input.beitrag_label,
    summe_suffix: input.summe_suffix,
    einheit: input.einheit,
    filter_axes: input.filter_axes,
    image_brand_look: input.image_brand_look ?? null,
    image_typ_scenes: input.image_typ_scenes ?? null,
    wissensfundus_label: input.wissensfundus_label,
    active: input.active,
  }
}
