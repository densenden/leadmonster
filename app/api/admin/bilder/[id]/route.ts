// DELETE /api/admin/bilder/[id]
// Removes the bilder row and best-effort deletes the storage object.
import { type NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'produkt-bilder'

interface RouteContext {
  params: { id: string }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: row, error: loadErr } = await supabase
    .from('bilder')
    .select('id, url, produkt_id')
    .eq('id', params.id)
    .single()

  if (loadErr || !row) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  // Best-effort: delete storage object derived from the public URL path.
  // Public URL pattern: <baseUrl>/storage/v1/object/public/<bucket>/<path>
  try {
    const marker = `/storage/v1/object/public/${BUCKET}/`
    const idx = row.url.indexOf(marker)
    if (idx >= 0) {
      const path = row.url.slice(idx + marker.length)
      await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)])
    }
  } catch {
    // ignore — DB row delete still proceeds
  }

  // If this image was the hero of a product, also clear the produkte row.
  if (row.produkt_id) {
    await supabase
      .from('produkte')
      .update({ hero_image_url: null, hero_image_alt: null })
      .eq('id', row.produkt_id)
      .eq('hero_image_url', row.url)
  }

  const { error: delErr } = await supabase.from('bilder').delete().eq('id', params.id)
  if (delErr) {
    return Response.json({ data: null, error: { code: 'DB_ERROR', message: delErr.message } }, { status: 500 })
  }

  return Response.json({ data: { deleted: true }, error: null })
}
