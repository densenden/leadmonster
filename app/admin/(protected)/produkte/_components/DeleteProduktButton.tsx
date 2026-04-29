'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteProduktButtonProps {
  id: string
  name: string
}

export function DeleteProduktButton({ id, name }: DeleteProduktButtonProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Produkt "${name}" wirklich löschen?\n\nAlle generierten Inhalte werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }

    setIsPending(true)
    try {
      const res = await fetch(`/api/admin/produkte/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        alert(`Fehler beim Löschen: ${body?.error?.code ?? 'Unbekannter Fehler'}`)
        return
      }
      router.refresh()
    } catch {
      alert('Netzwerkfehler beim Löschen.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-sm text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {isPending ? 'Lösche…' : 'Löschen'}
    </button>
  )
}
