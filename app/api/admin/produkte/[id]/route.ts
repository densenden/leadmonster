// DELETE /api/admin/produkte/[id]
// Deletes the product and all cascaded data (produkt_config, generierter_content, email_sequenzen).
// Leads are NOT deleted — the FK on leads.produkt_id has no cascade.
// Auth-guarded. Returns 200 on success, 404 if not found, 401 if unauthenticated.
import { type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth guard
  const sessionClient = createClient()
  const { data: { session } } = await sessionClient.auth.getSession()
  if (!session) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Verify the product exists first
  const { data: existing } = await supabase
    .from('produkte')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()

  if (!existing) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  const { error } = await supabase
    .from('produkte')
    .delete()
    .eq('id', params.id)

  if (error) {
    return Response.json({ data: null, error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  return Response.json({ data: { id: params.id }, error: null }, { status: 200 })
}
