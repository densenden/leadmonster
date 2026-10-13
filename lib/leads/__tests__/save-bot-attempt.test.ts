import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}))

describe('saveBotAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
  })

  it('inserts a honeypot row without turnstileToken in payload', async () => {
    const { saveBotAttempt } = await import('../save-bot-attempt')
    await saveBotAttempt({
      reason: 'honeypot',
      email: 'bot@example.com',
      vorname: 'Bot',
      nachname: 'Spam',
      clientIp: '1.2.3.4',
      payload: { website: 'http://spam', turnstileToken: 'should-not-store' },
    })

    expect(mockFrom).toHaveBeenCalledWith('lead_bot_attempts')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'honeypot',
        email: 'bot@example.com',
        payload: expect.objectContaining({ website: 'http://spam' }),
      }),
    )
    const arg = mockInsert.mock.calls[0][0] as { payload: Record<string, unknown> }
    expect(arg.payload.turnstileToken).toBeUndefined()
  })

  it('does not throw when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'db down' } })
    const { saveBotAttempt } = await import('../save-bot-attempt')
    await expect(
      saveBotAttempt({ reason: 'captcha_failed', email: 'x@y.de' }),
    ).resolves.toBeUndefined()
  })
})
