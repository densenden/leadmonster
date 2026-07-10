'use client'

import { useCallback, useEffect, useState } from 'react'

export interface BildPickerItem {
  id: string
  url: string
  alt_text: string
  slot: string | null
  page_type: string | null
  width: number | null
  height: number | null
  created_at: string
}

interface BildPickerGridProps {
  produktId: string
  selectedUrl?: string | null
  onSelect: (bild: BildPickerItem) => void
  disabled?: boolean
}

const SLOT_LABELS: Record<string, string> = {
  hero: 'Hero',
  feature: 'Feature',
  inline: 'Inline',
  og: 'OG',
  blog_cover: 'Blog Cover',
}

export function BildPickerGrid({
  produktId,
  selectedUrl,
  onSelect,
  disabled = false,
}: BildPickerGridProps) {
  const [items, setItems] = useState<BildPickerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scope, setScope] = useState<'produkt' | 'all'>('produkt')
  const [slotFilter, setSlotFilter] = useState('')

  const loadImages = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '120' })
      if (scope === 'produkt') params.set('produkt_id', produktId)
      if (slotFilter) params.set('slot', slotFilter)

      const res = await fetch(`/api/admin/bilder?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Bilder konnten nicht geladen werden')
        setItems([])
        return
      }
      setItems((json.data ?? []) as BildPickerItem[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [produktId, scope, slotFilter])

  useEffect(() => {
    void loadImages()
  }, [loadImages])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={scope}
          onChange={e => setScope(e.target.value as 'produkt' | 'all')}
          disabled={disabled || loading}
          className="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
        >
          <option value="produkt">Nur dieses Produkt</option>
          <option value="all">Alle Produkte</option>
        </select>

        <select
          value={slotFilter}
          onChange={e => setSlotFilter(e.target.value)}
          disabled={disabled || loading}
          className="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
        >
          <option value="">Alle Slots</option>
          {Object.entries(SLOT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void loadImages()}
          disabled={disabled || loading}
          className="text-xs text-[#1a3252] hover:underline disabled:opacity-50"
        >
          Aktualisieren
        </button>
      </div>

      {loading && (
        <p className="text-xs text-[#666666]">Lade Bilder-Bibliothek…</p>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-xs text-gray-500">
          Keine Bilder in der Bibliothek — zuerst generieren oder unter Admin → Bilder prüfen.
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-72 overflow-y-auto border border-gray-200 p-2 bg-gray-50">
          {items.map(bild => {
            const isSelected = selectedUrl === bild.url
            return (
              <button
                key={bild.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(bild)}
                className={`group text-left border bg-white transition-colors ${
                  isSelected
                    ? 'border-[#02a9e6] ring-2 ring-[#abd5f4]'
                    : 'border-gray-200 hover:border-[#1a3252]'
                } disabled:opacity-50`}
                title={bild.alt_text}
              >
                <div className="relative aspect-video bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bild.url}
                    alt={bild.alt_text}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {isSelected && (
                    <span className="absolute top-1 right-1 bg-[#02a9e6] text-white text-[10px] px-1.5 py-0.5 rounded">
                      Aktiv
                    </span>
                  )}
                </div>
                <div className="p-1.5 space-y-0.5">
                  <p className="text-[10px] font-medium text-[#333333] line-clamp-2">{bild.alt_text}</p>
                  <p className="text-[10px] text-gray-400">
                    {[bild.slot ? SLOT_LABELS[bild.slot] ?? bild.slot : null, bild.page_type]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
