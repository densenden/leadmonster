import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CookieConsentProvider } from '../CookieConsent'
import { CONSENT_STORAGE_KEY } from '@/lib/cookies/consent'

const mockPathname = vi.fn(() => '/')

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

describe('CookieConsent', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/')
    localStorage.clear()
    document.cookie = 'lm_consent=; Max-Age=0; Path=/'
  })

  it('shows banner when no consent is stored', async () => {
    render(
      <CookieConsentProvider>
        <div>page</div>
      </CookieConsentProvider>,
    )

    expect(await screen.findByRole('region', { name: 'Cookie-Hinweis' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Alle akzeptieren' })).toBeDefined()
  })

  it('hides banner after accepting necessary cookies only', async () => {
    const user = userEvent.setup()
    render(
      <CookieConsentProvider>
        <div>page</div>
      </CookieConsentProvider>,
    )

    await user.click(await screen.findByRole('button', { name: 'Nur notwendige' }))

    expect(screen.queryByRole('region', { name: 'Cookie-Hinweis' })).toBeNull()
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    expect(stored).toContain('"statistics":false')
  })

  it('does not show banner on admin routes', async () => {
    mockPathname.mockReturnValue('/admin/leads')
    render(
      <CookieConsentProvider>
        <div>admin</div>
      </CookieConsentProvider>,
    )

    expect(screen.queryByRole('region', { name: 'Cookie-Hinweis' })).toBeNull()
  })
})
