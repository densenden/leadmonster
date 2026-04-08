'use client'

// ContentPreview — interactive editor panel for a single generierter_content row.
// Left column: read-only visual preview of content sections.
// Right column: editable metadata fields and per-section text inputs.
// Status changes and regeneration are separate actions from the content save.
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import type { GenerierterContent } from '@/lib/supabase/types'
import type { BadgeVariant } from '@/components/ui/Badge'

interface ContentPreviewProps {
  row: GenerierterContent
  produktId: string
}

// A content section as stored in the JSONB content.sections array.
type ContentSection = Record<string, unknown>

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Displays "X / limit Zeichen" with color thresholds: gray → orange (>80%) → red (>100%).
function CharacterCounter({ current, limit }: { current: number; limit: number }) {
  const ratio = current / limit
  const colorClass =
    ratio > 1
      ? 'text-red-600'
      : ratio > 0.8
        ? 'text-orange-500'
        : 'text-gray-400'
  return (
    <span className={`text-xs ${colorClass}`}>
      {current} / {limit} Zeichen
    </span>
  )
}

// Returns the appropriate Tailwind border class based on the ratio to the limit.
function getBorderClass(current: number, limit: number): string {
  const ratio = current / limit
  if (ratio > 1) return 'border-red-600'
  if (ratio > 0.8) return 'border-orange-500'
  return 'border-gray-300'
}

