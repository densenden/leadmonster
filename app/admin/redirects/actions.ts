'use server'

// Server Actions für Redirect-CRUD.
// Pattern wie /admin/wissensfundus: requireAuth + Zod + revalidatePath.
// Cache-Invalidierung der Edge-Middleware passiert nicht direkt — der
// Module-Cache in lib/redirects/lookup.ts läuft nach 60s ab und wird beim
// nächsten Request neu geladen. Acceptable für eine Vertriebs-bedienbare Liste.

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/supabase/types'
import { redirectSchema } from '@/lib/validation/redirect'

async function requireAuth() {
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function fromForm(formData: FormData) {
  const notizRaw = (formData.get('notiz') as string | null)?.trim() ?? ''
  return {
    legacy_path: ((formData.get('legacy_path') as string) ?? '').trim(),
    target_path: ((formData.get('target_path') as string) ?? '').trim(),
    status: (formData.get('status') as string) ?? '301',
    notiz: notizRaw === '' ? null : notizRaw,
  }
}

export async function createRedirect(formData: FormData): Promise<ActionResult> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = redirectSchema.safeParse(fromForm(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('redirects').insert(parsed.data)
  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `Redirect für "${parsed.data.legacy_path}" existiert bereits` }
    }
    return { success: false, error: `Datenbankfehler: ${error.message}` }
  }

  revalidatePath('/admin/redirects')
  return { success: true }
}

export async function updateRedirect(
  legacyPath: string,
  formData: FormData,
): Promise<ActionResult> {
  if (!legacyPath) return { success: false, error: 'Pfad fehlt' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  // Beim Edit ist legacy_path stabil (PK). Wir lesen ihn aus dem Argument
  // statt aus dem Form, damit Tippfehler nicht zu Insert-statt-Update führen.
  const parsed = redirectSchema.safeParse({
    ...fromForm(formData),
    legacy_path: legacyPath,
  })
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('redirects')
    .update({
      target_path: parsed.data.target_path,
      status: parsed.data.status,
      notiz: parsed.data.notiz,
    })
    .eq('legacy_path', legacyPath)
  if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }

  revalidatePath('/admin/redirects')
  return { success: true }
}

export async function deleteRedirect(legacyPath: string): Promise<ActionResult> {
  if (!legacyPath) return { success: false, error: 'Pfad fehlt' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('redirects').delete().eq('legacy_path', legacyPath)
  if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }

  revalidatePath('/admin/redirects')
  return { success: true }
}

/**
 * CSV-Import für Bulk-Migration. Erwartet Header-Zeile
 *   legacy_path,target_path,status,notiz
 * Bei doppelten legacy_path-Werten wird der existierende überschrieben (upsert).
 *
 * Rückgabe: count_inserted (success-Insert), count_skipped (Validation-Fehler),
 * fehlerhafte Zeilen mit message.
 */
export interface CsvImportResult {
  success: true
  inserted: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export async function importRedirectsCsv(
  formData: FormData,
): Promise<ActionResult<CsvImportResult>> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const file = formData.get('csv') as File | null
  if (!file || file.size === 0) {
    return { success: false, error: 'Keine Datei ausgewählt' }
  }

  const text = await file.text()
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length === 0) {
    return { success: false, error: 'Datei ist leer' }
  }

  const header = lines[0].split(',').map((c) => c.trim().toLowerCase())
  const colLegacy = header.indexOf('legacy_path')
  const colTarget = header.indexOf('target_path')
  const colStatus = header.indexOf('status')
  const colNotiz = header.indexOf('notiz')
  if (colLegacy < 0 || colTarget < 0) {
    return {
      success: false,
      error: 'Header muss legacy_path und target_path enthalten',
    }
  }

  const rows: Array<{ legacy_path: string; target_path: string; status: number; notiz: string | null }> = []
  const errors: CsvImportResult['errors'] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const candidate = {
      legacy_path: cols[colLegacy] ?? '',
      target_path: cols[colTarget] ?? '',
      status: colStatus >= 0 ? cols[colStatus] : '301',
      notiz: colNotiz >= 0 ? (cols[colNotiz] || null) : null,
    }
    const parsed = redirectSchema.safeParse(candidate)
    if (!parsed.success) {
      const msg = Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${(v ?? []).join(', ')}`)
        .join('; ')
      errors.push({ row: i + 1, message: msg })
      continue
    }
    rows.push({
      legacy_path: parsed.data.legacy_path,
      target_path: parsed.data.target_path,
      status: parsed.data.status,
      notiz: parsed.data.notiz ?? null,
    })
  }

  if (rows.length === 0) {
    return {
      success: true,
      data: { success: true, inserted: 0, skipped: errors.length, errors },
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('redirects')
    .upsert(rows, { onConflict: 'legacy_path' })
  if (error) {
    return { success: false, error: `Datenbankfehler: ${error.message}` }
  }

  revalidatePath('/admin/redirects')
  return {
    success: true,
    data: {
      success: true,
      inserted: rows.length,
      skipped: errors.length,
      errors,
    },
  }
}

// Minimal-CSV-Parser: kennt einfache Quotes ("...") für Felder mit Kommas/Notiz.
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuote = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuote = true
    } else if (ch === ',') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}
