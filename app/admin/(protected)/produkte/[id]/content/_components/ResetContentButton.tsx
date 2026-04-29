'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResetContentButtonProps {
  produktId: string
}

export function ResetContentButton({ produktId }: ResetContentButtonProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleReset() {
    if (!window.confirm('Generierten Content zurücksetzen?\n\nAlle Seiten (außer Ratgeber-Artikeln) werden gelöscht. Ratgeber bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    setIsPending(true)
    try {
      const res = await fetch(`/api/admin/produkte/${produktId}/content/reset`, { method: 'POST' })
      if (!res.ok) {
        alert('Fehler beim Zurücksetzen des Contents.')
        return
      }
      router.refresh()
    } catch {
      alert('Netzwerkfehler.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={isPending}
      className="text-sm text-[#666666] border border-gray-300 px-3 py-2 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Setzt zurück…' : 'Content zurücksetzen'}
    </button>
  )
}
