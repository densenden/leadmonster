'use client'

// Kleines Panel zum Setzen von autor_id + reviewed_by + Review-Stempel
// auf generierter_content / wissensfundus / blog_posts.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Autor {
  id: string
  vorname: string
  nachname: string
  rolle: string
}

interface Props {
  table: 'generierter_content' | 'wissensfundus' | 'blog_posts'
  rowId: string
  autoren: Autor[]
  initialAutorId: string | null
  initialReviewedBy: string | null
  initialReviewedAt: string | null
  /**
   * Wird im Hint angezeigt, wenn kein Autor gewählt ist.
   * Beispiel: "fällt zurück auf Christian Wimmer (Standard-Autor)".
   */
  fallbackHint?: string
}

export function ArticleAuthorPanel({
  table,
  rowId,
  autoren,
  initialAutorId,
  initialReviewedBy,
  initialReviewedAt,
  fallbackHint,
}: Props) {
  const [autorId, setAutorId] = useState(initialAutorId ?? '')
  const [reviewedBy, setReviewedBy] = useState(initialReviewedBy ?? '')
  const [reviewedAt, setReviewedAt] = useState(initialReviewedAt)
  const [error, setError] = useState<string>()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function patch(body: Record<string, unknown>, onSuccess?: () => void) {
    setError(undefined)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/article-author/${table}/${rowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? 'Speichern fehlgeschlagen')
          return
        }
        if (json.updated?.reviewed_at) setReviewedAt(json.updated.reviewed_at)
        onSuccess?.()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Netzwerk-Fehler')
      }
    })
  }

  function handleAutor(next: string) {
    setAutorId(next)
    patch({ autor_id: next || null })
  }
  function handleReviewer(next: string) {
    setReviewedBy(next)
    patch({ reviewed_by: next || null })
  }
  function handleMarkReviewed() {
    patch({ mark_reviewed: true, reviewed_by: reviewedBy || autorId || null })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block mb-1 font-medium text-[#666]">Autor (überschreibt Standard)</span>
          <select
            value={autorId}
            onChange={e => handleAutor(e.target.value)}
            disabled={isPending}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
          >
            <option value="">— Standard verwenden —</option>
            {autoren.map(a => (
              <option key={a.id} value={a.id}>{a.vorname} {a.nachname}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block mb-1 font-medium text-[#666]">Geprüft von</span>
          <select
            value={reviewedBy}
            onChange={e => handleReviewer(e.target.value)}
            disabled={isPending}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
          >
            <option value="">— noch nicht gewählt —</option>
            {autoren.map(a => (
              <option key={a.id} value={a.id}>{a.vorname} {a.nachname}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex items-center justify-between text-[#666]">
        <div>
          {reviewedAt
            ? <>Letzte Prüfung: <strong>{new Date(reviewedAt).toLocaleDateString('de-DE')}</strong></>
            : <em>Noch keine Prüfung dokumentiert.</em>
          }
          {!autorId && fallbackHint && <span className="ml-2 italic">— {fallbackHint}</span>}
        </div>
        <button
          type="button"
          onClick={handleMarkReviewed}
          disabled={isPending}
          className="rounded bg-[#1a365d] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a365d]/90 disabled:opacity-50"
        >
          Heute als geprüft markieren
        </button>
      </div>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  )
}
