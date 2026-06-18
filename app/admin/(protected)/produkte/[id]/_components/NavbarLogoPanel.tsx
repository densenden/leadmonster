'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MonsterLogo } from '@/components/MonsterLogo'
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
  const [isUploading, setIsUploading] = useState(false)
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
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  async function handleRemove() {
    if (!window.confirm('Eigenes Navbar-Logo entfernen?')) return
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
          Navbar-Logo
        </h2>
        <p className="text-xs text-[#666666]">
          Standard ist <strong>kein Logo</strong> — nur Produktname in der Navbar.
          Wenn sichtbar und kein Bild hochgeladen: farbiges Monster-Maskottchen.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-xs font-medium text-[#666666]">Vorschau (sichtbar):</span>
        <div className="flex items-center gap-2">
          <NavbarLogoMark
            visible
            customUrl={url}
            customAlt={alt}
            accentColor={accentColor}
            productName={produktName}
          />
          <span className="font-bold text-[#1a365d] text-sm">{produktName}</span>
        </div>
        {!url && (
          <span className="text-xs text-[#999999]">(Monster-Fallback)</span>
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
            {isUploading ? 'Lädt hoch…' : 'Logo hochladen (PNG/JPG/WebP/SVG)'}
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
        <div className="mt-4 border border-gray-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt || produktName} className="max-h-16 w-auto object-contain" />
        </div>
      )}

      {!url && initialVisible && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[#666666]">
          Aktuell ohne Upload:
          <MonsterLogo color={accentColor} size={28} />
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  )
}
