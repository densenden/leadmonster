'use client'

// Inline-Bestätigung pro Row — kein globales Modal.
import { useState, useTransition } from 'react'
import { deleteRedirect } from '@/app/admin/redirects/actions'

interface Props {
  legacyPath: string
}

export function DeleteRedirect({ legacyPath }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => { setError(undefined); setConfirming(true) }}
        className="text-xs text-red-600 hover:text-red-800 hover:underline focus:outline-none"
      >
        Löschen
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] text-[#333]">Wirklich löschen?</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              const r = await deleteRedirect(legacyPath)
              if (!r.success) {
                setError(r.error ?? 'Löschen fehlgeschlagen')
                setConfirming(false)
              }
            })
          }}
          disabled={isPending}
          className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? '…' : 'OK'}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setError(undefined) }}
          className="rounded border border-gray-300 px-2 py-0.5 text-[11px] text-[#666] hover:bg-gray-50"
        >
          ×
        </button>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
