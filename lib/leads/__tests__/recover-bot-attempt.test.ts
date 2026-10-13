import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockLeadSingle = vi.fn()
const mockProduktSingle = vi.fn()
const mockFullLeadSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'lead_bot_attempts') {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
      update: mockUpdate,
    }
  }
  if (table === 'leads') {
    return {
      insert: (payload: unknown) => {
        mockInsert(payload)
        return {
          select: () => ({
            single: mockLeadSingle,
          }),
        }
      },
      select: () => ({
        eq: () => ({
          single: mockFullLeadSingle,
        }),
      }),
      update: mockUpdate,
    }
  }
  if (table === 'produkte') {
    return {
      select: () => ({
        eq: () => ({
          single: mockProduktSingle,
        }),
      }),
    }
  }
  return {}
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('@/lib/convexa/client', () => ({
  isConvexaSyncEnabled: vi.fn(async () => false),
  pushLeadToConvexa: vi.fn(),
}))

vi.mock('@/lib/resend/mailer', () => ({
  isResendEnabled: vi.fn(async () => false),
  sendLeadConfirmation: vi.fn(async () => true),
  sendSalesNotification: vi.fn(async () => true),
}))

describe('recoverBotAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateEq.mockResolvedValue({ error: null })
  })

  it('rejects when email missing', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'a1',
        email: null,
        produkt_id: 'p1',
        payload: {},
        recovered_at: null,
        recovered_lead_id: null,
      },
      error: null,
    })
    const { recoverBotAttempt } = await import('../recover-bot-attempt')
    const result = await recoverBotAttempt('a1')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/E-Mail/)
  })

  it('inserts lead and marks recovered', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'a1',
        email: 'real@example.de',
        vorname: 'Anna',
        nachname: 'Test',
        telefon: '0123',
        produkt_id: 'p1',
        source_url: 'https://example.de',
        client_ip: '1.1.1.1',
        reason: 'spam_heuristic',
        payload: {
          geburtsdatum: '1960-01-01',
          strasse: 'Musterstr. 1',
          plz: '80331',
          ort: 'München',
          intentTag: 'preis',
          formPlacement: 'vergleichsrechner',
          sterbegeldSumme: 10000,
        },
        recovered_at: null,
        recovered_lead_id: null,
      },
      error: null,
    })
    mockLeadSingle.mockResolvedValue({ data: { id: 'lead-1' }, error: null })
    mockProduktSingle.mockResolvedValue({
      data: { name: 'Sterbegeld', slug: 'sterbegeld24plus', typ: 'sterbegeld' },
      error: null,
    })
    mockFullLeadSingle.mockResolvedValue({
      data: {
        id: 'lead-1',
        email: 'real@example.de',
        produkt_id: 'p1',
      },
      error: null,
    })

    const { recoverBotAttempt } = await import('../recover-bot-attempt')
    const result = await recoverBotAttempt('a1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.leadId).toBe('lead-1')
      // Resend master switch OFF in this suite — no mails, warning instead.
      expect(result.emailsSent).toBe(false)
      expect(result.warnings.some(w => /E-Mail-Versand ist deaktiviert/i.test(w))).toBe(true)
    }
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'real@example.de',
        vorname: 'Anna',
        intent_tag: 'preis',
      }),
    )
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('is idempotent when already recovered', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'a1',
        email: 'x@y.de',
        produkt_id: 'p1',
        payload: {},
        recovered_at: '2026-08-10T00:00:00Z',
        recovered_lead_id: 'existing-lead',
      },
      error: null,
    })
    const { recoverBotAttempt } = await import('../recover-bot-attempt')
    const result = await recoverBotAttempt('a1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.leadId).toBe('existing-lead')
      expect(result.warnings[0]).toMatch(/Bereits freigegeben/)
    }
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
