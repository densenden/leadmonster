'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function BildDeleteButton({ id, altText }: { id: string; altText: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!window.confirm(`Bild „${altText}" wirklich löschen?`)) return
    setError('')
    startTransition(async () => {
      const res = await fetch(`/api/admin/bilder/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error?.message ?? 'Fehler beim Löschen')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
      >
        {isPending ? 'Löscht…' : 'Löschen'}
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