// Maps content status to Badge variant.
const STATUS_BADGE: Record<GenerierterContent['status'], BadgeVariant> = {
  entwurf: 'neutral',
  review: 'info',
  publiziert: 'success',
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ContentPreview({ row, produktId }: ContentPreviewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Editable field state — initialised from the DB row.
  const [title, setTitle] = useState(row.title ?? '')
  const [metaTitle, setMetaTitle] = useState(row.meta_title ?? '')
  const [metaDesc, setMetaDesc] = useState(row.meta_desc ?? '')
  const [content, setContent] = useState<Record<string, unknown>>(row.content ?? {})
  const [status, setStatus] = useState<GenerierterContent['status']>(row.status)

  // Error states for save and status actions.
  const [saveError, setSaveError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Dirty state — true when any editable field differs from the current DB row value.
  const isDirty =
    title !== (row.title ?? '') ||
    metaTitle !== (row.meta_title ?? '') ||
    metaDesc !== (row.meta_desc ?? '') ||
    JSON.stringify(content) !== JSON.stringify(row.content ?? {})

  // Re-initialise local state whenever the row.id changes (after regeneration or router.refresh).
  useEffect(() => {
    setTitle(row.title ?? '')
    setMetaTitle(row.meta_title ?? '')
    setMetaDesc(row.meta_desc ?? '')
    setContent(row.content ?? {})
    setStatus(row.status)
  }, [row.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // PATCH content fields — does NOT include status.
  async function handleSave() {
    setSaveError('')
    startTransition(async () => {
      const res = await fetch(`/api/admin/content/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          meta_title: metaTitle,
          meta_desc: metaDesc,
          content,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        setSaveError(json.error?.message ?? 'Fehler beim Speichern')
        return
      }
      router.refresh()
    })
  }

  // PATCH status only — independent of the content save.
  async function handleStatusChange(nextStatus: string) {
    setStatusError('')
    const res = await fetch(`/api/admin/content/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (!res.ok) {
      setStatusError('Fehler beim Statuswechsel')
      return
    }
    setStatus(nextStatus as GenerierterContent['status'])
    router.refresh()
  }

  // POST /api/generate for this page type only.
  async function handleRegenerate() {
    if (isDirty) {
      const confirmed = window.confirm(
        'Nicht gespeicherte Änderungen gehen verloren. Trotzdem regenerieren?'
      )
      if (!confirmed) return
    }
    setIsRegenerating(true)
    try {
      await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produktId, pageType: row.page_type }),
      })
      router.refresh()
    } finally {
      setIsRegenerating(false)
    }
  }

  // Determine the forward-only status advance button label.
  const nextStatus: GenerierterContent['status'] | null =
    status === 'entwurf' ? 'review' : status === 'review' ? 'publiziert' : null
  const nextStatusLabel =
    status === 'entwurf' ? 'Weiter zu Review' : status === 'review' ? 'Publizieren' : null

  // Extract sections array from content JSONB for the section editors.
  const sections: ContentSection[] = Array.isArray(
    (content as { sections?: unknown[] }).sections
  )
    ? ((content as { sections: ContentSection[] }).sections)
    : []

  // Updates a single key within a specific section of the sections array.
  function updateSectionField(sectionIndex: number, key: string, value: string) {
    const newSections = [...sections]
    newSections[sectionIndex] = { ...newSections[sectionIndex], [key]: value }
    setContent({ ...content, sections: newSections })
  }

  return (
    <div className="border border-gray-200 bg-white p-4">
      {/* Status row — status badge, dropdown, forward button, regenerate */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant={STATUS_BADGE[status]}>{status}</Badge>

        {/* Back-navigation dropdown for corrections */}
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-sm border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
          aria-label="Status ändern"
        >
          <option value="entwurf">Entwurf</option>
          <option value="review">Review</option>
          <option value="publiziert">Publiziert</option>
        </select>

        {/* Forward-only advance button */}
        {nextStatus && nextStatusLabel && (
          <button
            onClick={() => handleStatusChange(nextStatus)}
            className="text-sm bg-[#abd5f4] px-3 py-1 hover:bg-[#8fc4e8] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
          >
            {nextStatusLabel}
          </button>
        )}

        {/* Regenerate button */}
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="ml-auto text-sm border border-gray-300 px-3 py-1 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none disabled:opacity-50"
        >
          {isRegenerating ? 'Regeneriert...' : 'Regenerieren'}
        </button>
      </div>

      {statusError && (
        <p className="mb-2 text-sm text-red-600">{statusError}</p>
      )}

      {/* Two-column layout: preview (left) + editor (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column — read-only visual preview */}
        <div
          className="pointer-events-none select-none rounded bg-gray-50 p-4"
          aria-hidden="true"
        >
          <p className="mb-2 text-xs text-gray-400">Vorschau</p>
          <h3 className="font-heading text-lg font-semibold text-[#333333]">{title}</h3>
          {metaTitle && (
            <p className="mt-1 text-sm text-gray-500">{metaTitle}</p>
          )}
          {metaDesc && (
            <p className="mt-1 text-sm text-gray-400">{metaDesc}</p>
          )}
          <p className="mt-3 text-xs text-gray-300">
            {sections.length} {sections.length === 1 ? 'Sektion' : 'Sektionen'}
          </p>
        </div>

        {/* Right column — editable fields */}
        <div className="space-y-4">
          {/* Metadata inputs */}
          <div>
            <label
              htmlFor={`title-${row.id}`}
              className="block text-sm font-medium text-[#666666] mb-1"
            >
              Seitentitel
            </label>
            <input
              id={`title-${row.id}`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
            />
          </div>

          <div>
            <label
              htmlFor={`meta-title-${row.id}`}
              className="block text-sm font-medium text-[#666666] mb-1"
            >
              Meta-Titel
            </label>
            <input
              id={`meta-title-${row.id}`}
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className={`w-full border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none ${getBorderClass(metaTitle.length, 60)}`}
            />
            <CharacterCounter current={metaTitle.length} limit={60} />
          </div>

          <div>
            <label
              htmlFor={`meta-desc-${row.id}`}
              className="block text-sm font-medium text-[#666666] mb-1"
            >
              Meta-Beschreibung
            </label>
            <textarea
              id={`meta-desc-${row.id}`}
              value={metaDesc}
              onChange={(e) => setMetaDesc(e.target.value)}
              rows={3}
              className={`w-full border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none ${getBorderClass(metaDesc.length, 160)}`}
            />
            <CharacterCounter current={metaDesc.length} limit={160} />
          </div>

          {/* Per-section editors — collapsed by default */}
          {sections.map((section, i) => (
            <details key={i} className="border border-gray-200">
              <summary className="cursor-pointer bg-gray-50 px-3 py-2 text-sm font-medium text-[#666666]">
                {String(section.type ?? `Sektion ${i + 1}`)}
              </summary>
              <div className="space-y-2 px-3 py-2">
                {Object.entries(section)
                  .filter(([key]) => key !== 'type' && typeof section[key] === 'string')
                  .map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-0.5">{key}</label>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => updateSectionField(i, key, e.target.value)}
                        className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
                      />
                    </div>
                  ))}
              </div>
            </details>
          ))}

          {/* Save button with unsaved changes indicator */}
          <div>
            {isDirty && (
              <p className="mb-1 text-xs text-orange-500">Ungespeicherte Änderungen</p>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || isPending}
              className="bg-[#abd5f4] px-4 py-2 text-sm hover:bg-[#8fc4e8] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none disabled:opacity-50"
            >
              {isPending ? 'Speichert...' : 'Speichern'}
            </button>
            {saveError && (
              <p className="mt-1 text-sm text-red-600">{saveError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
