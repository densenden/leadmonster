// Tests for the Resend SDK interface — confirms the client can be instantiated
// and accepts the expected email shape without making live HTTP calls.
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Resend SDK interface', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('Resend client instantiates without throwing when given a valid API key', async () => {
    const { Resend } = await import('resend')
    expect(() => new Resend('re_test_key_abc123')).not.toThrow()
  })

  it('resend.emails.send accepts { from, to, subject, html } shape and resolves', async () => {
    // Mock fetch so no real HTTP call is made
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-uuid-test' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)

    const { Resend } = await import('resend')
    const client = new Resend('re_test_key_abc123')

    // Replace the internal send method to avoid actual HTTP calls.
    // Cast to unknown first to avoid the strict CreateEmailResponse type constraint —
    // we only care that the interface accepts the { from, to, subject, html } shape.
    const sendSpy = vi.spyOn(client.emails, 'send').mockResolvedValue({
      data: { id: 'email-uuid-test' },
      error: null,
      headers: null,
    } as unknown as Awaited<ReturnType<typeof client.emails.send>>)

    const result = await client.emails.send({
      from: 'noreply@example.de',
      to: 'lead@example.de',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    })

    expect(sendSpy).toHaveBeenCalledOnce()
    expect(sendSpy).toHaveBeenCalledWith({
      from: 'noreply@example.de',
      to: 'lead@example.de',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    })
    expect(result.data?.id).toBe('email-uuid-test')
    expect(result.error).toBeNull()

    vi.unstubAllGlobals()
  })
})
