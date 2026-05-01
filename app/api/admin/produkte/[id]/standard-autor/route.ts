// PATCH standard_autor_id für ein Produkt.
// Body: { standard_autor_id: string | null }
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const body = await request.json().catch(() => null) as { standard_autor_id?: string | null } | null
  if (!body) return NextResponse.json({ error: 'Body erwartet' }, { status: 400 })

  const value = body.standard_autor_id === '' ? null : body.standard_autor_id ?? null

  const { error } = await supabase
    .from('produkte')
    .update({ standard_autor_id: value })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/admin/produkte/${params.id}`)
  return NextResponse.json({ ok: true, standard_autor_id: value })
}
