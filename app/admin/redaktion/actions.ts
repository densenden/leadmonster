'use server'

// Server Actions für Redaktion (Autoren-Profile).
// Pattern wie /admin/wissensfundus: requireAuth + Zod + revalidatePath.
// Nach jedem Save wird `schema_person` neu berechnet und persistiert.

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { ActionResult, Json } from '@/lib/supabase/types'
import { redaktionSchema } from '@/lib/validation/redaktion'
import { buildSchemaPerson } from '@/lib/redaktion/schema-person'

async function requireAuth() {
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function nullify<T>(v: T | undefined | null): T | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'string' && v.trim() === '') return null
  return v as T
}

function parseList(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

function fromForm(formData: FormData) {
  const expertiseRaw = formData.getAll('expertise') as string[]
  const qualifikationenRaw = parseList((formData.get('qualifikationen') as string) ?? '')
  const erfRaw = formData.get('jahre_erfahrung') as string | null
  return {
    slug: (formData.get('slug') as string)?.trim() ?? '',
    vorname: (formData.get('vorname') as string)?.trim() ?? '',
    nachname: (formData.get('nachname') as string)?.trim() ?? '',
    titel: nullify((formData.get('titel') as string)?.trim()),
    rolle: (formData.get('rolle') as string)?.trim() ?? '',
    kurz_bio: (formData.get('kurz_bio') as string) ?? '',
    lang_bio_md: (formData.get('lang_bio_md') as string) ?? '',
    expertise: expertiseRaw,
    qualifikationen: qualifikationenRaw,
    vermittlerregister_nr: nullify((formData.get('vermittlerregister_nr') as string)?.trim()),
    ihk_kammer: nullify((formData.get('ihk_kammer') as string)?.trim()),
    paragraph_34d: nullify((formData.get('paragraph_34d') as string)?.trim()),
    jahre_erfahrung: erfRaw && erfRaw !== '' ? Number(erfRaw) : null,
    email: nullify((formData.get('email') as string)?.trim()),
    telefon: nullify((formData.get('telefon') as string)?.trim()),
    linkedin_url: nullify((formData.get('linkedin_url') as string)?.trim()),
    xing_url: nullify((formData.get('xing_url') as string)?.trim()),
    website_url: nullify((formData.get('website_url') as string)?.trim()),
    public: formData.get('public') === 'on' || formData.get('public') === 'true',
  }
}

export async function createAutor(formData: FormData): Promise<ActionResult> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = redaktionSchema.safeParse(fromForm(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.sterbegeld24plus.de'
  const supabase = createAdminClient()

  const insertRow = {
    ...parsed.data,
    schema_person: buildSchemaPerson({ ...parsed.data, foto_url: null }, baseUrl) as unknown as Json,
  }

  const { error } = await supabase.from('redaktion').insert(insertRow)
  if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }

  revalidatePath('/admin/redaktion')
  revalidatePath('/redaktion')
  return { success: true }
}

export async function updateAutor(id: string, formData: FormData): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = redaktionSchema.safeParse(fromForm(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.sterbegeld24plus.de'
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('redaktion')
    .select('foto_url, foto_alt')
    .eq('id', id)
    .single()

  const merged = {
    ...parsed.data,
    foto_url: existing?.foto_url ?? null,
  }

  const updateRow = {
    ...parsed.data,
    schema_person: buildSchemaPerson(merged, baseUrl) as unknown as Json,
  }

  const { error } = await supabase
    .from('redaktion')
    .update(updateRow)
    .eq('id', id)
  if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }

  revalidatePath('/admin/redaktion')
  revalidatePath(`/admin/redaktion/${id}`)
  revalidatePath('/redaktion')
  revalidatePath(`/redaktion/${parsed.data.slug}`)
  return { success: true }
}

export async function deleteAutor(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('redaktion').delete().eq('id', id)
  if (error) return { success: false, error: `Datenbankfehler: ${error.message}` }

  revalidatePath('/admin/redaktion')
  revalidatePath('/redaktion')
  return { success: true }
}

export async function togglePublic(id: string, value: boolean): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('redaktion')
    .update({ public: value })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/redaktion')
  revalidatePath('/redaktion')
  return { success: true }
}
