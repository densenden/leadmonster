'use client'

// Client Component form for creating and editing Wissensfundus articles.
// Supports both create mode (no artikel prop) and edit mode (artikel prop present).
// Performs client-side Zod validation before calling the server action to avoid
// unnecessary round trips; merges server-side field errors on action failure.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { wissensfundusSchema } from '@/lib/validation/wissensfundus'
import type { ActionResult, Wissensfundus } from '@/lib/supabase/types'

type KategorieOption = 'sterbegeld' | 'pflege' | 'leben' | 'unfall' | 'allgemein'

const KATEGORIE_OPTIONS: { value: KategorieOption; label: string }[] = [
  { value: 'sterbegeld', label: 'Sterbegeld' },
  { value: 'pflege', label: 'Pflege' },
  { value: 'leben', label: 'Lebensversicherung' },
  { value: 'unfall', label: 'Unfall' },
  { value: 'allgemein', label: 'Allgemein' },
]

interface WissensfundusFormProps {
  // Present in edit mode; absent in create mode.
  artikel?: Wissensfundus
  // Receives either createArtikel or updateArtikel (bound with id) from the page.
  action: (formData: FormData) => Promise<ActionResult>
}

export function WissensfundusForm({ artikel, action }: WissensfundusFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Controlled field state — initialized from existing article in edit mode.
  const [kategorie, setKategorie] = useState<KategorieOption>(
    (artikel?.kategorie as KategorieOption) ?? 'allgemein'
  )
  const [thema, setThema] = useState(artikel?.thema ?? '')
  const [inhalt, setInhalt] = useState(artikel?.inhalt ?? '')
  // Tags stored as comma-separated string matching the user input.
  const [tags, setTags] = useState(artikel?.tags?.join(', ') ?? '')

  // Field-level error messages from either client-side Zod or server action response.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  // Top-level error from the server action (e.g. DB error, auth error).
  const [serverError, setServerError] = useState<string | undefined>()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(undefined)

    // Parse and filter tags client-side to mirror server action behavior.
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    // Client-side Zod validation — avoids unnecessary server round trip.
    const parsed = wissensfundusSchema.safeParse({
      kategorie,
      thema,
      inhalt,
      tags: parsedTags,
    })

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors)
      return
    }

    // Clear client-side errors before the server call.
    setFieldErrors({})

    // Build a FormData matching what the server action expects.
    const formData = new FormData()
    formData.set('kategorie', kategorie)
    formData.set('thema', thema)
    formData.set('inhalt', inhalt)
    formData.set('tags', tags)

    startTransition(async () => {
      const result = await action(formData)
      if (result.success) {
        router.push('/admin/wissensfundus')
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as Record<string, string[]>)
      } else if (result.error) {
        setServerError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top-level server error */}
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      {/* Kategorie select */}
      <div>
        <label
          htmlFor="kategorie"
          className="mb-1.5 block text-sm font-medium text-[#333333]"
        >
          Kategorie
        </label>
        <select
          id="kategorie"
          name="kategorie"
          value={kategorie}
          onChange={(e) => setKategorie(e.target.value as KategorieOption)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#333333] focus:border-[#1a365d] focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
        >
          {KATEGORIE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {fieldErrors.kategorie && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.kategorie[0]}</p>
        )}
      </div>

      {/* Thema input */}
      <div>
        <label
          htmlFor="thema"
          className="mb-1.5 block text-sm font-medium text-[#333333]"
        >
          Thema
        </label>
        <input
          id="thema"
          name="thema"
          type="text"
          value={thema}
          onChange={(e) => setThema(e.target.value)}
          placeholder="Kurzes Thema-Label (min. 3 Zeichen)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#333333] placeholder:text-[#999999] focus:border-[#1a365d] focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
        />
        {fieldErrors.thema && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.thema[0]}</p>
        )}
      </div>

      {/* Inhalt textarea */}
      <div>
        <label
          htmlFor="inhalt"
          className="mb-1.5 block text-sm font-medium text-[#333333]"
        >
          Inhalt
        </label>
        <textarea
          id="inhalt"
          name="inhalt"
          value={inhalt}
          onChange={(e) => setInhalt(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#333333] placeholder:text-[#999999] focus:border-[#1a365d] focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-[#999999]">Markdown wird unterstützt</p>
          <p className="text-xs text-[#999999]">{inhalt.length} Zeichen</p>
        </div>
        {fieldErrors.inhalt && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.inhalt[0]}</p>
        )}
      </div>

      {/* Tags input */}
      <div>
        <label
          htmlFor="tags"
          className="mb-1.5 block text-sm font-medium text-[#333333]"
        >
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="z.B. grundlagen, senioren, sofortschutz"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#333333] placeholder:text-[#999999] focus:border-[#1a365d] focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
        />
        <p className="mt-1 text-xs text-[#999999]">Kommagetrennte Tags, max. 10</p>
        {fieldErrors.tags && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.tags[0]}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#1a365d]/50 disabled:opacity-60"
        >
          {isPending ? 'Wird gespeichert…' : 'Speichern'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/wissensfundus')}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-[#666666] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
