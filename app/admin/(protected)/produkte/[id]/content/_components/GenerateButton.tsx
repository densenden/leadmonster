'use client'

// Client component button that calls /api/generate to trigger content generation.
// Placed in a separate file so the parent content page stays a Server Component.
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GenerateButtonProps {
  produktId: string
}

export function GenerateButton({ produktId }: GenerateButtonProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setIsGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produktId }),
      })
      if (!res.ok) {
        setError('Generierung fehlgeschlagen. Bitte erneut versuchen.')
        return
      }
      router.refresh()
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none disabled:opacity-50"
      >
        {isGenerating ? 'Generiert...' : 'Content generieren'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
