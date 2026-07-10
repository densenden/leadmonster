'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MonsterLogo } from '@/components/MonsterLogo'

// Shown after invite or password-reset email — user already has a session from /auth/callback.
export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')

    if (password.length < 12) {
      setErrorMessage('Passwort muss mindestens 12 Zeichen lang sein.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwörter stimmen nicht überein.')
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMessage('Passwort konnte nicht gesetzt werden. Bitte den Link aus der E-Mail erneut öffnen.')
      setIsLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="bg-white shadow-md p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <MonsterLogo size={56} showText color="#02a9e6" textColor="#1a365d" />
        </div>
        <h1 className="font-heading text-2xl text-center mb-2 text-[#333333]">
          Neues Passwort setzen
        </h1>
        <p className="text-sm text-center text-[#666666] mb-6">
          Wählen Sie ein sicheres Passwort für Ihren Admin-Zugang.
        </p>
        <form aria-label="Neues Passwort setzen" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#666666] mb-1">
              Neues Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
              className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#666666] mb-1">
              Passwort bestätigen
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
              className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            />
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
            {isLoading ? 'Speichern...' : 'Passwort speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
