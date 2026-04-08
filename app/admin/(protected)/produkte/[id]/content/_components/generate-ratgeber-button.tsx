'use client'

// Client component for triggering ratgeber article generation from the admin content page.
// Renders a button that expands an inline form asking for a topic/slug suggestion.
// Posts to /api/generate with pageType = 'ratgeber' and the entered topic.
import { useState } from 'react'

interface GenerateRatgeberButtonProps {
  /** Supabase UUID of the product for which to generate a ratgeber article. */
  produktId: string
}

export function GenerateRatgeberButton({ produktId }: GenerateRatgeberButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [topic, setTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function handleToggle() {
    setIsExpanded(prev => !prev)
    setValidationError('')
    setSuccessMessage('')
    setErrorMessage('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')
    setSuccessMessage('')
    setErrorMessage('')

    // Client-side validation — topic must not be empty
    const trimmed = topic.trim()
    if (!trimmed) {
      setValidationError('Bitte geben Sie ein Thema oder einen Slug-Vorschlag ein.')
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produktId, pageType: 'ratgeber', topic: trimmed }),
      })

      if (res.ok || res.status === 201) {
        setSuccessMessage('Ratgeber wird generiert — bitte Seite neu laden.')
        setTopic('')
        setIsExpanded(false)
        return
      }

      let errorText = 'Generierung fehlgeschlagen. Bitte erneut versuchen.'
      try {
        const body = await res.json() as { error?: { message?: string } }
        if (body.error?.message) {
          errorText = body.error.message
        }
      } catch {
        // JSON parse failed — use default message
      }
      setErrorMessage(errorText)
    } catch {
      setErrorMessage('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="mt-4">
      {/* Trigger button */}
      {!isExpanded && (
        <button
          onClick={handleToggle}
          className="bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none disabled:opacity-50"
        >
          Weiteren Ratgeber generieren
        </button>
      )}

      {/* Inline expand form */}
      {isExpanded && (
        <form
          onSubmit={handleSubmit}
          className="border border-gray-200 bg-[#f9fafb] p-4"
          noValidate
        >
          <p className="text-sm font-medium text-[#333333] mb-3">
            Weiteren Ratgeber generieren
          </p>

          <div className="mb-3">
            <label htmlFor="ratgeber-topic" className="block text-sm font-light text-[#666666] mb-1">
              Thema / Slug-Vorschlag (z.B. <em>fuer-wen</em>, <em>kosten-leistungen</em>)
            </label>
            <input
              id="ratgeber-topic"
              type="text"
              value={topic}
              onChange={e => {
                setTopic(e.target.value)
                if (validationError) setValidationError('')
              }}
              disabled={isGenerating}
              placeholder="z.B. kosten-leistungen"
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:ring-2 focus:ring-[#36afeb] disabled:opacity-50"
            />
            {validationError && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {validationError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isGenerating}
              className="bg-[#1a365d] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Wird generiert\u2026' : 'Generieren'}
            </button>
            <button
              type="button"
              onClick={handleToggle}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-[#666666] hover:text-[#333333] focus:outline-none disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>

          {errorMessage && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {errorMessage}
            </p>
          )}
        </form>
      )}

      {/* Success message — displayed after the form is hidden */}
      {successMessage && (
        <p role="status" className="mt-3 text-sm text-green-700">
          {successMessage}
        </p>
      )}
    </div>
  )
}
