'use client'

// StyleReferencePanel — Upload eines Stil-Beispielbildes pro Produkt.
// Ein einzelnes Bild reicht; eine Vision-Analyse extrahiert eine englische
// Stil-Direktive, die ab sofort an jeden Hero-/Section-Bild-Prompt
// angehängt wird (siehe lib/openai/hero-prompt.ts + section-prompt.ts).
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StyleReferencePanelProps {
  produktId: string
  initialUrl: string | null
  initialDescription: string | null
}

export function StyleReferencePanel({
  produktId,
  initialUrl,
  initialDescription,
}: StyleReferencePanelProps) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [description, setDescription] = useState(initialDescription)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setWarning('')
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)

      const res = await fetch(`/api/admin/produkte/${produktId}/style-reference`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? `Fehler ${res.status}`)
        return
      }
      setUrl(json.data.style_reference_url)
      setDescription(json.data.style_description ?? null)
      if (json.data.vision_error) {
        setWarning(
          'Bild ist hochgeladen, Stil-Analyse hat nicht geklappt — bitte später erneut hochladen.',
        )
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsUploading(false)
      // input zurücksetzen, damit derselbe File noch mal getriggert werden kann
      e.target.value = ''
    }
  }

  async function handleRemove() {
    if (!window.confirm('Stil-Referenz wirklich entfernen?')) return
    setError('')
    try {
      const res = await fetch(`/api/admin/produkte/${produktId}/style-reference`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error?.message ?? `Fehler ${res.status}`)
        return
      }
      setUrl(null)
      setDescription(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    }
  }

  return (
    <section className="border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold text-[#333333]">
          Stil-Referenz
        </h2>
        <p className="text-xs text-[#666666]">
          Lade ein Beispielbild hoch (z. B. coloriert, illustrativ, Aquarell).
          Die abgeleitete Stil-Direktive wird an jeden Bild-Prompt angehängt —
          damit alle Bilder dieses Produkts denselben Look haben.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Vorschau */}
        <div className="bg-gray-50 border border-gray-200">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Stil-Referenz"
              className="w-full h-full object-cover aspect-video"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center text-sm text-gray-400 px-4 text-center">
              Noch keine Stil-Referenz hochgeladen
            </div>
          )}
        </div>

        {/* Controls + abgeleitete Beschreibung */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-1">
              Beispielbild (PNG, JPG, WebP, max. 10 MB)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-[#333333] file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-[#1a3252] file:text-white file:text-sm file:cursor-pointer hover:file:bg-[#02a9e6] disabled:opacity-50"
            />
          </div>

          {description && (
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-1">
                Erkannte Stil-Direktive
              </label>
              <p className="text-xs italic text-[#1a3252] bg-[#e1f0fb] border border-[#abd5f4] p-2 leading-relaxed">
                {description}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Wird automatisch an jeden Hero-/Section-Bild-Prompt angehängt.
              </p>
            </div>
          )}

          {url && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-red-600 hover:underline"
            >
              Stil-Referenz entfernen
            </button>
          )}

          {isUploading && (
            <p className="text-xs text-[#02a9e6]">
              Lade hoch und analysiere Stil — kann 5–15 Sek. dauern.
            </p>
          )}

          {warning && (
            <pre className="text-xs text-orange-700 whitespace-pre-wrap bg-orange-50 border border-orange-200 p-2">
              {warning}
            </pre>
          )}

          {error && (
            <pre className="text-xs text-red-700 whitespace-pre-wrap bg-red-50 border border-red-200 p-2">
              {error}
            </pre>
          )}
        </div>
      </div>
    </section>
  )
}
