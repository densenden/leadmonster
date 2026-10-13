// Admin quarantine list — rejected bot/spam form attempts (not synced to Convexa).
// Manual recover: Als Lead freigeben → real leads row + optional Convexa/emails.
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { formatBotAttemptDetails } from '@/lib/leads/bot-attempt-details'
import { RecoverButton } from './_components/RecoverButton'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const REASON_LABEL: Record<string, string> = {
  honeypot: 'Honeypot',
  captcha_required: 'Captcha fehlt',
  captcha_failed: 'Captcha ungültig',
  too_fast: 'Zu schnell',
  spam_heuristic: 'Spam-Muster',
  form_session_invalid: 'Sitzung ungültig',
}

interface SearchParams {
  reason?: string
  page?: string
}

export default async function BotAttemptsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createAdminClient()
  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * PAGE_SIZE

  let query = supabase
    .from('lead_bot_attempts')
    .select(
      'id, created_at, reason, email, vorname, nachname, telefon, source_url, client_ip, payload, recovered_at, recovered_lead_id, produkte(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (searchParams.reason) {
    query = query.eq('reason', searchParams.reason)
  }

  const { data: rows, count, error } = await query.range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="font-heading text-3xl text-[#333333]">Bot-Versuche</h1>
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">Liste konnte nicht geladen werden.</p>
          <p className="mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-[#666666]">
            <Link href="/admin/leads" className="text-[#02a9e6] hover:underline">
              ← Zurück zu Leads
            </Link>
          </p>
          <h1 className="mt-2 font-heading text-3xl text-[#333333]">Bot-Versuche</h1>
          <p className="mt-1 text-sm text-[#666666]">
            {totalCount} abgelehnte Formular-Einsendungen · neueste zuerst · werden{' '}
            <strong>nicht</strong> an Convexa gesendet
          </p>
          <p className="mt-1 text-xs text-[#888888]">
            Spam-Muster: Geburtsjahr nach 1990 oder unveränderte VergleichsRechner-Defaults
            (Summe 8000 € + Alter 65). Falsch-Positive können Sie mit „Als Lead freigeben“
            manuell in echte Leads holen (Convexa + Mail, wenn aktiv).
          </p>
        </div>

        <form method="get" className="flex items-center gap-2">
          <label htmlFor="reason" className="text-sm text-[#666666]">
            Grund
          </label>
          <select
            id="reason"
            name="reason"
            defaultValue={searchParams.reason ?? ''}
            className="rounded border border-[#e5e5e5] px-2 py-1.5 text-sm"
          >
            <option value="">Alle</option>
            <option value="honeypot">Honeypot</option>
            <option value="captcha_required">Captcha fehlt</option>
            <option value="captcha_failed">Captcha ungültig</option>
            <option value="too_fast">Zu schnell</option>
            <option value="spam_heuristic">Spam-Muster</option>
            <option value="form_session_invalid">Sitzung ungültig</option>
          </select>
          <button
            type="submit"
            className="rounded bg-[#1a365d] px-3 py-1.5 text-sm font-medium text-white"
          >
            Filtern
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f8fafc] text-[#666666]">
            <tr>
              <th className="px-4 py-3 font-medium">Zeit</th>
              <th className="px-4 py-3 font-medium">Grund</th>
              <th className="px-4 py-3 font-medium">Name / E-Mail</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">Produkt</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Quelle</th>
              <th className="px-4 py-3 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#888]">
                  Noch keine Bot-Versuche gespeichert. Wenn Captcha greift oder Spam-Muster
                  erkannt werden, erscheinen sie hier (sortiert: neueste zuerst).
                </td>
              </tr>
            ) : (
              (rows ?? []).map(row => {
                const produktName =
                  row.produkte &&
                  typeof row.produkte === 'object' &&
                  'name' in row.produkte
                    ? String((row.produkte as { name: string }).name)
                    : '—'
                const detailLines = formatBotAttemptDetails(row.payload)
                const displayName =
                  [row.vorname, row.nachname].filter(Boolean).join(' ') ||
                  row.email ||
                  'Unbekannt'
                return (
                  <tr key={row.id} className="border-t border-[#eee] align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-[#666]">
                      {new Date(row.created_at).toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[#fff3cd] px-2 py-0.5 text-xs font-medium text-[#856404]">
                        {REASON_LABEL[row.reason] ?? row.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#333]">
                        {[row.vorname, row.nachname].filter(Boolean).join(' ') || '—'}
                      </div>
                      <div className="text-[#666]">{row.email ?? '—'}</div>
                      {row.telefon && (
                        <div className="text-xs text-[#888]">{row.telefon}</div>
                      )}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-xs text-[#555]">
                      <ul className="list-disc space-y-0.5 pl-4">
                        {detailLines.map((line, i) => (
                          <li key={`${row.id}-d-${i}`}>{line}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-[#666]">{produktName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#666]">
                      {row.client_ip ?? '—'}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-xs text-[#666]">
                      {row.source_url ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <RecoverButton
                        attemptId={row.id}
                        alreadyRecovered={Boolean(row.recovered_at)}
                        recoveredLeadId={row.recovered_lead_id}
                        labelName={`${displayName} (${REASON_LABEL[row.reason] ?? row.reason})`}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#666]">
          <span>
            Seite {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/admin/leads/bots?page=${currentPage - 1}${
                  searchParams.reason ? `&reason=${searchParams.reason}` : ''
                }`}
                className="text-[#02a9e6] hover:underline"
              >
                Zurück
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`/admin/leads/bots?page=${currentPage + 1}${
                  searchParams.reason ? `&reason=${searchParams.reason}` : ''
                }`}
                className="text-[#02a9e6] hover:underline"
              >
                Weiter
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
