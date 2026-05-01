/**
 * PATCH /api/admin/produkte/[id]/status — Quick-Status-Change.
 *
 * Wird von der Admin-Liste verwendet, um ein Produkt mit einem Klick
 * auf "aktiv" / "entwurf" / "archiviert" zu setzen, ohne den vollen
 * Edit-Form zu öffnen.
 *
 * Body: { status: 'entwurf' | 'aktiv' | 'archiviert' }
 *
 * Triggert ISR-Revalidation für Startseite, Sitemap, Admin-Liste und
 * alle Public-Routes des Produkts (analog zur vollen PATCH-Route).
 */
import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  status: z.enum(['entwurf', 'aktiv', 'archiviert']),
})

interface RouteContext {
  params: { id: string }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionClient = createClient()
  const { data: { session } } = await sessionClient.auth.getSession()
  if (!session) {
    return Response.json({ data: null, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ data: null, error: { code: 'INVALID_JSON' } }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // Slug für Revalidation vorab holen.
  const { data: existing } = await supabase
    .from('produkte')
    .select('id, slug')
    .eq('id', params.id)
    .maybeSingle()
  if (!existing) {
    return Response.json({ data: null, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  const { error } = await supabase
    .from('produkte')
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) {
    return Response.json({ data: null, error: { code: 'DB_ERROR' } }, { status: 500 })
  }

  // Caches invalidieren — Status-Wechsel beeinflusst Sichtbarkeit auf
  // Startseite, Sitemap und (für Public-Routes) auf den Produktseiten selbst.
  revalidatePath('/')
  revalidatePath('/sitemap.xml')
  revalidatePath('/admin/produkte')
  if (existing.slug) {
    const slug = (existing as { slug: string }).slug
    revalidatePath(`/${slug}`)
    revalidatePath(`/${slug}/faq`)
    revalidatePath(`/${slug}/vergleich`)
    revalidatePath(`/${slug}/tarife`)
    revalidatePath(`/${slug}/vergleichsrechner`)
  }

  return Response.json({ data: { id: params.id, status: parsed.data.status }, error: null }, { status: 200 })
}
