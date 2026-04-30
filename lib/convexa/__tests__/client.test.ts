// Tests für lib/convexa/client.ts.
// Verifiziert PascalCase-Payload-Mapping, Token-Resolver-Hierarchie und
// HTTP-Status-Code-zu-Error-Mapping (404 → CONVEXA_INVALID_TOKEN, 400 → CONVEXA_BAD_REQUEST).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Lead } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Supabase-Mock
// ---------------------------------------------------------------------------

interface MockState {
  produktToken?: string | null
  einstellungenRows: Array<{ schluessel: string; wert: string | null }>
}

const state: MockState = { produktToken: null, einstellungenRows: [] }

function buildBuilder(table: string) {
  // produkte: select(...).eq('id', x).maybeSingle()
  if (table === 'produkte') {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: state.produktToken
              ? { convexa_form_token: state.produktToken }
              : null,
            error: null,
          }),
        }),
      }),
    }
  }
  // einstellungen: select(...).in([...]) → Promise mit Daten
  // ODER einstellungen: select(...).eq(...).maybeSingle() für base-url-Lookup
  if (table === 'einstellungen') {
    return {
      select: () => ({
        in: async () => ({ data: state.einstellungenRows, error: null }),
        eq: () => ({
          maybeSingle: async () => {
            const r = state.einstellungenRows.find(x => x.schluessel === 'convexa_base_url')
            return { data: r ?? null, error: null }
          },
        }),
      }),
    }
  }
  return { select: () => ({ in: async () => ({ data: [], error: null }) }) }
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: (t: string) => buildBuilder(t) })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_LEAD = {
  id: 'lead-uuid-1',
  produkt_id: 'prod-uuid-1',
  email: 'anna@example.de',
  vorname: 'Anna',
  nachname: 'Beispiel',
  telefon: '0151 9876543',
  interesse: 'Sterbegeld 8.000€ ab 65',
  zielgruppe_tag: 'senioren_50plus',
  intent_tag: 'preis',
  source_url: 'https://finanzteam26.de/sterbegeld24plus',
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'q2-2026',
  gewuenschter_anbieter: 'DELA',
} as unknown as Lead

const CONTEXT = {
  produktName: 'Sterbegeld24Plus',
  produktSlug: 'sterbegeld24plus',
  produktTyp: 'sterbegeld',
}

