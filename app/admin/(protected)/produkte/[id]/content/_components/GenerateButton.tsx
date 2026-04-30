'use client'

// Client component button that calls /api/generate to trigger content generation.
// While generating: shows an animated MonsterLogo + cycling progress steps so
// the user gets feedback during the 30–180s wait.
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MonsterLogo } from '@/components/MonsterLogo'
import { useGenerationLock } from './generation-lock'

interface GenerateButtonProps {
  produktId: string
}

// Steps the user sees cycling while generation runs server-side.
// Sum of timings should comfortably exceed average generation time (~60-120s).
const STEPS = [
  { label: 'Wissensbasis wird gelesen…',                  duration: 4_000 },
  { label: 'Hauptseite wird formuliert…',                 duration: 18_000 },
  { label: 'FAQ wird generiert…',                          duration: 16_000 },
  { label: 'Anbieter-Vergleich wird zusammengestellt…',   duration: 16_000 },
  { label: 'Tarif-Inhalte werden geschrieben…',           duration: 14_000 },
  { label: 'Ratgeber-Artikel werden verfasst…',           duration: 24_000 },
  { label: 'Auto-Cross-Linking läuft…',                    duration: 8_000 },
  { label: 'Hero-Bild wird generiert…',                    duration: 16_000 },
  { label: 'SEO-Schemata werden gesetzt…',                 duration: 6_000 },
  { label: 'Letzte Schritte — fast fertig…',               duration: 999_999 },
]

export function GenerateButton({ produktId }: GenerateButtonProps) {
  const router = useRouter()
  const lock = useGenerationLock()
  const isGenerating = lock.lockedBy === 'main'
  const blockedByOther = lock.lockedBy !== null && lock.lockedBy !== 'main'
  const [error, setError] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Cycle through the labelled steps while the request is in flight.
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

  async function handleGenerate() {
    setError('')
    if (!lock.acquire('main')) {
      setError('Anderer Generator läuft gerade — bitte warten.')
      return
    }
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produktId }),
      })
      if (!res.ok) {
        let detail = ''
        try {
          const json = await res.json()
          detail = json.error?.message ?? json.error?.code ?? json.message ?? JSON.stringify(json).slice(0, 300)
        } catch {
          detail = await res.text().catch(() => '')
        }
        setError(`Generierung fehlgeschlagen (HTTP ${res.status})${detail ? ': ' + detail : ''}`)
        return
      }
      router.refresh()
    } catch (err) {
      setError(`Netzwerkfehler: ${err instanceof Error ? err.message : 'unbekannt'}`)
    } finally {
      lock.release('main')
    }
  }

  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)]

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={isGenerating || blockedByOther}
        title={blockedByOther ? 'Anderer Generator läuft — bitte warten' : undefined}
        className="inline-flex items-center gap-2 bg-[#1a3252] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#02a9e6] focus:outline-none focus:ring-2 focus:ring-[#02a9e6]/50 rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? 'Generiere…' : blockedByOther ? 'Generator blockiert…' : 'Content generieren'}
      </button>

      {/* Animated loading panel */}
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
            {/* Determinate-ish progress bar based on cumulative step durations */}
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

      {error && (
        <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap break-words bg-red-50 border border-red-200 rounded p-3 max-h-60 overflow-auto">
          {error}
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
