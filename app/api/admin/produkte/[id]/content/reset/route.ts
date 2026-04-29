// POST /api/admin/produkte/[id]/content/reset
// Deletes all generierter_content rows for this produkt_id.
// By default skips ratgeber articles (?all=true to also delete ratgeber).
// Auth-guarded.
import { type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionClient = createClient()
  const { data: { session } } = await sessionClient.auth.getSession()
  if (!session) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const deleteAll = searchParams.get('all') === 'true'

  const supabase = createAdminClient()

  let query = supabase
    .from('generierter_content')
    .delete()
    .eq('produkt_id', params.id)

  if (!deleteAll) {
    query = query.neq('page_type', 'ratgeber')
  }

  const { error, count } = await query

  if (error) {
    return Response.json({ data: null, error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  return Response.json({ data: { deleted: count ?? 0 }, error: null }, { status: 200 })
}
