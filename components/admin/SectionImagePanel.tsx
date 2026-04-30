'use client'

// Per-section image controls used inside ContentPreview.
// Generates an image for a section, then writes image_url + image_alt
// back into that section via the supplied onSet callback.
//
// Note: this only updates the section in local editor state (parent then
// gets dirty-state), so the user still has to "Speichern" to persist.
import { useState } from 'react'

interface SectionImagePanelProps {
  produktId: string
  pageType: string
  sectionType: string
  /** Heuristic alt text when user does not provide one. */
  defaultAltText: string
  /** Current image URL if the section already has one. */
  currentUrl?: string
  currentAlt?: string
  /** Called with the freshly generated url + alt to be merged into the section. */
  onSet: (url: string, alt: string) => void
}

const SLOT_OPTIONS = [
  { value: 'hero', label: 'Hero (1792×1024)' },
  { value: 'feature', label: 'Feature (1024×1024)' },
  { value: 'inline', label: 'Inline (1024×1024)' },
]

function defaultSlot(sectionType: string): 'hero' | 'feature' | 'inline' {
  if (sectionType === 'hero') return 'hero'
  if (sectionType === 'feature_grid' || sectionType === 'features') return 'feature'
  return 'inline'
}

export function SectionImagePanel({
  produktId,
  pageType,
  sectionType,
  defaultAltText,
  currentUrl,
  currentAlt,
  onSet,
}: SectionImagePanelProps) {
  const [open, setOpen] = useState(false)
  const [slot, setSlot] = useState<'hero' | 'feature' | 'inline'>(defaultSlot(sectionType))
  const [prompt, setPrompt] = useState('')
  const [altText, setAltText] = useState(currentAlt ?? '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setError('')
    if (!prompt.trim() || prompt.trim().length < 8) {
      setError('Prompt zu kurz (min. 8 Zeichen).')
      return
    }
    setIsGenerating(true)
    try {
      const res = await fetch('/api/admin/bilder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          slot,
          altText: altText.trim() || defaultAltText,
          produktId,
          pageType,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message ?? 'Generierung fehlgeschlagen')
        return
      }
      onSet(json.data.url, json.data.alt)
      setOpen(false)
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Netzwerkfehler')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="border-t border-gray-100 mt-2 pt-2">
      <div className="flex items-center gap-3">
        {currentUrl ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt={currentAlt ?? ''}
              className="w-16 h-10 object-cover border border-gray-200"
            />
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#02a9e6] hover:underline"
            >
              ↗
            </a>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Kein Bild gesetzt</span>
        )}

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="ml-auto text-xs text-[#1a3252] hover:underline"
        >
          {open ? 'Abbrechen' : currentUrl ? 'Bild neu generieren' : 'Bild generieren'}
        </button>

        {currentUrl && (
          <button
            type="button"
            onClick={() => onSet('', '')}
            className="text-xs text-red-500 hover:underline"
            title="Bild aus Sektion entfernen (Bild bleibt in Bibliothek)"
          >
            Entfernen
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 space-y-2 bg-gray-50 p-3 border border-gray-200">
          <div>
            <label className="block text-xs text-[#666666] mb-0.5">Slot / Größe</label>
            <select
              value={slot}
              onChange={e => setSlot(e.target.value as 'hero' | 'feature' | 'inline')}
              className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            >
              {SLOT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#666666] mb-0.5">Prompt (Englisch empfohlen)</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              placeholder="z. B. Senior couple smiling on a park bench…"
              className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#666666] mb-0.5">Alt-Text</label>
            <input
              type="text"
              value={altText}
              onChange={e => setAltText(e.target.value)}
              placeholder={defaultAltText}
              className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-[#1a3252] text-white px-3 py-1 text-xs hover:bg-[#02a9e6] disabled:opacity-50"
            >
              {isGenerating ? 'Generiere…' : 'Bild generieren'}
            </button>
            {isGenerating && (
              <span className="text-[11px] text-[#02a9e6]">10–30 Sek.</span>
            )}
          </div>

          {error && (
            <p className="text-[11px] text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
