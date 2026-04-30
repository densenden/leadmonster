'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ScrapedData {
  hero_headline: string | null
  hero_subline: string | null
  features: string[]
  faq: Array<{ frage: string; antwort: string }>
  pricing: string[]
  insurers: string[]
  raw_text_snippets: string[]
}

interface ScrapeStats {
  html_kb: number
  features: number
  faq: number
  pricing: number
  insurers: number
  snippets: number
}

interface Article {
  kategorie: string
  thema: string
  inhalt: string
  tags: string[]
}

interface ScrapeResult {
  preview?: ScrapedData
  stats?: ScrapeStats
  articles?: Article[]
  saved?: { thema: string; ok: boolean; error?: string }[]
  error?: string
  message?: string
  details?: Record<string, string[]>
}

const KATEGORIE_OPTIONS = [
  { value: 'sterbegeld', label: 'Sterbegeld' },
  { value: 'pflege', label: 'Pflege' },
  { value: 'leben', label: 'Lebensversicherung' },
  { value: 'unfall', label: 'Unfallversicherung' },
  { value: 'allgemein', label: 'Allgemein' },
  { value: 'krankenzusatz', label: 'Krankenzusatz' },
  { value: 'bav', label: 'Betriebliche Altersvorsorge' },
]

// Auto-prepend https:// if user typed bare domain.
function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

