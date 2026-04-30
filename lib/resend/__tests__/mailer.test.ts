// Tests for lib/resend/mailer.ts — validates non-blocking error handling,
// DB template fetch logic, and fallback behaviour.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Lead } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Shared mock state — must be defined before vi.mock() factory functions run
// ---------------------------------------------------------------------------

const mockEmailsSend = vi.fn()
const mockFrom = vi.fn()

vi.mock('resend', () => {
  // Resend must be mocked as a proper constructor (class-style) so `new Resend()`
  // works as expected by the mailer module.
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

const SAMPLE_LEAD: Lead = {
  id: 'lead-uuid-1',
  produkt_id: 'prod-uuid-1',
  vorname: 'Max',
  nachname: 'Mustermann',
  email: 'max@example.de',
  telefon: '0151 1234567',
  interesse: 'Sofortschutz',
  zielgruppe_tag: 'senioren_50plus',
  intent_tag: 'sofortschutz',
  confluence_page_id: 'conf-page-99',
  confluence_synced: true,
  resend_sent: false,
  created_at: '2026-04-07T10:30:00.000Z',
  convexa_lead_id: null,
  convexa_synced: false,
  convexa_error: null,
  source_url: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  gewuenschter_anbieter: null,
}

// Builds a thenable Supabase chain for email_sequenzen queries.
// Vitest awaits thenable objects, so we simulate a resolved Supabase response.
function makeEmailSeqChain(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendLeadConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns true when resend.emails.send resolves successfully', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([])
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockResolvedValue({ data: { id: 'sent-id' }, error: null })

    const { sendLeadConfirmation } = await import('@/lib/resend/mailer')
    const result = await sendLeadConfirmation(SAMPLE_LEAD)

    expect(result).toBe(true)
    expect(mockEmailsSend).toHaveBeenCalledOnce()
  })

  it('returns false and does NOT throw when resend.emails.send rejects', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([])
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockRejectedValue(new Error('Resend service unavailable'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { sendLeadConfirmation } = await import('@/lib/resend/mailer')

    // Call directly — the function's try/catch means it must resolve (not reject) with false
    const result = await sendLeadConfirmation(SAMPLE_LEAD)

    expect(result).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[mailer] sendLeadConfirmation failed:'),
      expect.any(Error),
    )

    consoleSpy.mockRestore()
  })
})

describe('sendSalesNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('uses DB email_sequenzen template when a matching [BENACHRICHTIGUNG] row is found', async () => {
    const dbTemplate = {
      betreff: '[BENACHRICHTIGUNG] Neuer Lead eingegangen',
      html_body: '<p>DB template content</p>',
      delay_hours: 0,
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([dbTemplate])
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ schluessel: 'sales_notification_email', wert: 'sales@team.de' }],
            error: null,
          }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockResolvedValue({ data: { id: 'sent-id' }, error: null })

    const { sendSalesNotification } = await import('@/lib/resend/mailer')
    const result = await sendSalesNotification(SAMPLE_LEAD, 'Sterbegeld24Plus')

    expect(result).toBe(true)
    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '[BENACHRICHTIGUNG] Neuer Lead eingegangen',
        html: '<p>DB template content</p>',
        to: 'sales@team.de',
      }),
    )
  })

  it('uses hardcoded fallback template when no DB row found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_sequenzen') return makeEmailSeqChain([])
      if (table === 'einstellungen') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ schluessel: 'sales_notification_email', wert: 'sales@team.de' }],
            error: null,
          }),
        }
      }
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    mockEmailsSend.mockResolvedValue({ data: { id: 'sent-id' }, error: null })

    const { sendSalesNotification } = await import('@/lib/resend/mailer')
    const result = await sendSalesNotification(SAMPLE_LEAD, 'Sterbegeld24Plus')

    expect(result).toBe(true)

    // Fallback subject includes vorname, nachname and produkt name
    const callArgs = mockEmailsSend.mock.calls[0][0]
    expect(callArgs.subject).toContain('Max')
    expect(callArgs.subject).toContain('Mustermann')
    expect(callArgs.subject).toContain('Sterbegeld24Plus')

    // Fallback HTML is not the DB template
    expect(callArgs.html).not.toBe('<p>DB template content</p>')
  })
})
