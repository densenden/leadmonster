'use client'

// Hard-delete for archived products only.
// Status changes (entwurf / aktiv / archiviert) live in ProduktStatusToggle.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProduktStatus } from '@/lib/supabase/types'

interface ProduktArchiveActionsProps {
  id: string
  name: string
  status: ProduktStatus
}

export function ProduktArchiveActions({ id, name, status }: ProduktArchiveActionsProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status !== 'archiviert') {
    return null
  }

  async function handleHardDelete() {
    if (
      !window.confirm(
        `Produkt "${name}" ENDGÜLTIG löschen?\n\nCascade auf produkt_config, generierter_content (alle Hauptseiten + Ratgeber) und email_sequenzen. Leads bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return
    }
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/produkte/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error?.message ?? json.error?.code ?? `Fehler ${res.status}`)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleHardDelete}
        disabled={isPending}
        className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
        title="Cascade-Delete des Produkts samt aller Inhalte"
      >
        {isPending ? 'Lösche…' : 'Endgültig löschen'}
      </button>
      {error && (
        <p role="alert" className="text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
