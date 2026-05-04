'use server'

/**
 * Server-Actions für den Vergleichsrechner-Editor.
 * upsertTarif, deleteTarif — beide arbeiten gegen tarife (Anbietertarife,
 * d. h. anbieter_name IS NOT NULL).
 */
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { untyped } from '@/lib/supabase/untyped'
import { tarifSchema, type TarifInput } from '@/lib/validation/tarife'
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
    const k = issue.path.join('.') || '_root'
    out[k] = [...(out[k] ?? []), issue.message]
  }
  return out
}

export async function upsertTarif(input: unknown): Promise<ActionResult & { id?: string }> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = tarifSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, fieldErrors: flattenZodErrors(parsed.error) }
  }

  const supabase = untyped(createAdminClient())
  const row = mapToDbRow(parsed.data)

  if (parsed.data.id) {
    const { error } = await supabase.from('tarife').update(row).eq('id', parsed.data.id)
    if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }
    return refresh(parsed.data, { id: parsed.data.id })
  }

  // Create or upsert via UNIQUE-Constraint (produkt_id, anbieter_name, alter_von, summe, berufsklasse)
  const { data, error } = await supabase
    .from('tarife')
    .upsert(row, {
      onConflict: 'produkt_id,anbieter_name,alter_von,summe,berufsklasse',
    })
    .select('id')
    .maybeSingle()

  if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }
  return refresh(parsed.data, { id: data?.id })
}

export async function deleteTarif(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }

  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const supabase = untyped(createAdminClient())
  const { data: existing } = await supabase
    .from('tarife')
    .select('produkt_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('tarife').delete().eq('id', id)
  if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }

  if (existing?.produkt_id) {
    revalidatePath('/admin/tarife')
  }
  return { success: true }
}

function mapToDbRow(input: TarifInput) {
  return {
    produkt_id: input.produkt_id,
    anbieter_name: input.anbieter_name,
    tarif_name: input.tarif_name,
    alter_von: input.alter_von,
    alter_bis: input.alter_bis,
    summe: input.summe,
    beitrag_low: input.beitrag_low,
    beitrag_high: input.beitrag_high,
    einheit: input.einheit,
    berufsklasse: input.berufsklasse,
    besonderheiten: input.besonderheiten ?? {},
  }
}

function refresh(input: TarifInput, extra: { id?: string }): ActionResult & { id?: string } {
  revalidatePath('/admin/tarife')
  return { success: true, ...extra }
}
