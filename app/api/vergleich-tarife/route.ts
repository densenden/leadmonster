/**
 * GET /api/vergleich-tarife
 *
 * Liefert die sortierte Anbietertarif-Liste für einen Produkt+Alter+Summe-Filter,
 * optional erweitert um produkttyp-spezifische Filter-Achsen (z. B. Wartezeit,
 * Berufsklasse). Filter-Achsen werden in `lookupVergleichTarife` aus
 * `produkt_typen.filter_axes` aufgelöst — die Route reicht nur die URL-Werte
 * durch.
 *
 * Cache-Strategie: 1h s-maxage, 24h SWR. Filter-Werte fließen in den Cache-Key
 * über die URL-Query, daher unverändert aggressiv cachebar.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { lookupVergleichTarife } from '@/lib/tarife/lookup'

const baseQuerySchema = z.object({
  produktId: z.string().uuid(),
  age: z.coerce.number().int().min(0).max(120),
  summe: z.coerce.number().int().positive(),
})

const RESERVED_PARAMS = new Set(['produktId', 'age', 'summe'])

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const parsed = baseQuerySchema.safeParse({
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

  // Zusätzliche Filter-URL-Parameter sammeln. Wenn keine vorhanden sind,
  // rufen wir lookupVergleichTarife mit nur 3 Args auf — bleibt rückwärts-
  // kompatibel zu allen bestehenden Konsumenten + Tests.
  const rawValues: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) {
    if (RESERVED_PARAMS.has(key)) continue
    if (value === '' || value === null || value === undefined) continue
    rawValues[key] = value
  }

  const tarife =
    Object.keys(rawValues).length > 0
      ? await lookupVergleichTarife(parsed.data.produktId, parsed.data.age, parsed.data.summe, {
          rawValues,
        })
      : await lookupVergleichTarife(parsed.data.produktId, parsed.data.age, parsed.data.summe)

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
