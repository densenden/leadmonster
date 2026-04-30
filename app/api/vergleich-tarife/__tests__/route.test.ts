// Tests für GET /api/vergleich-tarife.
// Verifiziert Zod-Validation, Cache-Header, Lookup-Wiring.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const SAMPLE_RESULT = [
  {
    anbieter_name: 'DELA',
    tarif_name: 'sorgenfrei Leben',
    beitrag_eur: 17.14,
    besonderheiten: { wartezeit_monate: 0 },
    badges: ['guenstigster', 'schnellster_schutz'],
  },
]

const lookupVergleichTarife = vi.fn().mockResolvedValue(SAMPLE_RESULT)

vi.mock('@/lib/tarife/lookup', () => ({
  lookupVergleichTarife,
}))

beforeEach(() => {
  lookupVergleichTarife.mockClear()
  lookupVergleichTarife.mockResolvedValue(SAMPLE_RESULT)
})

async function callRoute(query: string): Promise<Response> {
  const { GET } = await import('../route')
  // NextRequest = Request mit zusätzlichen Eigenschaften — Standard-Request reicht für die Route.
  return GET(new Request(`http://localhost/api/vergleich-tarife?${query}`) as never)
}

const VALID_PRODUKT_UUID = '987fcdeb-51a2-43d7-b456-426614174001'

describe('GET /api/vergleich-tarife — Validation', () => {
  it('liefert 422 bei fehlendem produktId', async () => {
    const res = await callRoute('age=65&summe=8000')
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('liefert 422 bei nicht-UUID produktId', async () => {
    const res = await callRoute('produktId=not-a-uuid&age=65&summe=8000')
    expect(res.status).toBe(422)
  })

  it('liefert 422 bei age < 0', async () => {
    const res = await callRoute(`produktId=${VALID_PRODUKT_UUID}&age=-1&summe=8000`)
    expect(res.status).toBe(422)
  })

  it('liefert 422 bei summe = 0', async () => {
    const res = await callRoute(`produktId=${VALID_PRODUKT_UUID}&age=65&summe=0`)
    expect(res.status).toBe(422)
  })
})

describe('GET /api/vergleich-tarife — Erfolgs-Pfad', () => {
  it('liefert 200 und ruft lookupVergleichTarife mit korrekten Args', async () => {
    const res = await callRoute(`produktId=${VALID_PRODUKT_UUID}&age=65&summe=8000`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual(SAMPLE_RESULT)
    expect(lookupVergleichTarife).toHaveBeenCalledWith(VALID_PRODUKT_UUID, 65, 8000)
  })

  it('setzt Cache-Header (s-maxage=3600, SWR=86400)', async () => {
    const res = await callRoute(`produktId=${VALID_PRODUKT_UUID}&age=65&summe=8000`)
    const cacheControl = res.headers.get('Cache-Control') ?? ''
    expect(cacheControl).toContain('public')
    expect(cacheControl).toContain('s-maxage=3600')
    expect(cacheControl).toContain('stale-while-revalidate=86400')
  })

  it('liefert leeres Array, wenn Lookup nichts findet', async () => {
    lookupVergleichTarife.mockResolvedValueOnce([])
    const res = await callRoute(`produktId=${VALID_PRODUKT_UUID}&age=120&summe=15000`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })
})
