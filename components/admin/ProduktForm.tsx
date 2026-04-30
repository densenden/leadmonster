'use client'

// Client Component form for creating and editing Produkt entries.
// Supports both create mode (no initialData prop) and edit mode (initialData present).
// Slug is auto-generated from the name field until the user manually edits it.
// Anbieter entries are managed as a tag-style input with Enter-to-add.
// Verkaufsargumente are managed as dynamic key-value rows.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProduktWithConfig, ProduktStatus } from '@/lib/supabase/types'
import { MonsterLogo } from '@/components/MonsterLogo'
import { resolveAccentColor, ACCENT_DEFAULTS } from '@/lib/utils/accent'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYP_OPTIONS = [
  { value: 'sterbegeld', label: 'Sterbegeldversicherung' },
  { value: 'pflege', label: 'Pflegeversicherung' },
  { value: 'leben', label: 'Lebensversicherung' },
  { value: 'unfall', label: 'Unfallversicherung' },
  { value: 'bu', label: 'Berufsunfähigkeitsversicherung' },
] as const

const ZIELGRUPPE_OPTIONS = [
  { value: 'senioren_50plus', label: 'Senioren 50+' },
  { value: 'familien', label: 'Familien' },
  { value: 'alleinstehende', label: 'Alleinstehende' },
  { value: 'paare', label: 'Paare' },
  { value: 'berufstaetige', label: 'Berufstätige' },
] as const

const FOKUS_OPTIONS = [
  { value: 'sicherheit', label: 'Sicherheit & Verlässlichkeit' },
  { value: 'preis', label: 'Bester Preis' },
  { value: 'sofortschutz', label: 'Sofortschutz' },
] as const

const STATUS_OPTIONS = [
  { value: 'entwurf', label: 'Entwurf' },
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'archiviert', label: 'Archiviert' },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArgumenteRow {
  key: string
  value: string
}

interface ProduktFormProps {
  mode: 'create' | 'edit'
  initialData?: ProduktWithConfig
}

// Shared Tailwind classes for form inputs — border-radius 0px per design token.
const INPUT_CLASS =
  'w-full border border-gray-300 bg-white px-3 py-2 text-sm text-[#333333] placeholder:text-[#999999] focus:border-[#abd5f4] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none'

const LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-[#333333]'

const ERROR_CLASS = 'mt-1 text-sm text-red-600'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProduktForm({ mode, initialData }: ProduktFormProps) {
  const router = useRouter()

  // Core product fields.
  const [name, setName] = useState(initialData?.name ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [typ, setTyp] = useState(initialData?.typ ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'entwurf')
  const [accentColor, setAccentColor] = useState(
    resolveAccentColor(initialData?.typ ?? '', initialData?.accent_color)
  )
  // Convexa-Form-Token pro Produkt — leer = nutze globalen Default aus
  // einstellungen.convexa_form_token bzw. process.env.CONVEXA_FORM_TOKEN.
  const [convexaFormToken, setConvexaFormToken] = useState(
    initialData?.convexa_form_token ?? '',
  )

  // Slug pristine flag — when true, slug auto-updates from name.
  const [slugPristine, setSlugPristine] = useState(mode === 'create')

  // Config fields.
  const [zielgruppe, setZielgruppe] = useState<string[]>(
    initialData?.produkt_config?.zielgruppe ?? [],
  )
  const [fokus, setFokus] = useState(initialData?.produkt_config?.fokus ?? '')
  const [anbieter, setAnbieter] = useState<string[]>(
    initialData?.produkt_config?.anbieter ?? [],
  )
  const [anbieterInput, setAnbieterInput] = useState('')

  // Argumente stored as rows for the dynamic key-value editor.
  const [argumente, setArgumente] = useState<ArgumenteRow[]>(() => {
    const existing = initialData?.produkt_config?.argumente
    if (!existing) return []
    return Object.entries(existing).map(([key, value]) => ({ key, value }))
  })

  // Form state.
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | undefined>()

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newName = e.target.value
    setName(newName)
    if (slugPristine) {
      setSlug(slugify(newName))
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugPristine(false)
    setSlug(e.target.value)
  }

  function handleZielgruppeChange(value: string, checked: boolean) {
    setZielgruppe((prev) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value),
    )
  }

  function handleAnbieterKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = anbieterInput.trim()
      if (trimmed.length === 0) return
      setAnbieter((prev) => [...prev, trimmed])
      setAnbieterInput('')
    }
  }

  function removeAnbieter(index: number) {
    setAnbieter((prev) => prev.filter((_, i) => i !== index))
  }

  function addArgumentRow() {
    setArgumente((prev) => [...prev, { key: '', value: '' }])
  }

  function updateArgumentRow(
    index: number,
    field: 'key' | 'value',
    value: string,
  ) {
    setArgumente((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  function removeArgumentRow(index: number) {
    setArgumente((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setGlobalError(undefined)

    // Basic client-side required field check before hitting the API.
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'Produktname ist erforderlich.'
    if (!slug.trim()) errors.slug = 'URL-Slug ist erforderlich.'
    if (!typ) errors.typ = 'Produkttyp ist erforderlich.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Serialise argumente rows to Record<string, string>.
    const argumenteRecord: Record<string, string> = {}
    for (const row of argumente) {
      if (row.key.trim()) argumenteRecord[row.key.trim()] = row.value
    }

    const tokenTrimmed = convexaFormToken.trim()

    const payload =
      mode === 'edit'
        ? {
            id: initialData!.id,
            name,
            slug,
            typ,
            status,
            accent_color: /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : undefined,
            convexa_form_token: tokenTrimmed,
            zielgruppe,
            fokus: fokus || undefined,
            anbieter,
            argumente: Object.keys(argumenteRecord).length > 0 ? argumenteRecord : undefined,
          }
        : {
            name,
            slug,
            typ,
            accent_color: /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : undefined,
            convexa_form_token: tokenTrimmed,
            zielgruppe,
            fokus: fokus || undefined,
            anbieter,
            argumente: Object.keys(argumenteRecord).length > 0 ? argumenteRecord : undefined,
          }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/produkte', {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await response.json()

      if (response.status === 409 && json.error?.code === 'SLUG_EXISTS') {
        setFieldErrors({ slug: 'Dieser URL-Slug ist bereits vergeben.' })
        return
      }

      if (response.status === 400 && json.error?.code === 'VALIDATION_ERROR') {
        const serverErrors: Record<string, string> = {}
        for (const [field, messages] of Object.entries(
          json.error.details as Record<string, string[]>,
        )) {
          serverErrors[field] = messages[0] ?? 'Ungültiger Wert.'
        }
        setFieldErrors(serverErrors)
        return
      }

      if (!response.ok) {
        setGlobalError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
        return
      }

      // Navigate to the product edit page after successful save.
      // router.refresh() forces re-fetch of the Server Component so the
      // freshly-saved name/slug/typ appear instead of cached old values.
      router.push(`/admin/produkte/${json.data.id}`)
      router.refresh()
    } catch {
      setGlobalError('Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.')
    } finally {
      setIsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6" noValidate>
      {/* Global server error */}
      {globalError && (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {globalError}
        </div>
      )}

      {/* Produktname */}
      <div>
        <label htmlFor="name" className={LABEL_CLASS}>
          Produktname <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={name}
          onChange={handleNameChange}
          placeholder="z.B. Sterbegeld24Plus"
          className={INPUT_CLASS}
        />
        {fieldErrors.name && (
          <p className={ERROR_CLASS}>{fieldErrors.name}</p>
        )}
      </div>

      {/* URL-Slug */}
      <div>
        <label htmlFor="slug" className={LABEL_CLASS}>
          URL-Slug <span aria-hidden="true">*</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          value={slug}
          onChange={handleSlugChange}
          placeholder="z.B. sterbegeld24plus"
          className={INPUT_CLASS}
        />
        {slug && (
          <p className="mt-1 text-sm text-gray-500">/{slug}</p>
        )}
        {fieldErrors.slug && (
          <p className={ERROR_CLASS}>{fieldErrors.slug}</p>
        )}
      </div>

      {/* Produkttyp */}
      <div>
        <label htmlFor="typ" className={LABEL_CLASS}>
          Produkttyp <span aria-hidden="true">*</span>
        </label>
        <select
          id="typ"
          name="typ"
          required
          value={typ}
          onChange={(e) => {
            const newTyp = e.target.value
            setTyp(newTyp)
            // Auto-fill accent color from type default only if user hasn't customised it
            if (newTyp in ACCENT_DEFAULTS) {
              setAccentColor(ACCENT_DEFAULTS[newTyp])
            }
          }}
          className={INPUT_CLASS}
        >
          <option value="">Bitte wählen …</option>
          {TYP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {fieldErrors.typ && (
          <p className={ERROR_CLASS}>{fieldErrors.typ}</p>
        )}
      </div>

      {/* Akzentfarbe */}
      <div>
        <label htmlFor="accent_color" className={LABEL_CLASS}>
          Akzentfarbe
        </label>
        <div className="flex items-center gap-3">
          <MonsterLogo color={accentColor} size={36} />
          <input
            id="accent_color"
            name="accent_color"
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-9 w-14 cursor-pointer border border-gray-300 bg-white p-0.5"
          />
          <input
            type="text"
            value={accentColor}
            onChange={(e) => {
              if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setAccentColor(e.target.value)
            }}
            maxLength={7}
            className="w-28 border border-gray-300 px-2 py-1.5 text-sm font-mono text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
          />
        </div>
        <p className="mt-1 text-xs text-[#999999]">
          Wird automatisch nach Produkttyp vorausgefüllt — frei anpassbar.
        </p>
      </div>

      {/* Convexa-Form-Token */}
      <div>
        <label htmlFor="convexa_form_token" className={LABEL_CLASS}>
          Convexa Form-Token
        </label>
        <input
          id="convexa_form_token"
          name="convexa_form_token"
          type="text"
          value={convexaFormToken}
          onChange={(e) => setConvexaFormToken(e.target.value)}
          placeholder="leer = globalen Default aus den Einstellungen verwenden"
          autoComplete="off"
          spellCheck={false}
          className={`${INPUT_CLASS} font-mono`}
        />
        <p className="mt-1 text-xs text-[#999999]">
          Pro-Produkt-Token aus convexa.app — überschreibt den globalen
          Default. Endpunkt: <span className="font-mono">https://api.convexa.app/submissions/&lt;token&gt;</span>
        </p>
      </div>

      {/* Zielgruppe */}
      <fieldset>
        <legend className={`${LABEL_CLASS} mb-2`}>Zielgruppe</legend>
        <div className="space-y-2">
          {ZIELGRUPPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-[#333333]">
              <input
                type="checkbox"
                name="zielgruppe"
                value={opt.value}
                checked={zielgruppe.includes(opt.value)}
                onChange={(e) => handleZielgruppeChange(opt.value, e.target.checked)}
                className="h-4 w-4 rounded-none border-gray-300 text-[#1a365d] focus:ring-[#abd5f4]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Vertriebsfokus */}
      <fieldset>
        <legend className={`${LABEL_CLASS} mb-2`}>
          Vertriebsfokus <span aria-hidden="true">*</span>
        </legend>
        <div className="space-y-2">
          {FOKUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-[#333333]">
              <input
                type="radio"
                name="fokus"
                value={opt.value}
                checked={fokus === opt.value}
                onChange={() => setFokus(opt.value)}
                className="h-4 w-4 border-gray-300 text-[#1a365d] focus:ring-[#abd5f4]"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {fieldErrors.fokus && (
          <p className={ERROR_CLASS}>{fieldErrors.fokus}</p>
        )}
      </fieldset>

      {/* Anbieter tag input */}
      <div>
        <label htmlFor="anbieter-input" className={LABEL_CLASS}>
          Anbieter
        </label>

        {/* Existing anbieter pills */}
        {anbieter.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {anbieter.map((name, i) => (
              <span
                key={i}
                data-testid="anbieter-pill"
                className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              >
                {name}
                <button
                  type="button"
                  aria-label={`${name} entfernen`}
                  onClick={() => removeAnbieter(i)}
                  className="ml-0.5 text-gray-500 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          id="anbieter-input"
          type="text"
          value={anbieterInput}
          onChange={(e) => setAnbieterInput(e.target.value)}
          onKeyDown={handleAnbieterKeyDown}
          placeholder="Versicherer eingeben und Enter drücken"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-[#999999]">Enter drücken um Versicherer hinzuzufügen</p>
      </div>

      {/* Verkaufsargumente key-value editor */}
      <div>
        <span className={LABEL_CLASS}>Verkaufsargumente</span>
        <div className="space-y-2">
          {argumente.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                aria-label={`Argument ${i + 1} Schlüssel`}
                value={row.key}
                onChange={(e) => updateArgumentRow(i, 'key', e.target.value)}
                placeholder="Schlüssel"
                className="flex-1 border border-gray-300 px-2 py-1.5 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
              />
              <input
                type="text"
                aria-label={`Argument ${i + 1} Wert`}
                value={row.value}
                onChange={(e) => updateArgumentRow(i, 'value', e.target.value)}
                placeholder="Wert"
                className="flex-1 border border-gray-300 px-2 py-1.5 text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none"
              />
              <button
                type="button"
                aria-label={`Zeile ${i + 1} entfernen`}
                onClick={() => removeArgumentRow(i)}
                className="text-gray-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addArgumentRow}
          className="mt-2 text-sm text-[#1a365d] hover:underline"
        >
          + Zeile hinzufügen
        </button>
      </div>

      {/* Status — edit mode only */}
      {mode === 'edit' && (
        <div>
          <label htmlFor="status" className={LABEL_CLASS}>
            Status
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProduktStatus)}
            className={INPUT_CLASS}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Submit button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[#1a365d] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 focus:outline-none focus:ring-2 focus:ring-[#abd5f4] disabled:opacity-60 rounded-none"
        >
          {isLoading
            ? 'Wird gespeichert…'
            : mode === 'create'
              ? 'Produkt speichern'
              : 'Änderungen speichern'}
        </button>
      </div>
    </form>
  )
}
