// REST API route for Produkt create (POST) and update (PATCH) operations.
// Both handlers verify Supabase Auth session before any DB access.
// Service role client is used for all DB writes — never exposed to the browser.
// Raw Supabase error messages are never forwarded to the client.
import { type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { produktSchema, produktUpdateSchema } from '@/lib/validations/produkt'

// Trigger ISR/Edge-Revalidation für alle Pfade, die die Produktliste enthalten,
// nach jeder Mutation. Wird aus POST/PATCH/DELETE aufgerufen.
function revalidateProduktPaths(slug?: string) {
  // Startseite (Produkt-Grid)
  revalidatePath('/')
  // Sitemap (listet alle Produkt-Routen)
  revalidatePath('/sitemap.xml')
  // Admin-Übersicht (zur Sicherheit, hat schon force-dynamic)
  revalidatePath('/admin/produkte')
  // Produkt-Subroutes — beim Slug-Change muss sowohl alter als auch neuer Slug
  // revalidiert werden. Slug-Change ist selten genug, dass wir den alten nicht
  // separat tracken — der nächste Request darauf produziert ein 404.
  if (slug) {
    revalidatePath(`/${slug}`)
    revalidatePath(`/${slug}/faq`)
    revalidatePath(`/${slug}/vergleich`)
    revalidatePath(`/${slug}/tarife`)
    revalidatePath(`/${slug}/vergleichsrechner`)
  }
}

// POST /api/admin/produkte
// Creates a new product and its config. Returns 201 with { data: { id } }.
export async function POST(request: NextRequest) {
  // Auth guard — verify session before any DB access.
  const sessionClient = createClient()
  const {
    data: { session },
  } = await sessionClient.auth.getSession()

  if (!session) {
    return Response.json(
      { data: null, error: { code: 'UNAUTHORIZED' } },
      { status: 401 },
    )
  }

  // Parse request body safely.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { code: 'INVALID_JSON' } },
      { status: 400 },
    )
  }

  // Validate with Zod schema.
  const parsed = produktSchema.safeParse(body)
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
  const { name, slug, typ, status, accent_color, convexa_form_token, zielgruppe, fokus, anbieter, argumente } =
    parsed.data

  // Check slug uniqueness before inserting.
  const { data: existing } = await supabase
    .from('produkte')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return Response.json(
      { data: null, error: { code: 'SLUG_EXISTS' } },
      { status: 409 },
    )
  }

  // Insert into produkte first to obtain the generated id.
  const { data: produkt, error: produktError } = await supabase
    .from('produkte')
    .insert({
      name,
      slug,
      typ,
      status: status ?? 'entwurf',
      accent_color: accent_color ?? null,
      convexa_form_token: convexa_form_token?.trim() ? convexa_form_token.trim() : null,
    })
    .select('id')
    .single()

  if (produktError || !produkt) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR' } },
      { status: 500 },
    )
  }

  // Insert produkt_config using the new produkt.id.
  const { error: configError } = await supabase
    .from('produkt_config')
    .insert({
      produkt_id: produkt.id,
      zielgruppe: zielgruppe ?? null,
      fokus: fokus ?? null,
      anbieter: anbieter ?? null,
      argumente: argumente ?? null,
    })

  if (configError) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR' } },
      { status: 500 },
    )
  }

  revalidateProduktPaths(slug)
  return Response.json({ data: { id: produkt.id }, error: null }, { status: 201 })
}

// PATCH /api/admin/produkte
// Updates an existing product and upserts its config. Returns 200 with { data: { id } }.
export async function PATCH(request: NextRequest) {
  // Auth guard — verify session before any DB access.
  const sessionClient = createClient()
  const {
    data: { session },
  } = await sessionClient.auth.getSession()

  if (!session) {
    return Response.json(
      { data: null, error: { code: 'UNAUTHORIZED' } },
      { status: 401 },
    )
  }

  // Parse request body safely.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { data: null, error: { code: 'INVALID_JSON' } },
      { status: 400 },
    )
  }

  // Validate with update schema (includes required id field).
  const parsed = produktUpdateSchema.safeParse(body)
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
  const { id, name, slug, typ, status, accent_color, convexa_form_token, zielgruppe, fokus, anbieter, argumente } =
    parsed.data

  // Update the produkte row first.
  const { error: produktError } = await supabase
    .from('produkte')
    .update({
      name,
      slug,
      typ,
      status,
      accent_color: accent_color ?? null,
      convexa_form_token: convexa_form_token?.trim() ? convexa_form_token.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (produktError) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR' } },
      { status: 500 },
    )
  }

  // Upsert produkt_config — inserts if not found, updates if exists.
  const { error: configError } = await supabase
    .from('produkt_config')
    .upsert(
      {
        produkt_id: id,
        zielgruppe: zielgruppe ?? null,
        fokus: fokus ?? null,
        anbieter: anbieter ?? null,
        argumente: argumente ?? null,
      },
      { onConflict: 'produkt_id' },
    )

  if (configError) {
    return Response.json(
      { data: null, error: { code: 'DB_ERROR' } },
      { status: 500 },
    )
  }

  revalidateProduktPaths(slug)
  return Response.json({ data: { id }, error: null }, { status: 200 })
}
