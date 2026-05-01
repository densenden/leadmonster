'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/supabase/types'
import { trustSchema } from '@/lib/validation/trust'

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

function fromForm(formData: FormData) {
  const jahrRaw = formData.get('jahr') as string | null
  const reihenRaw = formData.get('reihenfolge') as string | null
  return {
    slug: (formData.get('slug') as string)?.trim() ?? '',
    typ: (formData.get('typ') as string) ?? 'pressezitat',
    titel: (formData.get('titel') as string)?.trim() ?? '',
    body: nullify((formData.get('body') as string)?.trim()),
    bild_url: nullify((formData.get('bild_url') as string)?.trim()),
    bild_alt: nullify((formData.get('bild_alt') as string)?.trim()),
    quelle_url: nullify((formData.get('quelle_url') as string)?.trim()),
    quelle_name: nullify((formData.get('quelle_name') as string)?.trim()),
    jahr: jahrRaw && jahrRaw !== '' ? Number(jahrRaw) : null,
    score: nullify((formData.get('score') as string)?.trim()),
    autor_name: nullify((formData.get('autor_name') as string)?.trim()),
    autor_alter: nullify((formData.get('autor_alter') as string)?.trim()),
    produkt_id: nullify((formData.get('produkt_id') as string)?.trim()),
    reihenfolge: reihenRaw ? Number(reihenRaw) : 100,
    aktiv: formData.get('aktiv') === 'on' || formData.get('aktiv') === 'true',
    belegt_durch: nullify((formData.get('belegt_durch') as string)?.trim()),
  }
}

export async function createTrust(formData: FormData): Promise<ActionResult> {
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = trustSchema.safeParse(fromForm(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const supabase = createAdminClient()
  const { error } = await supabase.from('trust_baustein').insert(parsed.data)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/trust')
  return { success: true }
}

export async function updateTrust(id: string, formData: FormData): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const parsed = trustSchema.safeParse(fromForm(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('trust_baustein')
    .update(parsed.data)
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/trust')
  revalidatePath(`/admin/trust/${id}`)
  return { success: true }
}

export async function deleteTrust(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('trust_baustein').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/trust')
  return { success: true }
}

export async function toggleAktiv(id: string, value: boolean): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Ungültige ID' }
  const user = await requireAuth()
  if (!user) return { success: false, error: 'Nicht autorisiert' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('trust_baustein').update({ aktiv: value }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/trust')
  return { success: true }
}
