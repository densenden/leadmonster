'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavbarLogoMark } from '@/components/NavbarLogoMark'

interface NavbarLogoPanelProps {
  produktId: string
  produktName: string
  accentColor: string
  initialVisible: boolean
  initialUrl: string | null
  initialAlt: string | null
}

export function NavbarLogoPanel({
  produktId,
  produktName,
  accentColor,
  initialVisible,
  initialUrl,
  initialAlt,
}: NavbarLogoPanelProps) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [alt, setAlt] = useState(initialAlt ?? '')
  const [visible, setVisible] = useState(initialVisible)
  const [isUploading, setIsUploading] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      if (alt.trim()) fd.set('alt', alt.trim())

      const res = await fetch(`/api/admin/produkte/${produktId}/navbar-logo`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? `Fehler ${res.status}`)
        return
      }
      setUrl(json.data.navbar_logo_url)
      setAlt(json.data.navbar_logo_alt ?? '')
      // Upload also turns visibility on in the API.
      setVisible(json.data.navbar_logo_visible ?? true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  async function handleVisibilityChange(next: boolean) {
    setError('')
    setIsToggling(true)
    const previous = visible
    setVisible(next)
    try {
      const res = await fetch(`/api/admin/produkte/${produktId}/navbar-logo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setVisible(previous)
        setError(json.error?.message ?? `Fehler ${res.status}`)
        return
      }
      router.refresh()
    } catch (err) {
      setVisible(previous)
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsToggling(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm('Eigenes Produkt-Icon entfernen?')) return
    setError('')
    try {
      const res = await fetch(`/api/admin/produkte/${produktId}/navbar-logo`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error?.message ?? `Fehler ${res.status}`)
        return
      }
      setUrl(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    }
  }

  return (
    <section className="border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-[#333333]">
          Produkt-Icon
        </h2>
        <p className="text-xs text-[#666666]">
          Standard: kleiner Kreis mit dem Anfangsbuchstaben (z. B. „S“) in Navbar + Favicon.
          Optional: quadratisches Icon (1:1) hochladen — ersetzt Buchstabe in Navbar und
          Favicon-Pipeline (<code>/api/produkte/…/icon</code>).
        </p>
      </div>

      <div className="mb-4 flex items-start gap-3">
        <input
          id="navbar_logo_panel_visible"
          type="checkbox"
          checked={visible}
          disabled={isToggling}
          onChange={(e) => handleVisibilityChange(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <div>
          <label htmlFor="navbar_logo_panel_visible" className="text-sm font-medium text-[#333333]">
            Icon in der Navbar anzeigen
          </label>
          <p className="text-xs text-[#666666]">
            Ohne Haken: nur der Produktname. Mit Haken: Buchstaben-Kreis oder Upload.
          </p>
        </div>
      </div>

      {url && !visible && (
        <p className="mb-4 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Icon ist hochgeladen, aber ausgeblendet. Haken oben setzen, damit es erscheint.
        </p>
      )}

      <div className="mb-4 flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-xs font-medium text-[#666666]">
          Vorschau {visible ? '(sichtbar)' : '(ausgeblendet)'}:
        </span>
        <div className="flex items-center gap-2">
          <NavbarLogoMark
            visible={visible}
            customUrl={url}
            customAlt={alt}
            accentColor={accentColor}
            productName={produktName}
          />
          <span className="font-bold text-[#1a365d] text-sm">{produktName}</span>
        </div>
        {visible && !url && (
          <span className="text-xs text-[#999999]">(Buchstaben-Kreis)</span>
        )}
        {!visible && (
          <span className="text-xs text-[#999999]">(kein Icon)</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="navbar_logo_alt" className="mb-1.5 block text-sm font-medium text-[#333333]">
            Alt-Text (optional, für Upload)
          </label>
          <input
            id="navbar_logo_alt"
            type="text"
            value={alt}
            onChange={e => setAlt(e.target.value)}
            placeholder={produktName}
            className="w-full border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center border border-[#1a3252] bg-[#1a3252] px-4 py-2 text-sm font-semibold text-white hover:bg-[#243d66]">
            {isUploading ? 'Lädt hoch…' : 'Quadratisches Icon hochladen'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              disabled={isUploading}
              onChange={handleFileChange}
            />
          </label>
          {url && (
            <button
              type="button"
              onClick={handleRemove}
              className="border border-gray-300 px-4 py-2 text-sm text-[#666666] hover:bg-gray-50"
            >
              Upload entfernen
            </button>
          )}
        </div>
      </div>

      {url && (
        <div className="mt-4 flex items-center gap-3 border border-gray-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt || produktName}
            className="h-16 w-16 rounded-full object-cover"
          />
          <p className="text-xs text-[#666666]">Muss quadratisch sein (1:1).</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}
