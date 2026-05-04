'use client'

/**
 * BrandLookEditor — drei Textareas für palette, lighting, motifs.
 * Wird im OpenAI-Hero-Prompt für jedes generierte Bild verwendet.
 */
interface BrandLook {
  palette: string
  lighting: string
  motifs: string
}

interface Props {
  value: BrandLook | null
  onChange: (v: BrandLook | null) => void
}

const TEXTAREA =
  'w-full border border-gray-300 bg-white px-2 py-1 text-sm text-[#333333] focus:border-[#abd5f4] focus:outline-none focus:ring-2 focus:ring-[#abd5f4] rounded-none'
const LABEL = 'mb-1 block text-xs font-medium text-[#666]'

export function BrandLookEditor({ value, onChange }: Props) {
  const v: BrandLook = value ?? { palette: '', lighting: '', motifs: '' }

  function patch(p: Partial<BrandLook>) {
    const next = { ...v, ...p }
    if (!next.palette && !next.lighting && !next.motifs) {
      onChange(null)
    } else {
      onChange(next)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#999]">
        Brand-Look des Hero-Bilds — wird in jedem KI-Bild dieser Versicherungsart
        verwendet (englisch, prägnant).
      </p>
      <div>
        <label className={LABEL}>Farb-Palette</label>
        <textarea
          value={v.palette}
          onChange={e => patch({ palette: e.target.value })}
          rows={2}
          placeholder="z.B. soft sage green, warm cream, dusty beige"
          className={TEXTAREA}
        />
      </div>
      <div>
        <label className={LABEL}>Lichtstimmung</label>
        <textarea
          value={v.lighting}
          onChange={e => patch({ lighting: e.target.value })}
          rows={2}
          placeholder="z.B. late golden afternoon light filtering through windows"
          className={TEXTAREA}
        />
      </div>
      <div>
        <label className={LABEL}>Motive (Symbolik)</label>
        <textarea
          value={v.motifs}
          onChange={e => patch({ motifs: e.target.value })}
          rows={3}
          placeholder="z.B. open hands resting on letters, a single candle, family photo frames seen from behind"
          className={TEXTAREA}
        />
      </div>
    </div>
  )
}
