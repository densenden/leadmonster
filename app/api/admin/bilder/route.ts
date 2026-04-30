// GET /api/admin/bilder — list images with optional filters
// Auth-guarded — admin sessions only.
import { type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const url = new URL(request.url)
  const produktId = url.searchParams.get('produkt_id')
  const slot = url.searchParams.get('slot')
  const pageType = url.searchParams.get('page_type')
  const blogPostId = url.searchParams.get('blog_post_id')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500)

  const supabase = createAdminClient()
  let query = supabase
    .from('bilder')
    .select('id, produkt_id, blog_post_id, page_type, slot, url, alt_text, prompt_used, provider, width, height, created_at, produkte:produkt_id(id, name, slug)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (produktId) query = query.eq('produkt_id', produktId)
  if (slot) query = query.eq('slot', slot)
  if (pageType) query = query.eq('page_type', pageType)
  if (blogPostId) query = query.eq('blog_post_id', blogPostId)

  const { data, error } = await query
  if (error) {
    return Response.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return Response.json({ data, error: null })
}
