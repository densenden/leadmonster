// Admin auth guard and page tests.
// These tests cover the three core auth flows: redirect when unauthenticated,
// render when authenticated, login form submit, error display, and sign-out.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }),
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

const mockGetUser = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}))

// --- Admin Layout (auth guard) ---

describe('app/admin/(protected)/layout.tsx — auth guard', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockClear()
  })

  it('redirects to /admin/login when getUser() returns null user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { default: AdminLayout } = await import('../(protected)/layout')

    await expect(
      async () => {
        const element = await AdminLayout({ children: React.createElement('div', null, 'content') })
        // For server components returning JSX directly, render it
        if (element) render(element as React.ReactElement)
      }
    ).rejects.toThrow('REDIRECT:/admin/login')
  })

  it('renders children when getUser() returns a valid user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.de' } },
      error: null,
    })

    const { default: AdminLayout } = await import('../(protected)/layout')

    const element = await AdminLayout({
      children: React.createElement('div', null, 'dashboard content'),
    })
    render(element as React.ReactElement)

    expect(screen.getByText('dashboard content')).toBeDefined()
  })
})

// --- Login Page ---

describe('app/admin/login/page.tsx — login form', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSignInWithPassword.mockClear()
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  it('calls signInWithPassword with the entered credentials on submit', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const { default: LoginPage } = await import('../login/page')
    render(React.createElement(LoginPage))

    fireEvent.change(screen.getByLabelText(/E-Mail/i), {
      target: { value: 'admin@test.de' },
    })
    fireEvent.change(screen.getByLabelText(/Passwort/i), {
      target: { value: 'secret123' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /Admin Login/i }))

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.de',
        password: 'secret123',
      })
    })
  })

  it('shows German error message on failed login and does not navigate', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    const { default: LoginPage } = await import('../login/page')
    render(React.createElement(LoginPage))

    fireEvent.change(screen.getByLabelText(/E-Mail/i), {
      target: { value: 'wrong@test.de' },
    })
    fireEvent.change(screen.getByLabelText(/Passwort/i), {
      target: { value: 'wrongpassword' },
    })
    fireEvent.submit(screen.getByRole('form', { name: /Admin Login/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Ungültige Anmeldedaten. Bitte erneut versuchen.')
      ).toBeDefined()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })
})

// --- Sign-Out Button ---

describe('app/admin/_components/sign-out-button.tsx — sign-out', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSignOut.mockClear()
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  it('calls signOut and redirects to /admin/login on click', async () => {
    mockSignOut.mockResolvedValue({ error: null })

    const { default: SignOutButton } = await import('../_components/sign-out-button')
    render(React.createElement(SignOutButton))

    fireEvent.click(screen.getByRole('button', { name: /Abmelden/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/admin/login')
    })
  })
})
