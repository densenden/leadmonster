'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MonsterLogo } from '@/components/MonsterLogo'

// Admin login page — Client Component.
// Admin accounts are created manually in Supabase dashboard only.
// No registration link is shown anywhere on this page.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Never expose raw Supabase error messages — show a friendly German message.
      setErrorMessage('Ungültige Anmeldedaten. Bitte erneut versuchen.')
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
        <h1 className="font-heading text-2xl text-center mb-6 text-[#333333]">
          Admin Login
        </h1>
        <form aria-label="Admin Login" onSubmit={handleSubmit} className="space-y-4">
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
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
