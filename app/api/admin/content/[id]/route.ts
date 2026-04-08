// PATCH /api/admin/content/[id]
// Updates a generierter_content row by id. Auth-guarded — service role client only.
// Returns the updated row on success; 422 for validation errors; 404 if row not found.
import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Zod schema covering all editable content fields.
// Length limits on meta fields are enforced here and in the UI.
const patchSchema = z.object({
  title: z.string().min(1).optional(),
  meta_title: z.string().max(60).optional(),
  meta_desc: z.string().max(160).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['entwurf', 'review', 'publiziert']).optional(),
  published_at: z.string().datetime().nullable().optional(),
})

interface RouteContext {
  params: { id: string }
}

// PATCH /api/admin/content/[id]
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  // Auth guard — verify Supabase session before any DB access.
  const sessionClient = createClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
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

  // Validate with Zod schema — return field-level errors on failure.
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validierungsfehler',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    )
  }

  // Build the update payload, always stamping updated_at.
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  }

  // Auto-set published_at when advancing to 'publiziert' if not explicitly provided.
  if (parsed.data.status === 'publiziert' && parsed.data.published_at === undefined) {
    updateData.published_at = new Date().toISOString()
  }

  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('generierter_content')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    // PGRST116 = no rows matched the filter — row not found.
    if (error.code === 'PGRST116') {
      return Response.json(
        { data: null, error: { code: 'NOT_FOUND' } },
        { status: 404 },
      )
    }
    return Response.json(
      { data: null, error: { code: 'DB_ERROR' } },
      { status: 500 },
    )
  }

  return Response.json({ data: row, error: null }, { status: 200 })
}
