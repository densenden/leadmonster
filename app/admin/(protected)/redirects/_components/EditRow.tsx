'use client'

// Klappbare Inline-Edit-Zeile pro Redirect.
// Klick auf "Bearbeiten" zeigt das Formular direkt unter der Zeile an.
import { useState, useTransition } from 'react'
import { updateRedirect } from '@/app/admin/redirects/actions'

interface Props {
  legacyPath: string
  targetPath: string
  status: number
  notiz: string | null
}

export function EditRow({ legacyPath, targetPath, status, notiz }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | string[]> | undefined>()
  const [isPending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setError(undefined); setFieldErrors(undefined); setOpen(true) }}
        className="text-xs text-[#02a9e6] hover:underline focus:outline-none"
      >
        Bearbeiten
      </button>
    )
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const r = await updateRedirect(legacyPath, formData)
          if (r.success) {
            setOpen(false)
          } else {
            setError(r.error)
            setFieldErrors(r.fieldErrors)
          }
        })
      }}
      className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr] gap-2 items-start mt-2"
    >
      <div>
        <input
          name="target_path"
          defaultValue={targetPath}
          required
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          placeholder="/ziel-pfad"
        />
        {fieldErrors?.target_path && (
          <p className="text-[11px] text-red-600 mt-0.5">{Array.from([fieldErrors.target_path]).flat().join(', ')}</p>
        )}
      </div>
      <select
        name="status"
        defaultValue={status}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      >
        <option value="301">301 (permanent)</option>
        <option value="302">302 (temporary)</option>
      </select>
      <input
        name="notiz"
        defaultValue={notiz ?? ''}
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        placeholder="Notiz (optional)"
      />
      <div className="sm:col-span-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[#1a3252] px-3 py-1 text-xs font-medium text-white hover:bg-[#1a3252]/90 disabled:opacity-60"
        >
          {isPending ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(undefined); setFieldErrors(undefined) }}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-[#666] hover:bg-gray-50"
        >
          Abbrechen
        </button>
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>
    </form>
  )
}
