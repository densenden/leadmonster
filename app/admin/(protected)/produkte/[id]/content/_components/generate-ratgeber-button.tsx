'use client'

// Generate-Ratgeber: Inline-Form mit animiertem Status-Panel
// (MonsterLogo + Schritt-Cycle + Progress-Bar) analog zum Haupt-Generator.
// Koordiniert via GenerationLockProvider, damit nicht zwei Generatoren
// gleichzeitig laufen — der API-Pfad ist nicht concurrent-safe.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MonsterLogo } from '@/components/MonsterLogo'
import { useGenerationLock } from './generation-lock'

interface GenerateRatgeberButtonProps {
  /** Supabase UUID of the product for which to generate a ratgeber article. */
  produktId: string
}

// Schritt-Liste speziell für einen einzelnen Ratgeber (kürzer als Haupt-Generator).
// Summe deckt typische 30–80s Generierungsdauer ab.
const STEPS = [
  { label: 'Wissensbasis wird gelesen…',         duration: 4_000 },
  { label: 'Thema wird recherchiert…',            duration: 8_000 },
  { label: 'Artikel-Struktur wird erstellt…',     duration: 8_000 },
  { label: 'Inhalte werden geschrieben…',         duration: 24_000 },
  { label: 'Auto-Cross-Linking läuft…',           duration: 6_000 },
  { label: 'SEO-Schemata werden gesetzt…',        duration: 4_000 },
  { label: 'Letzte Schritte — fast fertig…',      duration: 999_999 },
]

export function GenerateRatgeberButton({ produktId }: GenerateRatgeberButtonProps) {
  const router = useRouter()
  const lock = useGenerationLock()

  const [isExpanded, setIsExpanded] = useState(false)
  const [topic, setTopic] = useState('')
  const [validationError, setValidationError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isGenerating = lock.lockedBy === 'ratgeber'
  const blockedByOther = lock.lockedBy !== null && lock.lockedBy !== 'ratgeber'

  const [stepIndex, setStepIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Step-Cycle + Elapsed-Counter — startet bei isGenerating=true.
  useEffect(() => {
    if (!isGenerating) {
      setStepIndex(0)
      setElapsed(0)
      return
    }
    const startedAt = Date.now()
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 250)
    let cumulative = 0
    const stepTimers: ReturnType<typeof setTimeout>[] = []
    STEPS.forEach((step, i) => {
      cumulative += step.duration
      stepTimers.push(setTimeout(() => setStepIndex(i + 1), cumulative))
    })
    return () => {
      clearInterval(tick)
      stepTimers.forEach(clearTimeout)
    }
  }, [isGenerating])

  function handleToggle() {
    if (blockedByOther) return
    setIsExpanded(prev => !prev)
    setValidationError('')
    setErrorMessage('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError('')
    setErrorMessage('')

    const trimmed = topic.trim()
    if (!trimmed) {
      setValidationError('Bitte geben Sie ein Thema oder einen Slug-Vorschlag ein.')
      return
    }

    if (!lock.acquire('ratgeber')) {
      setErrorMessage('Anderer Generator läuft gerade — bitte warten.')
      return
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produktId, pageType: 'ratgeber', topic: trimmed }),
      })

      if (res.ok || res.status === 201) {
        setTopic('')
        setIsExpanded(false)
        // Server-Component neu laden → frisch generierter Artikel taucht in
        // der Tabelle oben auf, ohne dass der User F5 drücken muss.
        router.refresh()
        return
      }

      let errorText = `Generierung fehlgeschlagen (HTTP ${res.status}).`
      try {
        const body = await res.json() as { error?: { message?: string; code?: string } }
        if (body.error?.message) errorText = body.error.message
        else if (body.error?.code) errorText = body.error.code
      } catch {
        // Body war kein JSON — Default-Message bleibt
      }
      setErrorMessage(errorText)
    } catch (err) {
      setErrorMessage(`Netzwerkfehler: ${err instanceof Error ? err.message : 'unbekannt'}`)
    } finally {
      lock.release('ratgeber')
    }
  }

  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)]

  return (
    <div className="mt-4 space-y-3">
      {/* Trigger button — versteckt während Form expanded oder Generierung läuft */}
      {!isExpanded && !isGenerating && (
        <button
          onClick={handleToggle}
          disabled={blockedByOther}
          title={blockedByOther ? 'Anderer Generator läuft — bitte warten' : undefined}
          className="bg-[#1a3252] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#02a9e6] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Weiteren Ratgeber generieren
        </button>
      )}

      {/* Hinweis, wenn Haupt-Generator aktiv ist */}
      {blockedByOther && !isExpanded && (
        <p className="text-xs text-[#666666]">
          Haupt-Generator läuft gerade — neuer Ratgeber kann erst gestartet werden, wenn dieser fertig ist.
        </p>
      )}

      {/* Inline-Form */}
      {isExpanded && !isGenerating && (
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
              placeholder="z.B. kosten-leistungen"
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:ring-2 focus:ring-[#36afeb]"
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
              disabled={blockedByOther}
              className="bg-[#1a3252] px-4 py-2 text-sm font-medium text-white hover:bg-[#02a9e6] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generieren
            </button>
            <button
              type="button"
              onClick={handleToggle}
              className="px-4 py-2 text-sm font-medium text-[#666666] hover:text-[#333333] focus:outline-none"
            >
              Abbrechen
            </button>
          </div>

          {errorMessage && (
            <pre className="mt-3 text-xs text-red-700 whitespace-pre-wrap break-words bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-auto">
              {errorMessage}
            </pre>
          )}
        </form>
      )}

      {/* Animated loading panel — identisch zu GenerateButton */}
      {isGenerating && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-[#e1f0fb] border border-[#02a9e6]/30 animate-pulse-slow">
          <div className="monster-bounce flex-shrink-0">
            <MonsterLogo color="#02a9e6" size={56} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1a3252] truncate">{currentStep.label}</p>
            <p className="text-xs text-[#4a5568] mt-0.5">
              Schritt {Math.min(stepIndex + 1, STEPS.length)} von {STEPS.length} · {elapsed}s vergangen
            </p>
            <div className="mt-2 h-1 bg-white rounded overflow-hidden">
              <div
                className="h-full bg-[#02a9e6] transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, ((stepIndex + 1) / STEPS.length) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error außerhalb der Form (z.B. Netzwerkfehler nach Submit) */}
      {!isExpanded && !isGenerating && errorMessage && (
        <pre className="text-xs text-red-700 whitespace-pre-wrap break-words bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-auto">
          {errorMessage}
        </pre>
      )}

      <style jsx>{`
        .monster-bounce {
          animation: monster-bounce 1.4s ease-in-out infinite;
        }
        @keyframes monster-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px) rotate(-3deg); }
        }
      `}</style>
    </div>
  )
}
