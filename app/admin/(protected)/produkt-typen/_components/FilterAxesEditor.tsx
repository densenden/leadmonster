'use client'

/**
 * FilterAxesEditor — verwaltet die `filter_axes`-Liste für eine Versicherungsart.
 *
 * Pro Achse: key, label, source (besonderheiten/column), type (max/min/exact),
 * Optionen (value+label-Liste), default_value, show_as_column, lead_field.
 *
 * Wertbasiertes Modell:
 *   - Optionen werden als JSON-Array verwaltet — Werte können string oder
 *     number oder null sein (null = Egal-Option).
 *   - Im Editor erfasst der Admin Werte als Strings; beim Save versucht der
 *     Editor numerische Werte zu parsen ("12" → 12, "Egal" → null wenn label
 *     "Egal", sonst string).
 */
import { useState } from 'react'
import type { FilterAxisInput } from '@/lib/validation/produkt-typen'
import type { FilterAxisOption, FilterAxisValue } from '@/lib/tarife/filter-config-schema'

interface Props {
  axes: FilterAxisInput[]
  onChange: (axes: FilterAxisInput[]) => void
}

const INPUT = 'w-full border border-gray-300 bg-white px-2 py-1 text-sm rounded-none focus:border-[#abd5f4] focus:outline-none'
const LABEL = 'mb-1 block text-xs font-medium text-[#666]'

export function FilterAxesEditor({ axes, onChange }: Props) {
  function addAxis() {
    const newAxis: FilterAxisInput = {
      key: 'wartezeit_monate',
      label: 'Akzeptable Wartezeit',
      source: 'besonderheiten',
      type: 'enum_max',
      options: [
        { value: null, label: 'Egal' },
        { value: 12, label: 'bis 12 Monate' },
      ],
      default_value: null,
      show_as_column: true,
      lead_field: '',
    }
    onChange([...axes, newAxis])
  }

  function updateAxis(idx: number, patch: Partial<FilterAxisInput>) {
    onChange(axes.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  }

  function removeAxis(idx: number) {
    onChange(axes.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      {axes.length === 0 && (
        <p className="text-sm text-[#999]">Keine Filter-Achse konfiguriert.</p>
      )}
      {axes.map((a, idx) => (
        <AxisCard
          key={idx}
          axis={a}
          onPatch={patch => updateAxis(idx, patch)}
          onRemove={() => removeAxis(idx)}
        />
      ))}
      <button
        type="button"
        onClick={addAxis}
        className="border border-dashed border-gray-300 px-4 py-2 text-sm text-[#1a365d] hover:bg-gray-50"
      >
        + Filter-Achse hinzufügen
      </button>
    </div>
  )
}

function AxisCard({
  axis,
  onPatch,
  onRemove,
}: {
  axis: FilterAxisInput
  onPatch: (patch: Partial<FilterAxisInput>) => void
  onRemove: () => void
}) {
  return (
    <div className="border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-[#333]">{axis.label || '(neue Achse)'}</div>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-gray-400 hover:text-red-600"
        >
          Achse entfernen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Key (Datenfeld)</label>
          <input
            value={axis.key}
            onChange={e => onPatch({ key: e.target.value })}
            placeholder="z.B. wartezeit_monate"
            className={`${INPUT} font-mono`}
          />
        </div>
        <div>
          <label className={LABEL}>Label (UI)</label>
          <input
            value={axis.label}
            onChange={e => onPatch({ label: e.target.value })}
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Quelle</label>
          <select
            value={axis.source}
            onChange={e => onPatch({ source: e.target.value as 'besonderheiten' | 'column' })}
            className={INPUT}
          >
            <option value="besonderheiten">besonderheiten (jsonb)</option>
            <option value="column">column (eigene Spalte)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Filter-Typ</label>
          <select
            value={axis.type}
            onChange={e =>
              onPatch({ type: e.target.value as 'enum_max' | 'enum_min' | 'enum_exact' })
            }
            className={INPUT}
          >
            <option value="enum_max">max (≤)</option>
            <option value="enum_min">min (≥)</option>
            <option value="enum_exact">exact (=)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Lead-Feld</label>
          <input
            value={axis.lead_field ?? ''}
            onChange={e =>
              onPatch({ lead_field: e.target.value.trim() || undefined })
            }
            placeholder="leads-Spalte"
            className={`${INPUT} font-mono`}
          />
        </div>
      </div>

      <OptionsEditor
        options={axis.options}
        onChange={options => onPatch({ options })}
      />

      <label className="flex items-center gap-2 text-xs text-[#666]">
        <input
          type="checkbox"
          checked={axis.show_as_column}
          onChange={e => onPatch({ show_as_column: e.target.checked })}
          className="h-3.5 w-3.5"
        />
        Auch als Spalte in der Tabelle anzeigen
      </label>
    </div>
  )
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: FilterAxisOption[]
  onChange: (opts: FilterAxisOption[]) => void
}) {
  const [valueInput, setValueInput] = useState('')
  const [labelInput, setLabelInput] = useState('')

  function parseValue(raw: string): FilterAxisValue {
    if (raw.trim() === '' || raw.trim().toLowerCase() === 'null') return null
    const num = Number(raw)
    if (!Number.isNaN(num) && raw.trim() !== '') return num
    return raw.trim()
  }

  function add() {
    if (!labelInput.trim()) return
    const v = parseValue(valueInput)
    onChange([...options, { value: v, label: labelInput.trim() }])
    setValueInput('')
    setLabelInput('')
  }

  function remove(idx: number) {
    onChange(options.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <label className={LABEL}>Optionen</label>
      <div className="space-y-1.5 mb-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <code className="bg-white px-2 py-0.5 text-xs text-[#666] border border-gray-200 min-w-[80px]">
              {o.value === null ? 'null' : String(o.value)}
            </code>
            <span className="flex-1 text-[#333]">{o.label}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-600 text-xs"
              aria-label={`Option ${i + 1} entfernen`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={valueInput}
          onChange={e => setValueInput(e.target.value)}
          placeholder='Wert (z.B. 12 oder "A" oder leer für null)'
          className={`${INPUT} font-mono flex-1`}
        />
        <input
          value={labelInput}
          onChange={e => setLabelInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Label"
          className={`${INPUT} flex-1`}
        />
        <button
          type="button"
          onClick={add}
          className="border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 whitespace-nowrap"
        >
          + Option
        </button>
      </div>
    </div>
  )
}
