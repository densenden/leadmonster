'use client'

// Per-section image controls used inside ContentPreview.
// Generates an image for a section, then writes image_url + image_alt
// back into that section via the supplied onSet callback.
//
// Auto-Prompt-Update 2026-04-30: das Prompt-Feld wird nicht mehr leer
// initialisiert — es kommt mit einem Section-Type-spezifischen Vorschlag
// aus lib/openai/section-prompt.ts vor (Brand-Look, Composition, Story-Beat).
//
// Note: this only updates the section in local editor state (parent then
// gets dirty-state), so the user still has to "Speichern" to persist.
import { useEffect, useMemo, useState } from 'react'
import {
  buildSectionPrompt,
  defaultSlotForSection,
  type SectionImageSlot,
} from '@/lib/openai/section-prompt'

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
  /** Produkt-Kontext für den Auto-Prompt — wenn nicht gesetzt, wird der
   *  Default-Look von "sterbegeld" verwendet. */
  produktTyp?: string
  produktName?: string
  zielgruppe?: string[] | null
  fokus?: string | null
  argumente?: Record<string, string> | null
  /** Pro-Produkt-Stil-Direktive aus dem Style-Reference-Upload. */
  styleDescription?: string | null
  /** Optionaler Story-Hook für die Sektion (z. B. die Headline). */
  contextHint?: string
}

const SLOT_OPTIONS: Array<{ value: SectionImageSlot; label: string }> = [
  { value: 'hero', label: 'Hero (1536×1024)' },
  { value: 'feature', label: 'Feature (1024×1024)' },
  { value: 'inline', label: 'Inline (1024×1024)' },
]

export function SectionImagePanel({
  produktId,
  pageType,
  sectionType,
  defaultAltText,
  currentUrl,
  currentAlt,
  onSet,
  produktTyp = 'sterbegeld',
  zielgruppe,
  fokus,
  argumente,
  styleDescription,
  contextHint,
}: SectionImagePanelProps) {
  const [open, setOpen] = useState(false)
  const [slot, setSlot] = useState<SectionImageSlot>(defaultSlotForSection(sectionType))

  // Auto-Prompt — neu berechnet, wenn sich Slot oder Section-Kontext ändert.
  const autoPrompt = useMemo(
    () =>
      buildSectionPrompt({
        produktTyp,
        sectionType,
        slot,
        contextHint,
        styleDescription,
        zielgruppe,
        fokus,
        argumente,
      }),
    [produktTyp, sectionType, slot, contextHint, styleDescription, zielgruppe, fokus, argumente],
  )

  const [prompt, setPrompt] = useState(autoPrompt)
  const [promptDirty, setPromptDirty] = useState(false)
  const [altText, setAltText] = useState(currentAlt ?? '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // Wenn sich der Auto-Prompt ändert (z. B. weil User Slot wechselt) und der
  // User noch nichts manuell editiert hat, übernimm den neuen Vorschlag.
  useEffect(() => {
    if (!promptDirty) setPrompt(autoPrompt)
  }, [autoPrompt, promptDirty])

  function handleResetPrompt() {
    setPrompt(autoPrompt)
    setPromptDirty(false)
  }

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
              onChange={e => setSlot(e.target.value as SectionImageSlot)}
              className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            >
              {SLOT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-0.5 flex items-center justify-between">
              <label className="block text-xs text-[#666666]">
                Prompt (Englisch empfohlen)
              </label>
              {promptDirty && (
                <button
                  type="button"
                  onClick={handleResetPrompt}
                  className="text-[11px] text-[#1a3252] hover:underline"
                >
                  Auf Auto-Vorschlag zurücksetzen
                </button>
              )}
            </div>
            <textarea
              value={prompt}
              onChange={e => {
                setPrompt(e.target.value)
                setPromptDirty(e.target.value !== autoPrompt)
              }}
              rows={6}
              placeholder="Editorial storytelling photograph for ..."
              className="w-full border border-gray-300 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#abd5f4]"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {promptDirty
                ? 'Eigener Prompt — Stil-Guard wird automatisch ergänzt.'
                : `Auto-Vorschlag aus Produkttyp "${produktTyp}", Section "${sectionType}" und Slot "${slot}". Frei editierbar.`}
            </p>
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
