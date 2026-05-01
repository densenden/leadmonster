// Admin-Dashboard-Panel: zeigt Inhalte, deren Re-Review fällig ist.
// Lädt direkt aus der DB (Server Component).
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export async function ReviewDuePanel() {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const [{ count: gencDue }, { count: blogDue }, { count: wissenDue }] = await Promise.all([
    supabase.from('generierter_content').select('id', { count: 'exact', head: true })
      .eq('status', 'publiziert').lte('next_review_at', now),
    supabase.from('blog_posts').select('id', { count: 'exact', head: true })
      .eq('status', 'publiziert').lte('next_review_at', now),
    supabase.from('wissensfundus').select('id', { count: 'exact', head: true })
      .eq('published', true).lte('next_review_at', now),
  ])

  const total = (gencDue ?? 0) + (blogDue ?? 0) + (wissenDue ?? 0)

  // Letzte 5 fälligen Wissens-Einträge als Drill-Down
  const { data: dueExamples } = await supabase
    .from('wissensfundus')
    .select('id, slug, thema, next_review_at')
    .eq('published', true)
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true })
    .limit(5)

  return (
    <section className={`rounded-xl border p-6 ${total > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-[#1a365d]">Re-Review fällig</h2>
        <span className={`text-2xl font-bold ${total > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
          {total}
        </span>
      </div>
      <p className="text-sm text-[#666] mb-3">
        Inhalte, deren Frische nach Re-Review-Cadence (180 Tage) erneuert werden müssen.
      </p>
      <ul className="text-xs text-[#666] space-y-1">
        <li>Generierter Content: <strong>{gencDue ?? 0}</strong></li>
        <li>Blog-Posts: <strong>{blogDue ?? 0}</strong></li>
        <li>Wissensfundus: <strong>{wissenDue ?? 0}</strong></li>
      </ul>
      {dueExamples && dueExamples.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {dueExamples.map(ex => (
            <li key={ex.id}>
              <Link href={`/admin/wissensfundus/${ex.id}`} className="text-[#1a365d] hover:underline">
                {ex.thema}
              </Link>
              <span className="ml-2 text-xs text-[#999]">
                fällig seit {ex.next_review_at ? new Date(ex.next_review_at).toLocaleDateString('de-DE') : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
