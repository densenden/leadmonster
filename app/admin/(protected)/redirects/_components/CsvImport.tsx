'use client'

import { useState, useTransition, useRef } from 'react'
import { importRedirectsCsv } from '@/app/admin/redirects/actions'

export function CsvImport() {
  const [result, setResult] = useState<
    { inserted: number; skipped: number; errors: Array<{ row: number; message: string }> } | null
  >(null)
  const [error, setError] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <details className="bg-white border border-gray-200 rounded-lg p-4 mt-8">
      <summary className="cursor-pointer font-semibold text-[#1a3252] text-sm">
        CSV-Bulk-Import (z. B. Screaming-Frog-Export)
      </summary>
      <p className="text-xs text-gray-500 mt-2 mb-3">
        Header-Zeile: <code>legacy_path,target_path,status,notiz</code>.
        Doppelte Pfade werden überschrieben (upsert). Status optional, Default 301.
      </p>
      <form
        ref={formRef}
        action={(formData) => {
          startTransition(async () => {
            setError(undefined)
            setResult(null)
            const r = await importRedirectsCsv(formData)
            if (!r.success) {
              setError(r.error)
            } else if (r.data) {
              setResult({
                inserted: r.data.inserted,
                skipped: r.data.skipped,
                errors: r.data.errors,
              })
              formRef.current?.reset()
            }
          })
        }}
        className="flex items-center gap-3"
      >
        <input
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="text-xs"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-[#1a3252] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a3252]/90 disabled:opacity-60"
        >
          {isPending ? 'Importiere…' : 'Importieren'}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      {result && (
        <div className="mt-3 text-xs">
          <p className="font-medium text-green-700">
            {result.inserted} eingespielt · {result.skipped} übersprungen
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-red-600">
              {result.errors.slice(0, 20).map((e) => (
                <li key={e.row}>Zeile {e.row}: {e.message}</li>
              ))}
              {result.errors.length > 20 && (
                <li className="text-gray-500">… und {result.errors.length - 20} weitere</li>
              )}
            </ul>
          )}
        </div>
      )}
    </details>
  )
}
