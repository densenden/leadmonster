'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface HeroImagePanelProps {
  produktId: string
  produktName: string
  produktTyp: string
  initialUrl: string | null
  initialAlt: string | null
}

const DEFAULT_PROMPTS_BY_TYP: Record<string, string> = {
  sterbegeld:
    'Elderly German couple at a calm park bench in golden afternoon light, warm and dignified, no faces clearly visible, looking towards the horizon',
  pflege:
    'A caring nurse helping an elderly person in a bright, modern German home, warm light, hopeful atmosphere',
  leben:
    'Young German family with two children walking in front of their house, sunset light, protective composition',
  bu:
    'A focused craftsperson or office worker in a German workplace, soft window light, sense of resilience and competence',
  unfall:
    'A safe German residential street with a family on bicycles, calm and protective atmosphere, soft daylight',
}

export function HeroImagePanel({
  produktId,
  produktName,
  produktTyp,
  initialUrl,
  initialAlt,
}: HeroImagePanelProps) {
  const router = useRouter()
  const [url, setUrl] = useState(initialUrl)
  const [alt, setAlt] = useState(initialAlt ?? '')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPTS_BY_TYP[produktTyp] ?? '')
  const [showPrompt, setShowPrompt] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (
      url &&
      !window.confirm('Bestehendes Hero-Bild wird ersetzt. Fortfahren?')
    ) {
      return
    }
    setError('')
    setIsGenerating(true)
    try {
      const body: Record<string, string> = {}
      if (showPrompt && prompt.trim()) body.prompt = prompt.trim()
      if (alt.trim()) body.altText = alt.trim()

      const res = await fetch(`/api/admin/produkte/${produktId}/hero-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Generierung fehlgeschlagen')
        return
      }
      setUrl(json.data.url)
      setAlt(json.data.alt)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold text-[#333333]">Hero-Bild</h2>
          <p className="text-xs text-[#666666]">
            Wird auf der Produkthauptseite oben angezeigt und als OG-Bild geteilt.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Vorschau */}
        <div className="bg-gray-50 border border-gray-200">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={alt || `Hauptbild ${produktName}`}
              className="w-full h-full object-cover aspect-video"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center text-sm text-gray-400">
              Noch kein Hero-Bild
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-1">
              Alt-Text
            </label>
            <input
              type="text"
              value={alt}
              onChange={e => setAlt(e.target.value)}
              placeholder={`Hauptbild ${produktName}`}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowPrompt(s => !s)}
              className="text-xs text-[#1a3252] hover:underline"
            >
              {showPrompt ? '▾ Prompt ausblenden' : '▸ Prompt anpassen (optional)'}
            </button>
            {showPrompt && (
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                placeholder="Englischer Bild-Prompt — Stil-Guard wird automatisch ergänzt"
                className="mt-2 w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
              />
            )}
            {!showPrompt && (
              <p className="text-xs text-gray-400 mt-1">
                Standard-Prompt für Typ &bdquo;{produktTyp}&ldquo; wird verwendet.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-[#1a3252] text-white px-4 py-2 text-sm font-medium hover:bg-[#02a9e6] disabled:opacity-50"
          >
            {isGenerating ? 'Generiere…' : url ? 'Hero neu generieren' : 'Hero generieren'}
          </button>

          {isGenerating && (
            <p className="text-xs text-[#02a9e6]">
              gpt-image-1 läuft — Bilder können 10–30 Sek. dauern.
            </p>
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
