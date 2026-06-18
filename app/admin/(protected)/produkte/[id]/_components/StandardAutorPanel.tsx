'use client'

// Standard-Autor-Auswahl pro Produkt.
// Optimistic Update + Patch-API.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PortraitCircle } from '@/components/ui/PortraitCircle'

interface Autor {
  id: string
  slug: string
  vorname: string
  nachname: string
  rolle: string
  foto_url: string | null
}

interface Props {
  produktId: string
  autoren: Autor[]
  initialAutorId: string | null
}

export function StandardAutorPanel({ produktId, autoren, initialAutorId }: Props) {
  const [autorId, setAutorId] = useState<string>(initialAutorId ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const [savedAt, setSavedAt] = useState<Date>()
  const router = useRouter()

  function handleChange(next: string) {
    const previous = autorId
    setAutorId(next)
    setError(undefined)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/produkte/${produktId}/standard-autor`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ standard_autor_id: next || null }),
        })
        const json = await res.json()
        if (!res.ok) {
          setAutorId(previous)
          setError(json.error ?? 'Speichern fehlgeschlagen')
          return
        }
        setSavedAt(new Date())
        router.refresh()
      } catch (e) {
        setAutorId(previous)
        setError(e instanceof Error ? e.message : 'Netzwerk-Fehler')
      }
    })
  }

  const selected = autoren.find(a => a.id === autorId)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-[#333]">Standard-Autor</h2>
          <p className="mt-1 text-sm text-[#666]">
            Erscheint auf Hauptseite, Ratgeber, Blog und Wissensfundus, sofern dort kein eigener Autor gesetzt ist.
          </p>
        </div>
        <Link
          href="/admin/redaktion"
          className="text-xs text-[#1a365d] hover:underline whitespace-nowrap"
        >
          Autoren verwalten ↗
        </Link>
      </header>

      {autoren.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-[#666]">
          Noch keine öffentlichen Autoren angelegt.{' '}
          <Link href="/admin/redaktion/neu" className="text-[#1a365d] hover:underline">
            Neuen Autor anlegen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
          <select
            value={autorId}
            onChange={e => handleChange(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a365d] focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          >
            <option value="">— kein Standard-Autor —</option>
            {autoren.map(a => (
              <option key={a.id} value={a.id}>
                {a.vorname} {a.nachname} — {a.rolle}
              </option>
            ))}
          </select>
          {selected && (
            <div className="flex items-center gap-2">
              {selected.foto_url
                ? <PortraitCircle src={selected.foto_url} alt="" className="h-10 w-10 border border-gray-200" />
                : <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">{selected.vorname[0]}{selected.nachname[0]}</div>
              }
              <Link
                href={`/admin/redaktion/${selected.id}`}
                className="text-xs text-[#1a365d] hover:underline whitespace-nowrap"
              >
                Bearbeiten
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-xs text-[#666] flex items-center gap-3">
        {isPending && <span>Speichern …</span>}
        {!isPending && savedAt && <span className="text-emerald-600">✓ Gespeichert {savedAt.toLocaleTimeString('de-DE')}</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>
    </section>
  )
}