export default function ScraperPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [kategorie, setKategorie] = useState('sterbegeld')
  const [themaPrefix, setThemaPrefix] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // Auto-fill thema prefix from URL
  function handleUrlChange(val: string) {
    setUrl(val)
    if (!themaPrefix) {
      try {
        const hostname = new URL(val).hostname.replace(/^www\./, '')
        setThemaPrefix('scraped_' + slugify(hostname))
      } catch { /* not a valid URL yet */ }
    }
  }

  async function handlePreview() {
    if (!url || !themaPrefix) return
    setLoading(true)
    setResult(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ensureProtocol(url), kategorie, thema_prefix: themaPrefix, save: false }),
      })
      const data: ScrapeResult = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Netzwerkfehler beim Abrufen der Seite.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!url || !themaPrefix || !result?.articles) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ensureProtocol(url), kategorie, thema_prefix: themaPrefix, save: true }),
      })
      const data: ScrapeResult = await res.json()
      setResult(prev => ({ ...prev, saved: data.saved }))
      setSaved(true)
      router.refresh()
    } catch {
      setResult(prev => ({ ...prev, error: 'Fehler beim Speichern.' }))
    } finally {
      setSaving(false)
    }
  }

  const stats = result?.stats
  const preview = result?.preview

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1a365d] font-heading">Website scrapen</h1>
        <p className="mt-1 text-gray-500 text-sm">
          Extrahiert Inhalte von einer Konkurrenz- oder Referenzseite und speichert sie im Wissensfundus.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 mb-8">
        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="url">
            Ziel-URL
          </label>
          <input
            id="url"
            type="url"
            placeholder="https://www.beispiel-versicherer.de/"
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]"
          />
        </div>

        {/* Kategorie + Thema Prefix — side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="kategorie">
              Kategorie (Wissensfundus)
            </label>
            <select
              id="kategorie"
              value={kategorie}
              onChange={e => setKategorie(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]"
            >
              {KATEGORIE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prefix">
              Thema-Prefix
              <span className="ml-1 text-gray-400 font-normal">(nur a–z, 0–9, _)</span>
            </label>
            <input
              id="prefix"
              type="text"
              placeholder="scraped_anbieter_name"
              value={themaPrefix}
              onChange={e => setThemaPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]"
            />
            <p className="mt-1 text-xs text-gray-400">
              Erzeugt: {themaPrefix || '…'}_hero, _features, _faq, _inhalt
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handlePreview}
            disabled={loading || !url || !themaPrefix}
            className="px-4 py-2 rounded-lg bg-[#1a365d] text-white text-sm font-medium hover:bg-[#1a365d]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Seite wird geladen…' : 'Vorschau laden'}
          </button>

          {result?.articles && !result.error && (
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {saved ? '✓ Gespeichert' : saving ? 'Speichern…' : 'Im Wissensfundus speichern'}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          <p><strong>Fehler:</strong> {result.message ?? result.error}</p>
          {result.details && (
            <ul className="mt-2 list-disc list-inside space-y-0.5">
              {Object.entries(result.details).map(([field, msgs]) => (
                <li key={field}>
                  <code className="font-mono">{field}</code>: {Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'HTML', value: `${stats.html_kb} KB` },
            { label: 'Features', value: stats.features },
            { label: 'FAQs', value: stats.faq },
            { label: 'Preise', value: stats.pricing },
            { label: 'Snippets', value: stats.snippets },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-center">
              <div className="text-xl font-bold text-[#1a365d]">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Save results */}
      {result?.saved && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Gespeicherte Artikel</h2>
          <ul className="space-y-1">
            {result.saved.map(r => (
              <li key={r.thema} className="flex items-center gap-2 text-sm">
                <span>{r.ok ? '✓' : '✗'}</span>
                <span className={`font-mono ${r.ok ? 'text-green-700' : 'text-red-600'}`}>{r.thema}</span>
                {r.error && <span className="text-red-500 text-xs">{r.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview sections */}
      {preview && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Extrahierter Inhalt</h2>

          {/* Hero */}
          <PreviewSection
            title="Hero"
            count={preview.hero_headline ? 1 : 0}
            expanded={expandedSection === 'hero'}
            onToggle={() => setExpandedSection(expandedSection === 'hero' ? null : 'hero')}
          >
            <p className="font-semibold">{preview.hero_headline ?? '—'}</p>
            {preview.hero_subline && <p className="text-gray-500 text-sm mt-1">{preview.hero_subline}</p>}
          </PreviewSection>

          {/* Features */}
          <PreviewSection
            title="Features / Vorteile"
            count={preview.features.length}
            expanded={expandedSection === 'features'}
            onToggle={() => setExpandedSection(expandedSection === 'features' ? null : 'features')}
          >
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {preview.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </PreviewSection>

          {/* FAQ */}
          <PreviewSection
            title="FAQ"
            count={preview.faq.length}
            expanded={expandedSection === 'faq'}
            onToggle={() => setExpandedSection(expandedSection === 'faq' ? null : 'faq')}
          >
            <div className="space-y-3">
              {preview.faq.map((f, i) => (
                <div key={i}>
                  <p className="font-medium text-sm">{f.frage}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{f.antwort}</p>
                </div>
              ))}
            </div>
          </PreviewSection>

          {/* Versicherer */}
          {preview.insurers.length > 0 && (
            <PreviewSection
              title="Versicherer erkannt"
              count={preview.insurers.length}
              expanded={expandedSection === 'insurers'}
              onToggle={() => setExpandedSection(expandedSection === 'insurers' ? null : 'insurers')}
            >
              <div className="flex flex-wrap gap-2">
                {preview.insurers.map(ins => (
                  <span key={ins} className="px-2 py-0.5 bg-[#1a365d]/10 text-[#1a365d] rounded text-xs font-medium">{ins}</span>
                ))}
              </div>
            </PreviewSection>
          )}

          {/* Text snippets */}
          <PreviewSection
            title="Textauszüge"
            count={preview.raw_text_snippets.length}
            expanded={expandedSection === 'snippets'}
            onToggle={() => setExpandedSection(expandedSection === 'snippets' ? null : 'snippets')}
          >
            <div className="space-y-3">
              {preview.raw_text_snippets.map((s, i) => (
                <p key={i} className="text-sm text-gray-600 border-l-2 border-gray-200 pl-3">{s}</p>
              ))}
            </div>
          </PreviewSection>
        </div>
      )}
    </div>
  )
}

// ── Sub-component: collapsible preview section ─────────────────────────────

function PreviewSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-sm text-gray-800">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{count} Einträge</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-5 py-4 border-t border-gray-100">{children}</div>
      )}
    </div>
  )
}
