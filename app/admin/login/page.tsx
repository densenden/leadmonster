'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseEmailRedirectUrl } from '@/lib/supabase/auth-redirect-url'
import { MonsterLogo } from '@/components/MonsterLogo'

type LoginMode = 'sign-in' | 'reset-password'

// Admin login page — Client Component.
// Admin accounts are created manually in Supabase dashboard only.
// No registration link is shown anywhere on this page.
export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()

  function resetMessages() {
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    resetMessages()

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMessage('Ungültige Anmeldedaten. Bitte erneut versuchen.')
      setIsLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    resetMessages()

    const redirectTo = getSupabaseEmailRedirectUrl('/auth/callback?next=/admin/login/update-password', {
      requestOrigin: typeof window !== 'undefined' ? window.location.origin : null,
    })

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setIsLoading(false)

    if (error) {
      setErrorMessage('Passwort-Reset konnte nicht gestartet werden. Bitte erneut versuchen.')
      return
    }

    setSuccessMessage('Wenn ein Konto mit dieser E-Mail existiert, erhalten Sie in Kürze eine E-Mail von Supabase.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white shadow-md p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <MonsterLogo size={56} showText color="#02a9e6" textColor="#1a365d" />
        </div>
        <h1 className="font-heading text-2xl text-center mb-6 text-[#333333]">
          {mode === 'sign-in' ? 'Admin Login' : 'Passwort zurücksetzen'}
        </h1>

        {mode === 'sign-in' ? (
          <form aria-label="Admin Login" onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#666666] mb-1"
              >
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#666666] mb-1"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
              />
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  resetMessages()
                  setMode('reset-password')
                }}
                className="text-sm text-[#02a9e6] hover:underline"
              >
                Passwort vergessen?
              </button>
            </div>
            {errorMessage && (
              <p role="alert" className="text-red-600 text-sm">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#abd5f4] hover:bg-[#8fc4e8] text-white font-body py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        ) : (
          <form aria-label="Passwort zurücksetzen" onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-[#666666]">
              Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link von Supabase, um ein neues Passwort zu setzen.
            </p>
            <div>
              <label
                htmlFor="reset-email"
                className="block text-sm font-medium text-[#666666] mb-1"
              >
                E-Mail
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
              />
            </div>
            {errorMessage && (
              <p role="alert" className="text-red-600 text-sm">
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p role="status" className="text-green-700 text-sm">
                {successMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#abd5f4] hover:bg-[#8fc4e8] text-white font-body py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sende Link...' : 'Reset-Link senden'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetMessages()
                setMode('sign-in')
              }}
              className="w-full text-sm text-[#666666] hover:text-[#333333]"
            >
              Zurück zum Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
