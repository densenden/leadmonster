'use client'

import { useState, useTransition, useRef } from 'react'
import { createRedirect } from '@/app/admin/redirects/actions'

export function AddForm() {
  const [error, setError] = useState<string | undefined>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | string[]> | undefined>()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          const r = await createRedirect(formData)
          if (r.success) {
            formRef.current?.reset()
            setError(undefined)
            setFieldErrors(undefined)
          } else {
            setError(r.error)
            setFieldErrors(r.fieldErrors)
          }
        })
      }}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-6"
    >
      <h2 className="font-semibold text-[#1a3252] mb-3 text-sm">Neuen Redirect anlegen</h2>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_1fr_auto] gap-2 items-start">
        <div>
          <input
            name="legacy_path"
            required
            placeholder="/alter-pfad"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          {fieldErrors?.legacy_path && (
            <p className="text-[11px] text-red-600 mt-0.5">{Array.from([fieldErrors.legacy_path]).flat().join(', ')}</p>
          )}
        </div>
        <div>
          <input
            name="target_path"
            required
            placeholder="/ziel-pfad"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          {fieldErrors?.target_path && (
            <p className="text-[11px] text-red-600 mt-0.5">{Array.from([fieldErrors.target_path]).flat().join(', ')}</p>
          )}
        </div>
        <select
          name="status"
          defaultValue={301}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="301">301</option>
          <option value="302">302</option>
        </select>
        <input
          name="notiz"
          placeholder="Notiz (optional)"
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[#1a3252] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1a3252]/90 disabled:opacity-60"
        >
          {isPending ? '…' : 'Anlegen'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </form>
  )
}
