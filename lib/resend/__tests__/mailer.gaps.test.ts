// Gap-analysis tests for lib/resend/mailer.ts — covers critical integration
// points not addressed by the core mailer tests.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Lead } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------

const mockEmailsSend = vi.fn()
const mockFrom = vi.fn()

vi.mock('resend', () => {
  function ResendMock(this: { emails: { send: unknown } }) {
    this.emails = { send: mockEmailsSend }
  }
  return { Resend: ResendMock }
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
  createClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_LEAD: Lead = {
  id: 'lead-gap-1',
  produkt_id: 'prod-gap-1',
  vorname: 'Anna',
  nachname: 'Schmidt',
  email: 'anna@example.de',
  telefon: null,
  interesse: null,
  zielgruppe_tag: 'familien',
  intent_tag: 'sicherheit',
  confluence_page_id: null,
  confluence_synced: false,
  resend_sent: false,
  created_at: '2026-04-07T12:00:00.000Z',
  convexa_lead_id: null,
  convexa_synced: false,
  convexa_error: null,
  source_url: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
}

function makeEmailSeqChain(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  }
}

// ---------------------------------------------------------------------------
// Gap tests
// ---------------------------------------------------------------------------

describe('sendSalesNotification — einstellungen DB lookup with env fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('uses process.env.SALES_NOTIFICATION_EMAIL when no einstellungen DB row found', async () => {
    // Stub env
    vi.stubEnv('SALES_NOTIFICATION_EMAIL', 'fallback@sales.de')

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([])
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          // Return empty — no DB value for sales_notification_email
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockResolvedValue({ data: { id: 'sent' }, error: null })

    const { sendSalesNotification } = await import('@/lib/resend/mailer')
    const result = await sendSalesNotification(BASE_LEAD, 'TestProdukt')

    expect(result).toBe(true)
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'fallback@sales.de' }),
    )

    vi.unstubAllEnvs()
  })

  it('returns false and logs error when neither DB nor env has sales_notification_email', async () => {
    // Ensure env key is absent
    vi.stubEnv('SALES_NOTIFICATION_EMAIL', '')

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([])
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const { sendSalesNotification } = await import('@/lib/resend/mailer')
    const result = await sendSalesNotification(BASE_LEAD, 'TestProdukt')

    expect(result).toBe(false)
    expect(mockEmailsSend).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[mailer] No sales_notification_email configured'),
    )

    consoleSpy.mockRestore()
    vi.unstubAllEnvs()
  })
})

describe('sendSalesNotification — Confluence URL in fallback HTML', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('includes Confluence link when confluence_page_id is set and base URL is available', async () => {
    const leadWithPage: Lead = { ...BASE_LEAD, confluence_page_id: 'page-abc-123' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([])
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { schluessel: 'sales_notification_email', wert: 'sales@team.de' },
              { schluessel: 'confluence_base_url', wert: 'https://mycompany.atlassian.net' },
            ],
            error: null,
          }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockResolvedValue({ data: { id: 'sent' }, error: null })

    const { sendSalesNotification } = await import('@/lib/resend/mailer')
    await sendSalesNotification(leadWithPage, 'TestProdukt')

    const html = mockEmailsSend.mock.calls[0][0].html as string
    expect(html).toContain('https://mycompany.atlassian.net/pages/page-abc-123')
  })

  it('omits Confluence link when confluence_page_id is null', async () => {
    const leadWithoutPage: Lead = { ...BASE_LEAD, confluence_page_id: null }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([])
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { schluessel: 'sales_notification_email', wert: 'sales@team.de' },
              { schluessel: 'confluence_base_url', wert: 'https://mycompany.atlassian.net' },
            ],
            error: null,
          }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockResolvedValue({ data: { id: 'sent' }, error: null })

    const { sendSalesNotification } = await import('@/lib/resend/mailer')
    await sendSalesNotification(leadWithoutPage, 'TestProdukt')

    const html = mockEmailsSend.mock.calls[0][0].html as string
    // The link element must be absent — no href attribute pointing to Confluence
    expect(html).not.toContain('atlassian.net/pages/')
  })
})

describe('fetchEmailTemplate — delay_hours > 0 rows are skipped with console.warn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('skips rows with delay_hours > 0 and logs console.warn; returns null when only drip rows exist', async () => {
    const dripRow = {
      betreff: '[BESTAETIGUNG] Drip follow-up',
      html_body: '<p>drip content</p>',
      delay_hours: 48,
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([dripRow])
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockResolvedValue({ data: { id: 'sent' }, error: null })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { sendLeadConfirmation } = await import('@/lib/resend/mailer')

    // A drip-only result means no immediate template — falls back to hardcoded
    const result = await sendLeadConfirmation(BASE_LEAD)

    expect(result).toBe(true)
    // The warn must have been logged for the skipped drip row
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[mailer] Skipping email_sequenzen row with delay_hours=48'),
    )

    // The email is still sent (using the fallback) — verify it went to the lead
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: BASE_LEAD.email }),
    )

    warnSpy.mockRestore()
  })
})
