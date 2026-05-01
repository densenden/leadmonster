'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trustSchema, TRUST_TYPES, TRUST_TYPE_LABELS } from '@/lib/validation/trust'
import type { ActionResult, TrustBaustein } from '@/lib/supabase/types'

interface ProduktOption {
  id: string
  name: string
}

interface Props {
  baustein?: TrustBaustein
  bausteinId?: string
  produkte: ProduktOption[]
  action: (formData: FormData) => Promise<ActionResult>
}

export function TrustForm({ baustein, bausteinId, produkte, action }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const [slug, setSlug] = useState(baustein?.slug ?? '')
  const [typ, setTyp] = useState(baustein?.typ ?? 'pressezitat')
  const [titel, setTitel] = useState(baustein?.titel ?? '')
  const [body, setBody] = useState(baustein?.body ?? '')
  const [bildUrl, setBildUrl] = useState(baustein?.bild_url ?? '')
  const [bildAlt, setBildAlt] = useState(baustein?.bild_alt ?? '')
  const [quelleUrl, setQuelleUrl] = useState(baustein?.quelle_url ?? '')
  const [quelleName, setQuelleName] = useState(baustein?.quelle_name ?? '')
  const [jahr, setJahr] = useState(baustein?.jahr?.toString() ?? '')
  const [score, setScore] = useState(baustein?.score ?? '')
  const [autorName, setAutorName] = useState(baustein?.autor_name ?? '')
  const [autorAlter, setAutorAlter] = useState(baustein?.autor_alter ?? '')
  const [produktId, setProduktId] = useState(baustein?.produkt_id ?? '')
  const [reihenfolge, setReihenfolge] = useState(baustein?.reihenfolge?.toString() ?? '100')
  const [aktiv, setAktiv] = useState(baustein?.aktiv ?? true)
  const [belegtDurch, setBelegtDurch] = useState(baustein?.belegt_durch ?? '')

  const [fotoUploading, setFotoUploading] = useState(false)
  const [fotoError, setFotoError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [serverError, setServerError] = useState<string>()

  async function handleFileUpload(file: File) {
    if (!bausteinId) {
      setFotoError('Bild-Upload erst nach erstem Speichern möglich.')
      return
    }
    setFotoError(undefined)
    setFotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('bild', file)
      const res = await fetch(`/api/admin/trust/${bausteinId}/bild`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setFotoError(json.error ?? 'Upload fehlgeschlagen')
        return
      }
      setBildUrl(json.url)
    } catch (e) {
      setFotoError(e instanceof Error ? e.message : 'Upload-Fehler')
    } finally {
      setFotoUploading(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(undefined)

    const payload = {
      slug,
      typ: typ as typeof TRUST_TYPES[number],
      titel,
      body: body || null,
      bild_url: bildUrl || null,
      bild_alt: bildAlt || null,
      quelle_url: quelleUrl || null,
      quelle_name: quelleName || null,
      jahr: jahr ? Number(jahr) : null,
      score: score || null,
      autor_name: autorName || null,
      autor_alter: autorAlter || null,
      produkt_id: produktId || null,
      reihenfolge: Number(reihenfolge) || 100,
      aktiv,
      belegt_durch: belegtDurch || null,
    }

    const parsed = trustSchema.safeParse(payload)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      return
    }
    setFieldErrors({})

    const formData = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (k === 'aktiv') {
        if (v) formData.set('aktiv', 'on')
        return
      }
      formData.set(k, v === null || v === undefined ? '' : String(v))
    })

    startTransition(async () => {
      const result = await action(formData)
      if (result.success) {
        router.push('/admin/trust')
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as Record<string, string[]>)
      } else if (result.error) {
        setServerError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999]">
          Stammdaten
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Typ *" error={fieldErrors.typ?.[0]}>
            <select value={typ} onChange={e => setTyp(e.target.value as typeof TRUST_TYPES[number])} className={inputCls}>
              {TRUST_TYPES.map(t => (<option key={t} value={t}>{TRUST_TYPE_LABELS[t]}</option>))}
            </select>
          </Field>
          <Field label="Slug *" error={fieldErrors.slug?.[0]} hint="kebab-case">
            <input value={slug} onChange={e => setSlug(e.target.value)} className={inputCls} required />
          </Field>
          <div className="col-span-2">
            <Field label="Titel *" error={fieldErrors.titel?.[0]}>
              <input value={titel} onChange={e => setTitel(e.target.value)} className={inputCls} required />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Body" error={fieldErrors.body?.[0]}
              hint="Zitat / Beschreibung / Review-Text">
              <textarea value={body ?? ''} onChange={e => setBody(e.target.value)} rows={4} className={inputCls} />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999]">
          Bild / Logo / Siegel
        </legend>
        <div className="flex items-start gap-4">
          {bildUrl
            ? <img src={bildUrl} alt={bildAlt ?? ''} className="h-24 w-24 object-contain border border-gray-200 bg-white rounded-lg p-2" />
            : <div className="h-24 w-24 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">kein Bild</div>
          }
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
              disabled={!bausteinId || fotoUploading}
              className="text-sm"
            />
            <Field label="Bild-URL" error={fieldErrors.bild_url?.[0]}>
              <input value={bildUrl ?? ''} onChange={e => setBildUrl(e.target.value)} className={inputCls} placeholder="https://… (manuell setzbar)" />
            </Field>
            <Field label="Bild-ALT" error={fieldErrors.bild_alt?.[0]}>
              <input value={bildAlt ?? ''} onChange={e => setBildAlt(e.target.value)} className={inputCls} placeholder="z.B. FOCUS Money Logo" />
            </Field>
            {fotoError && <p className="text-xs text-red-600">{fotoError}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999]">
          Quelle &amp; Beleg (Compliance)
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quelle-URL" error={fieldErrors.quelle_url?.[0]} hint="Pflicht bei Pressezitat/Siegel/Auszeichnung">
            <input value={quelleUrl ?? ''} onChange={e => setQuelleUrl(e.target.value)} className={inputCls} placeholder="https://…" />
          </Field>
          <Field label="Quelle-Name" error={fieldErrors.quelle_name?.[0]}>
            <input value={quelleName ?? ''} onChange={e => setQuelleName(e.target.value)} className={inputCls} placeholder="FOCUS Money 11/2025" />
          </Field>
          <Field label="Jahr" error={fieldErrors.jahr?.[0]}>
            <input type="number" min="1900" max="2100" value={jahr} onChange={e => setJahr(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Score" error={fieldErrors.score?.[0]} hint="z.B. 1,3 / ★★★★★ / 98/100">
            <input value={score ?? ''} onChange={e => setScore(e.target.value)} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Beleg" error={fieldErrors.belegt_durch?.[0]} hint="z.B. Scan in Drive / PDF-Pfad — Pflicht bevor aktiv geschaltet werden darf">
              <input value={belegtDurch ?? ''} onChange={e => setBelegtDurch(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999]">
          Kundenstimme (nur bei typ = kunden_review)
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Autor-Name" error={fieldErrors.autor_name?.[0]} hint="z.B. Maria B.">
            <input value={autorName ?? ''} onChange={e => setAutorName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Autor-Alter / Stadt" error={fieldErrors.autor_alter?.[0]} hint="z.B. 63 Jahre · Köln">
            <input value={autorAlter ?? ''} onChange={e => setAutorAlter(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999]">
          Zuordnung &amp; Sichtbarkeit
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Produkt" error={fieldErrors.produkt_id?.[0]} hint="leer = global, sonst nur dieses Produkt">
            <select value={produktId ?? ''} onChange={e => setProduktId(e.target.value)} className={inputCls}>
              <option value="">— global —</option>
              {produkte.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </Field>
          <Field label="Reihenfolge" error={fieldErrors.reihenfolge?.[0]} hint="kleiner = weiter vorn">
            <input type="number" min="0" max="9999" value={reihenfolge} onChange={e => setReihenfolge(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={aktiv} onChange={e => setAktiv(e.target.checked)} />
          <strong>Aktiv</strong> — wird auf der Public-Site gerendert
        </label>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 disabled:opacity-60"
        >
          {isPending ? 'Speichert…' : baustein ? 'Änderungen speichern' : 'Trust-Baustein anlegen'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/trust')}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-[#666] hover:bg-gray-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#333] placeholder:text-[#999] focus:border-[#1a365d] focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}
function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#333]">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-[#999]">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
