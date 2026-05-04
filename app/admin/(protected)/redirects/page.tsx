// Admin-Seite zur Pflege von URL-Redirects (siehe § 8 Single-Domain-Strategie).
// Vertrieb/Admin pflegen 301/302-Mappings hier — die Edge-Middleware liest sie
// mit 60s TTL.
import { createAdminClient } from '@/lib/supabase/server'
import type { Redirect } from '@/lib/supabase/types'
import { AddForm } from './_components/AddForm'
import { EditRow } from './_components/EditRow'
import { DeleteRedirect } from './_components/DeleteRedirect'
import { CsvImport } from './_components/CsvImport'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Redirects | Admin',
}

interface PageProps {
  searchParams: { q?: string }
}

export default async function RedirectsPage({ searchParams }: PageProps) {
  const supabase = createAdminClient()
  const q = (searchParams.q ?? '').trim()

  let query = supabase
    .from('redirects')
    .select('legacy_path, target_path, status, notiz, updated_at')
    .order('legacy_path', { ascending: true })

  if (q) {
    // Such über legacy_path und target_path
    query = query.or(`legacy_path.ilike.%${q}%,target_path.ilike.%${q}%`)
  }

  const { data: rows } = await query
  const redirects = (rows ?? []) as Redirect[]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-[#333]">Redirects</h1>
          <p className="mt-1 text-sm text-[#666]">
            301/302-Weiterleitungen für die Single-Domain-Strategie
            (sterbegeld24plus.de). Wird von der Edge-Middleware gelesen.
          </p>
        </div>
      </div>

      <AddForm />

      {/* Suche */}
      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Suche nach Pfad …"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      {/* Liste */}
      {redirects.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          {q ? 'Keine Treffer.' : 'Noch keine Redirects angelegt.'}
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Quell-Pfad</th>
                <th className="px-4 py-2 text-left font-semibold">→ Ziel-Pfad</th>
                <th className="px-4 py-2 text-left font-semibold w-20">Status</th>
                <th className="px-4 py-2 text-left font-semibold">Notiz</th>
                <th className="px-4 py-2 text-right font-semibold w-44">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {redirects.map((r) => (
                <tr key={r.legacy_path}>
                  <td className="px-4 py-2 font-mono text-xs">{r.legacy_path}</td>
                  <td className="px-4 py-2 font-mono text-xs text-[#1a3252]">
                    {r.target_path}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        r.status === 301
                          ? 'border-green-500 text-green-700 bg-green-50'
                          : 'border-amber-400 text-amber-700 bg-amber-50'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-[#666]">{r.notiz ?? '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-start gap-3">
                      <EditRow
                        legacyPath={r.legacy_path}
                        targetPath={r.target_path}
                        status={r.status}
                        notiz={r.notiz}
                      />
                      <DeleteRedirect legacyPath={r.legacy_path} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CsvImport />
    </div>
  )
}
