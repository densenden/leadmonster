'use client'

/**
 * ProduktTypForm — Editor für eine `produkt_typen`-Row.
 *
 * Felder gegliedert in:
 *   - Stammdaten (slug, name, einheit, wissensfundus_label, active)
 *   - Vergleichsrechner-Defaults (summen-Liste, default_*, min/max_age, Labels)
 *   - Filter-Achsen (FilterAxesEditor)
 *   - Bild-Generator (image_brand_look JSON, image_typ_scenes Tag-Input)
 *
 * Validierung läuft client-seitig via Zod (mirror der Server-Action), Server
 * antwortet mit fieldErrors bei Schema-Fehlern.
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  produktTypSchema,
  type ProduktTypInput,
  type FilterAxisInput,
} from '@/lib/validation/produkt-typen'
import { FilterAxesEditor } from './FilterAxesEditor'
import { BrandLookEditor } from './BrandLookEditor'
import {
  createProduktTyp,
  updateProduktTyp,
} from '@/app/admin/produkt-typen/actions'
import type { ActionResult } from '@/lib/supabase/types'

const INPUT =
  'w-full border border-gray-300 bg-white px-3 py-2 text-sm text-[#333333] placeholder:text-[#999999] focus:border-[#abd5f4] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none'
const LABEL = 'mb-1.5 block text-sm font-medium text-[#333333]'
const ERR = 'mt-1 text-sm text-red-600'

interface Props {
  mode: 'create' | 'edit'
  initialData?: Partial<ProduktTypInput> & { slug?: string }
}

export function ProduktTypForm({ mode, initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [name, setName] = useState(initialData?.name ?? '')
  const [einheit, setEinheit] = useState<'eur_summe' | 'eur_monat'>(
    (initialData?.einheit as 'eur_summe' | 'eur_monat') ?? 'eur_summe',
  )
  const [summen, setSummen] = useState<number[]>(initialData?.summen ?? [])
  const [summenInput, setSummenInput] = useState('')
  const [defaultSumme, setDefaultSumme] = useState<number>(
    initialData?.default_summe ?? 0,
  )
  const [defaultAge, setDefaultAge] = useState<number>(initialData?.default_age ?? 50)
  const [minAge, setMinAge] = useState<number>(initialData?.min_age ?? 18)
  const [maxAge, setMaxAge] = useState<number>(initialData?.max_age ?? 80)
  const [summeLabel, setSummeLabel] = useState(
    initialData?.summe_label ?? 'Wunschsumme',
  )
  const [beitragLabel, setBeitragLabel] = useState(
    initialData?.beitrag_label ?? 'Beitrag / Monat',
  )
  const [summeSuffix, setSummeSuffix] = useState(initialData?.summe_suffix ?? '€')
  const [filterAxes, setFilterAxes] = useState<FilterAxisInput[]>(
    initialData?.filter_axes ?? [],
  )
  const [brandLook, setBrandLook] = useState<{
    palette: string
    lighting: string
    motifs: string
  } | null>(initialData?.image_brand_look ?? null)
  const [scenes, setScenes] = useState<string[]>(initialData?.image_typ_scenes ?? [])
  const [scenesInput, setScenesInput] = useState('')
  const [wissensfundusLabel, setWissensfundusLabel] = useState(
    initialData?.wissensfundus_label ?? '',
  )
  const [active, setActive] = useState<boolean>(initialData?.active ?? true)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [globalError, setGlobalError] = useState<string | undefined>()

  function addSumme() {
    const v = parseInt(summenInput, 10)
    if (Number.isNaN(v) || v <= 0) return
    if (summen.includes(v)) return
    setSummen(prev => [...prev, v].sort((a, b) => a - b))
    setSummenInput('')
  }

  function removeSumme(v: number) {
    setSummen(prev => prev.filter(s => s !== v))
  }

  function addScene() {
    const v = scenesInput.trim()
    if (!v) return
    setScenes(prev => [...prev, v])
    setScenesInput('')
  }

  function removeScene(i: number) {
    setScenes(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setGlobalError(undefined)

    const payload: ProduktTypInput = {
      slug: slug.trim(),
      name: name.trim(),
      summen,
      default_summe: defaultSumme,
      default_age: defaultAge,
      min_age: minAge,
      max_age: maxAge,
      summe_label: summeLabel.trim(),
      beitrag_label: beitragLabel.trim(),
      summe_suffix: summeSuffix.trim(),
      einheit,
      filter_axes: filterAxes,
      image_brand_look: brandLook,
      image_typ_scenes: scenes.length > 0 ? scenes : null,
      wissensfundus_label: wissensfundusLabel.trim() || name.trim(),
      active,
    }

    const parsed = produktTypSchema.safeParse(payload)
    if (!parsed.success) {
      const fe: Record<string, string[]> = {}
      for (const i of parsed.error.issues) {
        const k = i.path.join('.') || '_root'
        fe[k] = [...(fe[k] ?? []), i.message]
      }
      setFieldErrors(fe)
      return
    }

    startTransition(async () => {
      const result: ActionResult =
        mode === 'create'
          ? await createProduktTyp(parsed.data)
          : await updateProduktTyp(initialData!.slug!, parsed.data)
      if (result.success) {
        router.push('/admin/produkt-typen')
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as Record<string, string[]>)
      } else if (result.error) {
        setGlobalError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8" noValidate>
      {globalError && (
        <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}
      {fieldErrors._root && (
        <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fieldErrors._root.join(' · ')}
        </div>
      )}

      {/* Stammdaten */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-[#333]">Stammdaten</legend>

        <div>
          <label htmlFor="slug" className={LABEL}>Slug *</label>
          <input
            id="slug"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase())}
            placeholder="z.B. zahnzusatz"
            className={`${INPUT} font-mono`}
            disabled={mode === 'edit'}
          />
          <p className="mt-1 text-xs text-[#999]">Kleinbuchstaben, Zahlen, _ und -. PK der Tabelle und FK von produkte.typ.</p>
          {fieldErrors.slug && <p className={ERR}>{fieldErrors.slug[0]}</p>}
        </div>

        <div>
          <label htmlFor="name" className={LABEL}>Name *</label>
          <input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z.B. Zahnzusatzversicherung"
            className={INPUT}
          />
          {fieldErrors.name && <p className={ERR}>{fieldErrors.name[0]}</p>}
        </div>

        <div>
          <label htmlFor="einheit" className={LABEL}>Einheit *</label>
          <select
            id="einheit"
            value={einheit}
            onChange={e => setEinheit(e.target.value as 'eur_summe' | 'eur_monat')}
            className={INPUT}
          >
            <option value="eur_summe">Versicherungssumme (€)</option>
            <option value="eur_monat">Monatsrente (€ / Monat)</option>
          </select>
        </div>

        <div>
          <label htmlFor="wf-label" className={LABEL}>Wissensfundus-Label</label>
          <input
            id="wf-label"
            value={wissensfundusLabel}
            onChange={e => setWissensfundusLabel(e.target.value)}
            placeholder="z.B. Zahnzusatz"
            className={INPUT}
          />
          <p className="mt-1 text-xs text-[#999]">Kurzer Name in der Wissensfundus-Kategorie-Auswahl.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#333]">
          <input
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
            className="h-4 w-4"
          />
          Aktiv (in Admin-Dropdowns sichtbar)
        </label>
      </fieldset>

      {/* Vergleichsrechner-Defaults */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-[#333]">Vergleichsrechner-Defaults</legend>

        <div>
          <label className={LABEL}>Summen / Renten *</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {summen.map(v => (
              <span key={v} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 text-xs">
                {v.toLocaleString('de-DE')}
                <button
                  type="button"
                  onClick={() => removeSumme(v)}
                  className="ml-0.5 text-gray-500 hover:text-red-600"
                  aria-label={`${v} entfernen`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={summenInput}
              onChange={e => setSummenInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSumme()
                }
              }}
              placeholder="z.B. 5000"
              className={INPUT}
            />
            <button
              type="button"
              onClick={addSumme}
              className="border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              + Hinzufügen
            </button>
          </div>
          {fieldErrors.summen && <p className={ERR}>{fieldErrors.summen[0]}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Default-Summe *</label>
            <input
              type="number"
              value={defaultSumme}
              onChange={e => setDefaultSumme(parseInt(e.target.value, 10) || 0)}
              className={INPUT}
            />
            {fieldErrors.default_summe && <p className={ERR}>{fieldErrors.default_summe[0]}</p>}
          </div>
          <div>
            <label className={LABEL}>Default-Alter *</label>
            <input
              type="number"
              value={defaultAge}
              onChange={e => setDefaultAge(parseInt(e.target.value, 10) || 0)}
              className={INPUT}
            />
            {fieldErrors.default_age && <p className={ERR}>{fieldErrors.default_age[0]}</p>}
          </div>
          <div>
            <label className={LABEL}>Min/Max-Alter *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minAge}
                onChange={e => setMinAge(parseInt(e.target.value, 10) || 0)}
                className={INPUT}
                aria-label="Mindestalter"
              />
              <span className="text-[#999]">–</span>
              <input
                type="number"
                value={maxAge}
                onChange={e => setMaxAge(parseInt(e.target.value, 10) || 0)}
                className={INPUT}
                aria-label="Höchstalter"
              />
            </div>
            {fieldErrors.max_age && <p className={ERR}>{fieldErrors.max_age[0]}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Summe-Label</label>
            <input
              value={summeLabel}
              onChange={e => setSummeLabel(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Beitrag-Label</label>
            <input
              value={beitragLabel}
              onChange={e => setBeitragLabel(e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Summe-Suffix</label>
            <input
              value={summeSuffix}
              onChange={e => setSummeSuffix(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
      </fieldset>

      {/* Filter-Achsen */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-[#333]">Filter-Achsen</legend>
        <p className="text-xs text-[#999]">
          Optionale dritte Strukturachse zusätzlich zu Geburtsjahr+Summe — z. B. Wartezeit
          (Sterbegeld), Berufsklasse (BU), Pflegegrad (Pflege).
        </p>
        <FilterAxesEditor axes={filterAxes} onChange={setFilterAxes} />
        {fieldErrors.filter_axes && <p className={ERR}>{fieldErrors.filter_axes[0]}</p>}
      </fieldset>

      {/* Bild-Generator */}
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-[#333]">Bild-Generator</legend>
        <BrandLookEditor value={brandLook} onChange={setBrandLook} />

        <div>
          <label className={LABEL}>Scene-Beschreibungen</label>
          <div className="mb-2 space-y-2">
            {scenes.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-1 bg-gray-50 px-3 py-2 text-xs text-[#666]">{s}</span>
                <button
                  type="button"
                  onClick={() => removeScene(i)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label={`Scene ${i + 1} entfernen`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={scenesInput}
              onChange={e => setScenesInput(e.target.value)}
              placeholder="Englische Scene-Beschreibung für Hero-Bild-Prompt"
              className={INPUT}
            />
            <button
              type="button"
              onClick={addScene}
              className="border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 whitespace-nowrap"
            >
              + Hinzufügen
            </button>
          </div>
        </div>
      </fieldset>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#1a365d] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 disabled:opacity-60 rounded-none"
        >
          {isPending ? 'Wird gespeichert…' : mode === 'create' ? 'Versicherungsart anlegen' : 'Änderungen speichern'}
        </button>
      </div>
    </form>
  )
}
