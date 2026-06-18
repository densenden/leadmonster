'use client'

// Client-Form für Autoren-Profile.
// Stammdaten + Bio + § 34d-Block + Foto-Upload + Kontakt + public-Toggle.
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  redaktionSchema,
  EXPERTISE_OPTIONS,
  slugifyName,
  type RedaktionSchema,
} from '@/lib/validation/redaktion'
import type { ActionResult, Redaktion } from '@/lib/supabase/types'
import { PortraitCircle } from '@/components/ui/PortraitCircle'

interface Props {
  autor?: Redaktion
  action: (formData: FormData) => Promise<ActionResult>
  /** Nur in edit-mode: ID für Foto-Upload-Endpoint */
  autorId?: string
}

const ROLLE_PRESETS = [
  'Versicherungsmakler',
  'Versicherungsmakler & Inhaber',
  'Senior Berater',
  'Schadenexperte',
  'Vorsorge-Spezialist',
]

export function RedaktionForm({ autor, action, autorId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [vorname, setVorname] = useState(autor?.vorname ?? '')
  const [nachname, setNachname] = useState(autor?.nachname ?? '')
  const [titel, setTitel] = useState(autor?.titel ?? '')
  const [slug, setSlug] = useState(autor?.slug ?? '')
  const [slugManual, setSlugManual] = useState(Boolean(autor?.slug))
  const [rolle, setRolle] = useState(autor?.rolle ?? ROLLE_PRESETS[0])
  const [kurzBio, setKurzBio] = useState(autor?.kurz_bio ?? '')
  const [langBio, setLangBio] = useState(autor?.lang_bio_md ?? '')
  const [expertise, setExpertise] = useState<string[]>(autor?.expertise ?? [])
  const [qualifikationen, setQualifikationen] = useState(
    autor?.qualifikationen?.join(', ') ?? ''
  )
  const [vermittlerregister, setVermittlerregister] = useState(autor?.vermittlerregister_nr ?? '')
  const [ihkKammer, setIhkKammer] = useState(autor?.ihk_kammer ?? '')
  const [paragraph34d, setParagraph34d] = useState(autor?.paragraph_34d ?? '')
  const [jahreErfahrung, setJahreErfahrung] = useState(
    autor?.jahre_erfahrung?.toString() ?? ''
  )
  const [email, setEmail] = useState(autor?.email ?? '')
  const [telefon, setTelefon] = useState(autor?.telefon ?? '')
  const [linkedin, setLinkedin] = useState(autor?.linkedin_url ?? '')
  const [xing, setXing] = useState(autor?.xing_url ?? '')
  const [website, setWebsite] = useState(autor?.website_url ?? '')
  const [isPublic, setIsPublic] = useState(autor?.public ?? true)

  const [fotoUrl, setFotoUrl] = useState(autor?.foto_url ?? '')
  const [fotoUploading, setFotoUploading] = useState(false)
  const [fotoError, setFotoError] = useState<string>()

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [serverError, setServerError] = useState<string>()

  function handleNameChange(v: string, n: string) {
    setVorname(v)
    setNachname(n)
    if (!slugManual && v && n) setSlug(slugifyName(v, n))
  }

  function toggleExpertise(value: string) {
    setExpertise(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    )
  }

  async function handleFotoUpload(file: File) {
    if (!autorId) {
      setFotoError('Foto-Upload erst nach erstem Speichern möglich.')
      return
    }
    setFotoError(undefined)
    setFotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('foto', file)
      const res = await fetch(`/api/admin/redaktion/${autorId}/foto`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setFotoError(json.error ?? 'Upload fehlgeschlagen')
        return
      }
      setFotoUrl(json.url)
      router.refresh()
    } catch (err) {
      setFotoError(err instanceof Error ? err.message : 'Upload-Fehler')
    } finally {
      setFotoUploading(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError(undefined)

    const payload: RedaktionSchema = {
      slug,
      vorname,
      nachname,
      titel: titel || null,
      rolle,
      kurz_bio: kurzBio,
      lang_bio_md: langBio,
      expertise: expertise as RedaktionSchema['expertise'],
      qualifikationen: qualifikationen.split(',').map(t => t.trim()).filter(Boolean),
      vermittlerregister_nr: vermittlerregister || null,
      ihk_kammer: ihkKammer || null,
      paragraph_34d: paragraph34d || null,
      jahre_erfahrung: jahreErfahrung ? Number(jahreErfahrung) : null,
      email: email || null,
      telefon: telefon || null,
      linkedin_url: linkedin || null,
      xing_url: xing || null,
      website_url: website || null,
      public: isPublic,
    }

    const parsed = redaktionSchema.safeParse(payload)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      return
    }
    setFieldErrors({})

    const formData = new FormData()
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'expertise' || key === 'qualifikationen') return
      if (key === 'public') {
        if (value) formData.set('public', 'on')
        return
      }
      formData.set(key, value === null || value === undefined ? '' : String(value))
    })
    expertise.forEach(e => formData.append('expertise', e))
    formData.set('qualifikationen', qualifikationen)

    startTransition(async () => {
      const result = await action(formData)
      if (result.success) {
        router.push('/admin/redaktion')
        router.refresh()
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors as Record<string, string[]>)
      } else if (result.error) {
        setServerError(result.error)
      }
    })
  }

  const kurzBioCount = kurzBio.length
  const kurzBioStatus =
    kurzBioCount < 200 ? 'text-amber-600' : kurzBioCount > 300 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Stammdaten */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999999]">
          Stammdaten
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vorname *" error={fieldErrors.vorname?.[0]}>
            <input
              type="text"
              value={vorname}
              onChange={e => handleNameChange(e.target.value, nachname)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Nachname *" error={fieldErrors.nachname?.[0]}>
            <input
              type="text"
              value={nachname}
              onChange={e => handleNameChange(vorname, e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Titel (optional)" error={fieldErrors.titel?.[0]}>
            <input
              type="text"
              value={titel ?? ''}
              onChange={e => setTitel(e.target.value)}
              className={inputCls}
              placeholder="Dipl.-Kfm., Dr., …"
            />
          </Field>
          <Field label="Slug *" error={fieldErrors.slug?.[0]} hint="/redaktion/<slug>">
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
              className={inputCls}
              required
            />
          </Field>
        </div>
        <Field label="Rolle *" error={fieldErrors.rolle?.[0]}>
          <input
            type="text"
            value={rolle}
            onChange={e => setRolle(e.target.value)}
            list="rolle-presets"
            className={inputCls}
            required
          />
          <datalist id="rolle-presets">
            {ROLLE_PRESETS.map(p => <option key={p} value={p} />)}
          </datalist>
        </Field>
      </fieldset>

      {/* Foto */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999999]">
          Foto
        </legend>
        <div className="flex items-center gap-4">
          {fotoUrl
            ? <PortraitCircle src={fotoUrl} alt="Aktuelles Portrait" className="h-24 w-24 border border-gray-200" />
            : <div className="h-24 w-24 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">kein Foto</div>
          }
          <div className="flex-1 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFotoUpload(file)
              }}
              disabled={!autorId || fotoUploading}
              className="text-sm"
            />
            <p className="text-xs text-[#666666]">
              {!autorId
                ? 'Foto-Upload nach erstem Speichern verfügbar.'
                : fotoUploading
                ? 'Foto wird verarbeitet (Crop 1:1 → WebP 600×600 ≤200 KB) …'
                : 'JPG/PNG/WebP, wird automatisch auf 1:1 + WebP 600×600 konvertiert.'
              }
            </p>
            {fotoError && <p className="text-xs text-red-600">{fotoError}</p>}
          </div>
        </div>
      </fieldset>

      {/* Bio */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999999]">
          Bio
        </legend>
        <Field label={`Kurz-Bio * (${kurzBioCount}/300)`} error={fieldErrors.kurz_bio?.[0]}
               hint="Wird im Schema.org/Person, in Author-Cards und im LinkedIn-Embed verwendet.">
          <textarea
            value={kurzBio}
            onChange={e => setKurzBio(e.target.value)}
            rows={3}
            className={`${inputCls} ${kurzBioStatus}`}
          />
        </Field>
        <Field label="Lang-Bio (Markdown) *" error={fieldErrors.lang_bio_md?.[0]}
               hint="Volltext der /redaktion/<slug>-Seite. Markdown wird gerendert.">
          <textarea
            value={langBio}
            onChange={e => setLangBio(e.target.value)}
            rows={12}
            className={inputCls}
          />
        </Field>
      </fieldset>

      {/* Expertise + Qualifikationen */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999999]">
          Expertise & Qualifikationen
        </legend>
        <Field label="Expertise" error={fieldErrors.expertise?.[0]}
               hint="Mehrfachauswahl. Treibt Schema.org/Person knowsAbout + Such-Filter.">
          <div className="flex flex-wrap gap-2">
            {EXPERTISE_OPTIONS.map(opt => {
              const active = expertise.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleExpertise(opt)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                    active
                      ? 'bg-[#1a365d] text-white border-[#1a365d]'
                      : 'bg-white text-[#666] border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Qualifikationen" error={fieldErrors.qualifikationen?.[0]}
               hint="Kommagetrennt, max. 20. Erscheinen als Schema.org EducationalOccupationalCredential.">
          <input
            type="text"
            value={qualifikationen}
            onChange={e => setQualifikationen(e.target.value)}
            placeholder="§ 34d GewO Versicherungsmakler, BKV-Experte, …"
            className={inputCls}
          />
        </Field>
      </fieldset>

      {/* Berufsrechtlich */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999999]">
          Berufsrechtlich (E-E-A-T-Pflicht)
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vermittlerregister-Nr" error={fieldErrors.vermittlerregister_nr?.[0]}>
            <input type="text" value={vermittlerregister ?? ''} onChange={e => setVermittlerregister(e.target.value)} className={inputCls} placeholder="D-F-155-HL9G-55" />
          </Field>
          <Field label="IHK-Kammer" error={fieldErrors.ihk_kammer?.[0]}>
            <input type="text" value={ihkKammer ?? ''} onChange={e => setIhkKammer(e.target.value)} className={inputCls} placeholder="IHK München …" />
          </Field>
          <Field label="§ 34d / § 34f" error={fieldErrors.paragraph_34d?.[0]}>
            <input type="text" value={paragraph34d ?? ''} onChange={e => setParagraph34d(e.target.value)} className={inputCls} placeholder="§ 34d Abs. 1 GewO Versicherungsmakler" />
          </Field>
          <Field label="Jahre Erfahrung" error={fieldErrors.jahre_erfahrung?.[0]}>
            <input type="number" min="0" max="80" value={jahreErfahrung} onChange={e => setJahreErfahrung(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </fieldset>

      {/* Kontakt */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999999]">
          Kontakt
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Field label="E-Mail" error={fieldErrors.email?.[0]}>
            <input type="email" value={email ?? ''} onChange={e => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Telefon" error={fieldErrors.telefon?.[0]}>
            <input type="tel" value={telefon ?? ''} onChange={e => setTelefon(e.target.value)} className={inputCls} />
          </Field>
          <Field label="LinkedIn URL" error={fieldErrors.linkedin_url?.[0]}>
            <input type="url" value={linkedin ?? ''} onChange={e => setLinkedin(e.target.value)} className={inputCls} placeholder="https://www.linkedin.com/in/…" />
          </Field>
          <Field label="Xing URL" error={fieldErrors.xing_url?.[0]}>
            <input type="url" value={xing ?? ''} onChange={e => setXing(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Website" error={fieldErrors.website_url?.[0]}>
            <input type="url" value={website ?? ''} onChange={e => setWebsite(e.target.value)} className={inputCls} placeholder="https://…" />
          </Field>
        </div>
      </fieldset>

      {/* Sichtbarkeit */}
      <fieldset className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <legend className="px-2 text-sm font-semibold uppercase tracking-wider text-[#999999]">
          Sichtbarkeit
        </legend>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
            className="mt-1"
          />
          <span>
            <strong>Öffentlich sichtbar</strong>
            <span className="block text-xs text-[#666]">
              Schaltet das Autoren-Profil unter <code>/redaktion/{slug}</code> live und macht den Eintrag als <code>standard_autor_id</code> auswählbar.
            </span>
          </span>
        </label>
      </fieldset>

      {/* Buttons */}
      <div className="flex items-center gap-3 sticky bottom-0 -mx-2 px-2 py-3 bg-gray-50/95 backdrop-blur border-t border-gray-200">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 disabled:opacity-60"
        >
          {isPending ? 'Wird gespeichert…' : autor ? 'Änderungen speichern' : 'Autor anlegen'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/redaktion')}
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
