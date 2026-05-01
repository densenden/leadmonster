// Generischer Endpoint für Author-Override + Review-Stempel auf
// generierter_content / wissensfundus / blog_posts.
//
// PATCH /api/admin/article-author/<table>/<id>
// Body: { autor_id?: string|null, reviewed_by?: string|null, mark_reviewed?: boolean }
//
// Allow-list für tables verhindert SQL-Injection auf den Table-Namen.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const ALLOWED_TABLES = ['generierter_content', 'wissensfundus', 'blog_posts'] as const
type AllowedTable = typeof ALLOWED_TABLES[number]

interface PatchBody {
  autor_id?: string | null
  reviewed_by?: string | null
  mark_reviewed?: boolean
}

export async function PATCH(
  request: Request,
  { params }: { params: { table: string; id: string } }
) {
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

  const table = params.table as AllowedTable
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Tabelle nicht erlaubt' }, { status: 400 })
  }
  if (!params.id) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })

  const body = await request.json().catch(() => null) as PatchBody | null
  if (!body) return NextResponse.json({ error: 'Body erwartet' }, { status: 400 })

  const update: Record<string, string | null> = {}
  if ('autor_id' in body) update.autor_id = body.autor_id ?? null
  if ('reviewed_by' in body) update.reviewed_by = body.reviewed_by ?? null
  if (body.mark_reviewed) {
    const now = new Date()
    update.reviewed_at = now.toISOString()
    // Default-Cadence aus einstellungen — fallback 180 Tage
    const { data: setting } = await supabase
      .from('einstellungen')
      .select('wert')
      .eq('schluessel', 'redaktion_review_intervall_tage')
      .maybeSingle()
    const days = Number(setting?.wert ?? '180') || 180
    const next = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    update.next_review_at = next.toISOString()
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Keine Felder zum Update.' }, { status: 400 })
  }

  const { error } = await supabase.from(table).update(update).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/admin')
  return NextResponse.json({ ok: true, updated: update })
}
