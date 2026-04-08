// POST /api/admin/content — on-demand ISR revalidation for a published product page.
// Auth-guarded: only authenticated admin sessions may trigger revalidation.
// Called by the admin UI after setting a content row's status to 'publiziert'.
// Also fires a non-blocking llms.txt regeneration when a page is published.
import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { buildCanonicalUrl } from '@/lib/seo/metadata'

export async function POST(request: NextRequest) {
  // Auth guard — verify Supabase session before any revalidation.
  const sessionClient = createClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return Response.json(
      { data: null, error: { code: 'UNAUTHORIZED', message: 'Nicht autorisiert' } },
      { status: 401 },
    )
  }

  // Extract the product slug from the request body.
  let slug: string | undefined
  try {
    const body = await request.json()
    slug = typeof body?.slug === 'string' ? body.slug : undefined
  } catch {
    // Body parsing failure is non-fatal — revalidate without a specific slug if needed.
  }

  if (slug) {
    // Revalidate only the specific product path, not the entire site.
    revalidatePath(`/${slug}`, 'page')
  }

  // Fire-and-forget llms.txt regeneration — non-blocking.
  // If this fails for any reason it must not affect the main response.
  try {
    const llmsUrl = buildCanonicalUrl('/api/seo/llms')
    fetch(llmsUrl, {
      method: 'POST',
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? '' },
    }).catch((err) => console.warn('llms.txt trigger failed:', err))
  } catch (err) {
    console.warn('llms.txt trigger URL build failed:', err)
  }

  return Response.json({ data: { revalidated: true, slug }, error: null })
}
