'use client'

// Inline delete confirmation widget scoped to a single table row.
// No global modal or state — confirmation state is local to each row.
import { useState, useTransition } from 'react'
import { deleteArtikel } from '@/app/admin/wissensfundus/actions'

interface DeleteConfirmProps {
  id: string
}

export function DeleteConfirm({ id }: DeleteConfirmProps) {
  // Controls whether the confirm/cancel prompt is visible.
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  function handleDeleteClick() {
    setError(undefined)
    setConfirming(true)
  }

  function handleCancel() {
    setConfirming(false)
    setError(undefined)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteArtikel(id)
      if (!result.success) {
        setError(result.error ?? 'Löschen fehlgeschlagen.')
        setConfirming(false)
      }
      // On success next/cache revalidatePath triggers re-render of the list.
    })
  }

  if (!confirming) {
    return (
      <button
        onClick={handleDeleteClick}
        className="text-sm text-red-600 hover:text-red-800 hover:underline focus:outline-none"
      >
        Löschen
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-[#333333]">Artikel wirklich löschen?</p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? 'Löschen…' : 'Bestätigen'}
        </button>
        <button
          onClick={handleCancel}
          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-[#666666] hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
