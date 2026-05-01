'use client'

// Soft-Delete für Produkte. Ersetzt den früheren DeleteProduktButton.
//
// Modi:
//   status !== 'archiviert'  → ein Button "Archivieren" (orange)
//                              setzt status='archiviert' via /status PATCH.
//                              Reversibel — Status-Toggle oder Wiederherstellen
//                              bringt das Produkt zurück.
//
//   status === 'archiviert'  → zwei Buttons:
//                              [Wiederherstellen] (cyan) → status='entwurf'
//                              [Endgültig löschen] (rot)   → DELETE
//                              Endgültig-löschen ist hard: cascade auf
//                              produkt_config / generierter_content / email_sequenzen.
//                              Leads bleiben (kein FK-Cascade).

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

  async function patchStatus(nextStatus: ProduktStatus) {
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/produkte/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error?.message ?? `Fehler ${res.status}`)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsPending(false)
    }
  }

  async function handleArchive() {
    if (!window.confirm(
      `Produkt "${name}" archivieren?\n\nDas Produkt verschwindet von der Startseite und der Sitemap, bleibt aber in der DB. Sie können es jederzeit wiederherstellen.`,
    )) {
      return
    }
    await patchStatus('archiviert')
  }

  async function handleRestore() {
    await patchStatus('entwurf')
  }

  async function handleHardDelete() {
    if (!window.confirm(
      `Produkt "${name}" ENDGÜLTIG löschen?\n\nCascade auf produkt_config, generierter_content (alle Hauptseiten + Ratgeber) und email_sequenzen. Leads bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden.`,
    )) {
      return
    }
    setIsPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/produkte/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error?.message ?? `Fehler ${res.status}`)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsPending(false)
    }
  }

  if (status === 'archiviert') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={isPending}
            className="text-xs font-semibold text-[#02a9e6] hover:text-[#1a3252] hover:underline disabled:opacity-50"
            title="Status auf Entwurf zurücksetzen"
          >
            {isPending ? '…' : 'Wiederherstellen'}
          </button>
          <span className="text-gray-300 text-xs" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleHardDelete}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
            title="Cascade-Delete des Produkts samt aller Inhalte"
          >
            Endgültig löschen
          </button>
        </div>
        {error && <p role="alert" className="text-[11px] text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleArchive}
        disabled={isPending}
        className="text-xs font-semibold text-orange-600 hover:text-orange-800 hover:underline disabled:opacity-50"
        title="Soft-Delete: Status auf archiviert. Reversibel."
      >
        {isPending ? 'Archiviere…' : 'Archivieren'}
      </button>
      {error && <p role="alert" className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
