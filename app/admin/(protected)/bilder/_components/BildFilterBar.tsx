'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface BildFilterBarProps {
  produkte: { id: string; name: string }[]
  currentProduktId?: string
  currentSlot?: string
  currentPageType?: string
}

const SLOT_OPTIONS = [
  { value: '', label: 'Alle Slots' },
  { value: 'hero', label: 'Hero' },
  { value: 'feature', label: 'Feature' },
  { value: 'inline', label: 'Inline' },
  { value: 'og', label: 'Open Graph' },
  { value: 'blog_cover', label: 'Blog Cover' },
]

const PAGE_TYPE_OPTIONS = [
  { value: '', label: 'Alle Seitentypen' },
  { value: 'hauptseite', label: 'Hauptseite' },
  { value: 'faq', label: 'FAQ' },
  { value: 'vergleich', label: 'Vergleich' },
  { value: 'tarif', label: 'Tarife' },
  { value: 'ratgeber', label: 'Ratgeber' },
]

export function BildFilterBar({
  produkte,
  currentProduktId,
  currentSlot,
  currentPageType,
}: BildFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => {
      router.push(`/admin/bilder?${params.toString()}`)
    })
  }

  function clearAll() {
    startTransition(() => {
      router.push('/admin/bilder')
    })
  }

  const hasFilter = Boolean(currentProduktId || currentSlot || currentPageType)

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <select
        value={currentProduktId ?? ''}
        onChange={e => setParam('produkt_id', e.target.value)}
        className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
        disabled={isPending}
      >
        <option value="">Alle Produkte</option>
        {produkte.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={currentSlot ?? ''}
        onChange={e => setParam('slot', e.target.value)}
        className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
        disabled={isPending}
      >
        {SLOT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={currentPageType ?? ''}
        onChange={e => setParam('page_type', e.target.value)}
        className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
        disabled={isPending}
      >
        {PAGE_TYPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {hasFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-[#666666] hover:text-[#1a3252] hover:underline"
          disabled={isPending}
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  )
}
