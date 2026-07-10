'use client'

// Inline status switch for the admin product list.
// Three-state pill: Entwurf · Aktiv · Archiviert — sole control for status on this page.
// Click triggers PATCH /api/admin/produkte/[id]/status and a router.refresh().
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProduktStatus } from '@/lib/supabase/types'

interface ProduktStatusToggleProps {
  produktId: string
  produktName: string
  initialStatus: ProduktStatus
}

const ALL_STATUS: ProduktStatus[] = ['entwurf', 'aktiv', 'archiviert']

const LABEL: Record<ProduktStatus, string> = {
  entwurf: 'Entwurf',
  aktiv: 'Aktiv',
  archiviert: 'Archiv',
}

const STYLE_ACTIVE: Record<ProduktStatus, string> = {
  entwurf: 'bg-amber-100 text-amber-800 border-amber-300',
  aktiv: 'bg-green-100 text-green-800 border-green-400',
  archiviert: 'bg-gray-200 text-gray-700 border-gray-400',
}

const STYLE_INACTIVE = 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-700'

function apiErrorMessage(
  json: { error?: { code?: string; message?: string } },
  httpStatus: number,
): string {
  return json.error?.message ?? json.error?.code ?? `Fehler ${httpStatus}`
}

export function ProduktStatusToggle({
  produktId,
  produktName,
  initialStatus,
}: ProduktStatusToggleProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ProduktStatus>(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  function handleClick(next: ProduktStatus) {
    if (next === status || isPending) return

    if (next === 'archiviert') {
      const confirmed = window.confirm(
        `Produkt "${produktName}" archivieren?\n\nDas Produkt verschwindet von der Startseite und der Sitemap, bleibt aber in der DB. Sie können es jederzeit über den Status wieder aktivieren.`,
      )
      if (!confirmed) return
    }

    setError(null)
    const previous = status
    // Optimistisch wechseln, bei Fehler zurückrollen.
    setStatus(next)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/produkte/${produktId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          setError(apiErrorMessage(json, res.status))
          setStatus(previous)
          return
        }
        // Server-Components mit den frischen Daten neu rendern.
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Netzwerkfehler')
        setStatus(previous)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        role="group"
        aria-label="Produkt-Status ändern"
        className="inline-flex border border-gray-200 rounded-full p-0.5 bg-gray-50 self-start"
      >
        {ALL_STATUS.map(s => {
          const active = s === status
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleClick(s)}
              disabled={isPending}
              aria-pressed={active}
              className={[
                'px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-150 border',
                'focus:outline-none focus:ring-2 focus:ring-[#abd5f4]',
                active ? STYLE_ACTIVE[s] : STYLE_INACTIVE,
                isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer',
              ].join(' ')}
            >
              {LABEL[s]}
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
