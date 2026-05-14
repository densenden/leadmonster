'use client'

/**
 * CSV-Bulk-Import-Panel für den Tarife-Editor.
 *
 * Erwartet eine CSV mit Header
 *   anbieter_name,tarif_name,besonderheiten_json,geburtsjahr,summe_eur,beitrag_eur,einheit[,berufsklasse]
 *
 * Ruft die Server-Action `importTarifeCsv(produktId, formData)` auf und zeigt
 * Inserted / Skipped / Errors. Auf-/zuklappbar (collapsed by default), damit
 * der Tarif-Editor visuell nicht überfrachtet wird.
 */
import { useRef, useState, useTransition } from 'react'
import { importTarifeCsv } from '@/app/admin/tarife/actions'

interface CsvImportProps {
  produktId: string
  produktSlug: string
}

export function CsvImport({ produktId, produktSlug }: CsvImportProps) {
  const [result, setResult] = useState<{
    inserted: number
    skipped: number
    errors: Array<{ row: number; message: string }>
  } | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <details className="bg-white border border-gray-200 rounded-lg p-4 mt-8">
      <summary className="cursor-pointer font-semibold text-[#1a3252] text-sm">
        CSV-Bulk-Import für {produktSlug}
      </summary>

      <div className="text-xs text-gray-600 mt-3 mb-4 leading-relaxed">
        <p className="mb-2">
          Header-Zeile:{' '}
          <code className="bg-gray-100 px-1 rounded">
            anbieter_name,tarif_name,besonderheiten_json,geburtsjahr,summe_eur,beitrag_eur,einheit
            [,berufsklasse]
          </code>
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>einheit</strong>: <code>eur_summe</code> (Versicherungssumme) oder
            <code> eur_monat</code> (Monatsrente, z. B. BU/Pflege).
          </li>
          <li>
            <strong>berufsklasse</strong> (nur BU): A / B / C / D.
          </li>
          <li>
            <strong>besonderheiten_json</strong>: JSON-Object mit Schlüsseln wie{' '}
            <code>wartezeit_monate</code>, <code>doppelte_unfall</code>,{' '}
            <code>rueckholung</code> u. a.
          </li>
          <li>
            Vorlage:{' '}
            <code>vergleich-tarife-seeds/{produktSlug.replace(/^berufsunfaehigkeit$|^bu.*$/, 'bu')}.csv</code>
            {' '}im Repo.
          </li>
          <li>Doppelte Zeilen (gleicher Anbieter + Alter + Summe) werden überschrieben.</li>
        </ul>
      </div>

      <form
        ref={formRef}
        action={(formData) => {
          startTransition(async () => {
            setError(undefined)
            setResult(null)
            const r = await importTarifeCsv(produktId, formData)
            if (!r.success) {
              setError(r.error)
            } else if (r.data) {
              setResult(r.data)
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
            <ul className="mt-2 space-y-1 text-red-600 max-h-48 overflow-y-auto">
              {result.errors.slice(0, 30).map(e => (
                <li key={e.row}>
                  Zeile {e.row}: {e.message}
                </li>
              ))}
              {result.errors.length > 30 && (
                <li className="text-gray-500">… und {result.errors.length - 30} weitere</li>
              )}
            </ul>
          )}
        </div>
      )}
    </details>
  )
}
