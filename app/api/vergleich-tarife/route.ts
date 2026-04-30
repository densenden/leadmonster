/**
 * GET /api/vergleich-tarife
 *
 * Liefert die sortierte Anbietertarif-Liste für einen Produkt+Alter+Summe-Filter.
 * Wird vom VergleichsRechner-Client-Component bei jeder User-Eingabe abgefragt.
 *
 * Cache-Strategie: 1h s-maxage, 24h SWR. Tarife ändern sich monatlich, daher
 * ist aggressives Caching auf der Edge unproblematisch.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { lookupVergleichTarife } from '@/lib/tarife/lookup'

const querySchema = z.object({
  produktId: z.string().uuid(),
  age: z.coerce.number().int().min(0).max(120),
  summe: z.coerce.number().int().positive(),
})

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    produktId: url.searchParams.get('produktId'),
    age: url.searchParams.get('age'),
    summe: url.searchParams.get('summe'),
  })

  if (!parsed.success) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      },
      { status: 422 },
    )
  }

  const tarife = await lookupVergleichTarife(
    parsed.data.produktId,
    parsed.data.age,
    parsed.data.summe,
  )

  return Response.json(
    { data: tarife, error: null },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}