beforeEach(() => {
  state.produktToken = null
  state.einstellungenRows = []
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// ---------------------------------------------------------------------------
// buildPayload
// ---------------------------------------------------------------------------

describe('buildPayload', () => {
  it('mappt Standard-Felder auf PascalCase', async () => {
    const { buildPayload } = await import('../client')
    const payload = buildPayload(SAMPLE_LEAD, CONTEXT)
    expect(payload.Email).toBe('anna@example.de')
    expect(payload.FirstName).toBe('Anna')
    expect(payload.LastName).toBe('Beispiel')
    expect(payload.Phone).toBe('0151 9876543')
    expect(payload.Interest).toBe('Sterbegeld 8.000€ ab 65')
  })

  it('enthält Produkt-Kontext + Tracking + Anbieter-Wunsch', async () => {
    const { buildPayload } = await import('../client')
    const payload = buildPayload(SAMPLE_LEAD, CONTEXT)
    expect(payload.Product).toBe('Sterbegeld24Plus')
    expect(payload.ProductSlug).toBe('sterbegeld24plus')
    expect(payload.ProductType).toBe('sterbegeld')
    expect(payload.Zielgruppe).toBe('senioren_50plus')
    expect(payload.Intent).toBe('preis')
    expect(payload.GewuenschterAnbieter).toBe('DELA')
    expect(payload.UtmSource).toBe('google')
    expect(payload.UtmCampaign).toBe('q2-2026')
  })

  it('lässt optionale Felder weg, wenn nicht gesetzt', async () => {
    const minimal = { ...SAMPLE_LEAD, vorname: null, nachname: null, telefon: null, interesse: null, gewuenschter_anbieter: null } as Lead
    const { buildPayload } = await import('../client')
    const payload = buildPayload(minimal, CONTEXT)
    expect(payload.Email).toBe('anna@example.de')
    expect(payload.FirstName).toBeUndefined()
    expect(payload.LastName).toBeUndefined()
    expect(payload.Phone).toBeUndefined()
    expect(payload.Interest).toBeUndefined()
    expect(payload.GewuenschterAnbieter).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// pushLeadToConvexa — HTTP-Mapping
// ---------------------------------------------------------------------------

describe('pushLeadToConvexa — HTTP-Status-Mapping', () => {
  it('200 OK → synthetische ID, status="created"', async () => {
    state.einstellungenRows = [
      { schluessel: 'convexa_form_token', wert: 'token-aaa' },
      { schluessel: 'convexa_base_url', wert: 'https://api.convexa.app' },
    ]
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    const { pushLeadToConvexa } = await import('../client')
    const result = await pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)

    expect(result.status).toBe('created')
    expect(result.http_status).toBe(200)
    expect(result.id).toMatch(/^convexa-lead-uuid-1-/)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const url = fetchSpy.mock.calls[0]![0] as string
    expect(url).toBe('https://api.convexa.app/submissions/token-aaa')
    const init = fetchSpy.mock.calls[0]![1] as RequestInit
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('404 → CONVEXA_INVALID_TOKEN-Fehler', async () => {
    state.einstellungenRows = [{ schluessel: 'convexa_form_token', wert: 'token-bad' }]
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))

    const { pushLeadToConvexa } = await import('../client')
    await expect(pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)).rejects.toThrow(/CONVEXA_INVALID_TOKEN/)
  })

  it('400 → CONVEXA_BAD_REQUEST-Fehler mit Body-Snippet', async () => {
    state.einstellungenRows = [{ schluessel: 'convexa_form_token', wert: 'token-aaa' }]
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Email is required', { status: 400 }),
    )

    const { pushLeadToConvexa } = await import('../client')
    await expect(pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)).rejects.toThrow(/CONVEXA_BAD_REQUEST.*Email is required/)
  })

  it('500 → CONVEXA_HTTP_ERROR-Fehler', async () => {
    state.einstellungenRows = [{ schluessel: 'convexa_form_token', wert: 'token-aaa' }]
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Internal', { status: 500 }))

    const { pushLeadToConvexa } = await import('../client')
    await expect(pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)).rejects.toThrow(/CONVEXA_HTTP_ERROR 500/)
  })

  it('Netzwerkfehler → CONVEXA_NETWORK_ERROR', async () => {
    state.einstellungenRows = [{ schluessel: 'convexa_form_token', wert: 'token-aaa' }]
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))

    const { pushLeadToConvexa } = await import('../client')
    await expect(pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)).rejects.toThrow(/CONVEXA_NETWORK_ERROR.*ECONNREFUSED/)
  })

  it('Kein Token irgendwo → CONVEXA_NOT_CONFIGURED', async () => {
    state.einstellungenRows = []
    vi.stubEnv('CONVEXA_FORM_TOKEN', '')

    const { pushLeadToConvexa } = await import('../client')
    await expect(pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)).rejects.toThrow(/CONVEXA_NOT_CONFIGURED/)
  })
})

// ---------------------------------------------------------------------------
// Token-Resolver-Hierarchie
// ---------------------------------------------------------------------------

describe('pushLeadToConvexa — Token-Resolver-Hierarchie', () => {
  it('Pro-Produkt-Token gewinnt vor einstellungen + env', async () => {
    state.produktToken = 'token-from-produkt'
    state.einstellungenRows = [{ schluessel: 'convexa_form_token', wert: 'token-from-einstellungen' }]
    vi.stubEnv('CONVEXA_FORM_TOKEN', 'token-from-env')
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    const { pushLeadToConvexa } = await import('../client')
    await pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)

    const url = fetchSpy.mock.calls[0]![0] as string
    expect(url).toContain('/submissions/token-from-produkt')
  })

  it('einstellungen-Token gewinnt vor env, wenn Produkt keinen hat', async () => {
    state.produktToken = null
    state.einstellungenRows = [{ schluessel: 'convexa_form_token', wert: 'token-from-einstellungen' }]
    vi.stubEnv('CONVEXA_FORM_TOKEN', 'token-from-env')
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    const { pushLeadToConvexa } = await import('../client')
    await pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)

    const url = fetchSpy.mock.calls[0]![0] as string
    expect(url).toContain('/submissions/token-from-einstellungen')
  })

  it('env-Token greift, wenn weder Produkt noch einstellungen einen haben', async () => {
    state.produktToken = null
    state.einstellungenRows = []
    vi.stubEnv('CONVEXA_FORM_TOKEN', 'token-from-env')
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

    const { pushLeadToConvexa } = await import('../client')
    await pushLeadToConvexa(SAMPLE_LEAD, CONTEXT)

    const url = fetchSpy.mock.calls[0]![0] as string
    expect(url).toContain('/submissions/token-from-env')
  })
})
