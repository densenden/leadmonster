// Tests for Task Group 4 — SettingsForm client component.
// saveSettings server action and fetch are mocked — no real network calls.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSaveSettings = vi.fn()

vi.mock('@/app/admin/einstellungen/actions', () => ({
  saveSettings: mockSaveSettings,
}))

// Mock next/headers for any transitively imported server modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() })),
}))

// ---------------------------------------------------------------------------
// Default props
// ---------------------------------------------------------------------------

const DEFAULT_PROPS = {
  confluenceBaseUrl: 'https://company.atlassian.net',
  confluenceEmail: 'admin@company.com',
  confluenceApiToken: 'secret-token',
  confluenceSpaceKey: 'LEADS',
  confluenceParentPageId: '12345',
  salesNotificationEmail: 'vertrieb@company.de',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsForm — field rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('renders all six labeled input fields with values from props', async () => {
    const { SettingsForm } = await import(
      '@/app/admin/(protected)/einstellungen/_components/settings-form'
    )
    render(React.createElement(SettingsForm, DEFAULT_PROPS))

    // Verify all six labeled inputs are present (using specific label texts)
    expect(screen.getByLabelText('Confluence URL')).toBeDefined()
    expect(screen.getByLabelText('E-Mail-Adresse')).toBeDefined()
    expect(screen.getByLabelText('API-Token')).toBeDefined()
    expect(screen.getByLabelText('Space-Key')).toBeDefined()
    expect(screen.getByLabelText('Parent Page ID')).toBeDefined()
    expect(screen.getByLabelText('Benachrichtigungs-E-Mail (Vertrieb)')).toBeDefined()

    // Verify values are pre-filled from props
    const urlInput = screen.getByLabelText('Confluence URL') as HTMLInputElement
    expect(urlInput.value).toBe('https://company.atlassian.net')

    const emailInput = screen.getByLabelText('E-Mail-Adresse') as HTMLInputElement
    expect(emailInput.value).toBe('admin@company.com')

    const tokenInput = screen.getByLabelText('API-Token') as HTMLInputElement
    expect(tokenInput.value).toBe('secret-token')

    const spaceInput = screen.getByLabelText('Space-Key') as HTMLInputElement
    expect(spaceInput.value).toBe('LEADS')

    const parentInput = screen.getByLabelText('Parent Page ID') as HTMLInputElement
    expect(parentInput.value).toBe('12345')

    const salesInput = screen.getByLabelText('Benachrichtigungs-E-Mail (Vertrieb)') as HTMLInputElement
    expect(salesInput.value).toBe('vertrieb@company.de')
  })
})

describe('SettingsForm — API-Token show/hide toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('toggles confluence_api_token between password and text type without clearing the value', async () => {
    const { SettingsForm } = await import(
      '@/app/admin/(protected)/einstellungen/_components/settings-form'
    )
    render(React.createElement(SettingsForm, DEFAULT_PROPS))

    const tokenInput = screen.getByLabelText('API-Token') as HTMLInputElement

    // Default: type="password"
    expect(tokenInput.type).toBe('password')
    expect(tokenInput.value).toBe('secret-token')

    // Click the toggle button — aria-label is "Passwort anzeigen" when hidden
    const toggleButton = screen.getByLabelText(/anzeigen|verbergen/i)
    fireEvent.click(toggleButton)

    // After toggle: type="text", value unchanged
    expect(tokenInput.type).toBe('text')
    expect(tokenInput.value).toBe('secret-token')

    // Toggle back: type="password" again, value still unchanged
    fireEvent.click(toggleButton)
    expect(tokenInput.type).toBe('password')
    expect(tokenInput.value).toBe('secret-token')
  })
})

describe('SettingsForm — save action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('displays "Einstellungen gespeichert." after saveSettings returns { success: true }', async () => {
    mockSaveSettings.mockResolvedValue({ success: true })

    const { SettingsForm } = await import(
      '@/app/admin/(protected)/einstellungen/_components/settings-form'
    )
    render(React.createElement(SettingsForm, DEFAULT_PROPS))

    const saveButton = screen.getByRole('button', { name: /speichern/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Einstellungen gespeichert.')).toBeDefined()
    })
  })

  it('displays the returned error message when saveSettings returns { success: false }', async () => {
    mockSaveSettings.mockResolvedValue({ success: false, error: 'Bitte eine gültige URL eingeben.' })

    const { SettingsForm } = await import(
      '@/app/admin/(protected)/einstellungen/_components/settings-form'
    )
    render(React.createElement(SettingsForm, DEFAULT_PROPS))

    const saveButton = screen.getByRole('button', { name: /speichern/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Bitte eine gültige URL eingeben.')).toBeDefined()
    })
  })
})

describe('SettingsForm — test connection button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('displays green badge with "Verbindung erfolgreich" when fetch returns { success: true }', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: 'Verbindung erfolgreich.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { SettingsForm } = await import(
      '@/app/admin/(protected)/einstellungen/_components/settings-form'
    )
    render(React.createElement(SettingsForm, DEFAULT_PROPS))

    const testButton = screen.getByRole('button', { name: /verbindung testen/i })
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(screen.getByText(/verbindung erfolgreich/i)).toBeDefined()
    })

    fetchSpy.mockRestore()
  })
})
