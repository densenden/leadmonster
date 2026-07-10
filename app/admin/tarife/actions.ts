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
import { wartezeitMonateFromBesonderheiten } from '@/lib/tarife/wartezeit-monate'
import { berufsklasseNorm } from '@/lib/tarife/berufsklasse-norm'

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

  // Create or upsert via partial UNIQUE index (berufsklasse_norm avoids NULL dupes)
  const { data, error } = await supabase
    .from('tarife')
    .upsert(row, {
      onConflict: 'produkt_id,anbieter_name,alter_von,summe,berufsklasse_norm,wartezeit_monate',
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
  const besonderheiten = input.besonderheiten ?? {}
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
    berufsklasse_norm: berufsklasseNorm(input.berufsklasse),
    besonderheiten,
    wartezeit_monate: wartezeitMonateFromBesonderheiten(besonderheiten),
  }
}

function refresh(input: TarifInput, extra: { id?: string }): ActionResult & { id?: string } {
  revalidatePath('/admin/tarife')
  return { success: true, ...extra }
}

// ---------------------------------------------------------------------------
// CSV-Bulk-Import
// Spiegelt scripts/seed-vergleich-tarife.ts. Admin lädt eine CSV mit Header
//   anbieter_name,tarif_name,besonderheiten_json,geburtsjahr,summe_eur,beitrag_eur,einheit[,berufsklasse]
// hoch; jede Zeile wird gegen das Schema validiert und in `tarife` upserted.
// Idempotent über UNIQUE(produkt_id, anbieter_name, alter_von, summe, berufsklasse).
// ---------------------------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear()

interface CsvImportResult {
  success: boolean
  data?: {
    inserted: number
    skipped: number
    errors: Array<{ row: number; message: string }>
  }
  error?: string
}

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') {
        row.push(cell)
        cell = ''
      } else if (c === '\n') {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
      } else if (c !== '\r') {
        cell += c
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  if (rows.length === 0) return []
  const header = rows[0].map(h => h.trim())
  return rows
    .slice(1)
    .filter(r => r.length > 1 || (r.length === 1 && r[0].trim().length > 0))
    .map(r => {
      const obj: Record<string, string> = {}
      header.forEach((k, i) => {
        obj[k] = (r[i] ?? '').trim()
      })
      return obj
    })
}

export async function importTarifeCsv(
  produktId: string,
  formData: FormData,
): Promise<CsvImportResult> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Authentifizierung erforderlich.' }

  if (!produktId) return { success: false, error: 'produktId fehlt.' }

  const file = formData.get('csv')
  if (!(file instanceof File)) return { success: false, error: 'Keine CSV-Datei übergeben.' }
  if (file.size === 0) return { success: false, error: 'CSV-Datei ist leer.' }
  if (file.size > 5 * 1024 * 1024) return { success: false, error: 'CSV-Datei zu groß (max 5 MB).' }

  const text = await file.text()
  const parsed = parseCsv(text)
  if (parsed.length === 0) {
    return { success: false, error: 'CSV enthält keine Datenzeilen.' }
  }

  const errors: Array<{ row: number; message: string }> = []
  const validatedRows: Array<{
    produkt_id: string
    anbieter_name: string
    tarif_name: string | null
    besonderheiten: Record<string, unknown> | null
    alter_von: number
    alter_bis: number
    summe: number
    beitrag_low: number
    beitrag_high: number
    einheit: string
    berufsklasse: string | null
    berufsklasse_norm: string
    wartezeit_monate: number
  }> = []

  parsed.forEach((r, idx) => {
    const rowNo = idx + 2 // Header = Zeile 1
    try {
      if (!r.anbieter_name || !r.summe_eur || !r.beitrag_eur || !r.geburtsjahr) {
        throw new Error('Pflichtfelder fehlen (anbieter_name, geburtsjahr, summe_eur, beitrag_eur).')
      }
      const geburtsjahr = parseInt(r.geburtsjahr, 10)
      if (Number.isNaN(geburtsjahr) || geburtsjahr < 1900 || geburtsjahr > CURRENT_YEAR) {
        throw new Error(`Ungültiges geburtsjahr: ${r.geburtsjahr}`)
      }
      const summe = parseInt(r.summe_eur, 10)
      if (Number.isNaN(summe) || summe <= 0) {
        throw new Error(`Ungültige summe_eur: ${r.summe_eur}`)
      }
      const beitrag = parseFloat(r.beitrag_eur.replace(',', '.'))
      if (Number.isNaN(beitrag) || beitrag <= 0) {
        throw new Error(`Ungültiger beitrag_eur: ${r.beitrag_eur}`)
      }
      let besonderheiten: Record<string, unknown> | null = null
      if (r.besonderheiten_json) {
        try {
          besonderheiten = JSON.parse(r.besonderheiten_json) as Record<string, unknown>
        } catch {
          throw new Error('besonderheiten_json ist kein valides JSON.')
        }
      }
      const alter = CURRENT_YEAR - geburtsjahr
      validatedRows.push({
        produkt_id: produktId,
        anbieter_name: r.anbieter_name,
        tarif_name: r.tarif_name || null,
        besonderheiten,
        wartezeit_monate: wartezeitMonateFromBesonderheiten(besonderheiten),
        alter_von: alter,
        alter_bis: alter,
        summe,
        beitrag_low: beitrag,
        beitrag_high: beitrag,
        einheit: r.einheit || 'eur_summe',
        berufsklasse: r.berufsklasse || null,
        berufsklasse_norm: berufsklasseNorm(r.berufsklasse || null),
      })
    } catch (err) {
      errors.push({ row: rowNo, message: err instanceof Error ? err.message : String(err) })
    }
  })

  if (validatedRows.length === 0) {
    return { success: true, data: { inserted: 0, skipped: 0, errors } }
  }

  // Upsert in Batches via Admin-Client (Service-Role).
  const supabase = untyped(createAdminClient())
  let inserted = 0
  let skipped = 0
  const BATCH_SIZE = 50

  for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
    const batch = validatedRows.slice(i, i + BATCH_SIZE)
    const { error: upsertError } = await supabase
      .from('tarife')
      .upsert(batch, {
        onConflict: 'produkt_id,anbieter_name,alter_von,summe,berufsklasse_norm,wartezeit_monate',
      })

    if (upsertError) {
      errors.push({
        row: i + 2,
        message: `Batch-Upsert fehlgeschlagen: ${upsertError.message}`,
      })
      skipped += batch.length
    } else {
      inserted += batch.length
    }
  }

  revalidatePath('/admin/tarife')
  return { success: true, data: { inserted, skipped, errors } }
}
