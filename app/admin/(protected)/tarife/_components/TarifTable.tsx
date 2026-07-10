'use client'

/**
 * Inline-Edit-Tabelle für Anbietertarife (Excel-Stil).
 * Doppelklick auf Zelle → Input → Blur speichert via Server-Action.
 *
 * Spalten dynamisch:
 *   - Anbieter, Tarif, Alter-von, Alter-bis, Summe, Beitrag, Besonderheiten
 *   - + jede FilterAxis mit `source:'column'` (z. B. Berufsklasse)
 *   - + jede FilterAxis mit `source:'besonderheiten'` und show_as_column=true
 *     (zeigt den jsonb-Wert in einer extra Spalte)
 */
import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { FilterAxis } from '@/lib/tarife/filter-config-schema'
import { upsertTarif, deleteTarif } from '@/app/admin/tarife/actions'

export interface RawTarifRow {
  id: string
  produkt_id: string
  anbieter_name: string
  tarif_name: string | null
  alter_von: number
  alter_bis: number
  summe: number
  beitrag_low: number
  beitrag_high: number
  einheit: 'eur_summe' | 'eur_monat'
  berufsklasse: string | null
  besonderheiten: Record<string, unknown> | null
}

interface Props {
  produktId: string
  einheit: 'eur_summe' | 'eur_monat'
  tarife: RawTarifRow[]
  filterAxes: FilterAxis[]
  distinctAnbieter: string[]
}

const TH = 'px-3 py-2 text-left text-xs font-medium text-[#666] uppercase tracking-wider'
const TD = 'px-3 py-2 text-sm text-[#333] border-b border-gray-100'
const INPUT =
  'w-full border border-[#abd5f4] bg-white px-2 py-1 text-sm rounded-none focus:outline-none focus:ring-2 focus:ring-[#abd5f4]'

export function TarifTable({ produktId, einheit, tarife, filterAxes, distinctAnbieter }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>()
  const [filter, setFilter] = useState<{ anbieter: string; alter: string }>({
    anbieter: '',
    alter: '',
  })
  const [showNewRow, setShowNewRow] = useState(false)

  const columnAxes = useMemo(
    () => filterAxes.filter(a => a.source === 'column'),
    [filterAxes],
  )
  const besonderheitenAxes = useMemo(
    () => filterAxes.filter(a => a.source === 'besonderheiten' && a.show_as_column),
    [filterAxes],
  )

  const filtered = useMemo(() => {
    return tarife.filter(t => {
      if (filter.anbieter && t.anbieter_name !== filter.anbieter) return false
      if (filter.alter) {
        const a = parseInt(filter.alter, 10)
        if (!Number.isNaN(a) && (a < t.alter_von || a > t.alter_bis)) return false
      }
      return true
    })
  }, [tarife, filter])

  async function saveRow(updated: Partial<RawTarifRow> & { id: string }) {
    setError(undefined)
    const existing = tarife.find(t => t.id === updated.id)
    if (!existing) return
    const merged = { ...existing, ...updated, produkt_id: produktId }

    startTransition(async () => {
      const result = await upsertTarif({
        ...merged,
        besonderheiten: merged.besonderheiten ?? {},
      })
      if (!result.success) {
        const msg = result.error ?? Object.values(result.fieldErrors ?? {}).flat().join(' · ')
        setError(msg || 'Fehler beim Speichern')
      } else {
        router.refresh()
      }
    })
  }

  async function deleteRow(id: string) {
    if (!confirm('Diese Zeile wirklich löschen?')) return
    startTransition(async () => {
      const result = await deleteTarif(id)
      if (!result.success) {
        setError(result.error ?? 'Fehler beim Löschen')
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-[#666]">Anbieter-Filter</label>
          <select
            value={filter.anbieter}
            onChange={e => setFilter(f => ({ ...f, anbieter: e.target.value }))}
            className="border border-gray-300 bg-white px-2 py-1 text-sm rounded-none"
          >
            <option value="">Alle</option>
            {distinctAnbieter.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#666]">Alter (Brackets, die enthalten)</label>
          <input
            type="number"
            value={filter.alter}
            onChange={e => setFilter(f => ({ ...f, alter: e.target.value }))}
            placeholder="z.B. 65"
            className="border border-gray-300 bg-white px-2 py-1 text-sm rounded-none"
          />
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setShowNewRow(true)}
            className="bg-[#1a365d] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 rounded-none"
          >
            + Neue Zeile
          </button>
        </div>
      </div>

      <div className="overflow-auto border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className={TH}>Anbieter</th>
              <th className={TH}>Tarif</th>
              <th className={TH}>Alter v</th>
              <th className={TH}>Alter b</th>
              <th className={TH}>Summe</th>
              {columnAxes.map(a => (
                <th key={a.key} className={TH}>
                  {a.label}
                </th>
              ))}
              <th className={TH}>Beitrag €/Mo</th>
              {besonderheitenAxes.map(a => (
                <th key={a.key} className={TH}>
                  {a.key === 'wartezeit_monate' ? 'Wartezeit' : a.label}
                </th>
              ))}
              <th className={TH}>Besonderheiten</th>
              <th className={TH + ' text-right'}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {showNewRow && (
              <NewTarifRow
                produktId={produktId}
                einheit={einheit}
                columnAxes={columnAxes}
                onCancel={() => setShowNewRow(false)}
                onSaved={() => {
                  setShowNewRow(false)
                  router.refresh()
                }}
                onError={setError}
              />
            )}
            {filtered.length === 0 && !showNewRow ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#999]">
                  Keine Tarife für die aktuelle Filter-Auswahl.
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <TarifRow
                  key={t.id}
                  row={t}
                  columnAxes={columnAxes}
                  besonderheitenAxes={besonderheitenAxes}
                  isPending={isPending}
                  onSave={saveRow}
                  onDelete={deleteRow}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TarifRow — Inline-editable
// ---------------------------------------------------------------------------

function TarifRow({
  row,
  columnAxes,
  besonderheitenAxes,
  isPending,
  onSave,
  onDelete,
}: {
  row: RawTarifRow
  columnAxes: FilterAxis[]
  besonderheitenAxes: FilterAxis[]
  isPending: boolean
  onSave: (updated: Partial<RawTarifRow> & { id: string }) => void
  onDelete: (id: string) => void
}) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')

  function startEdit(field: string, current: string) {
    setEditingField(field)
    setDraftValue(current)
  }

  function commit() {
    if (editingField === null) return
    const field = editingField
    setEditingField(null)
    const value = draftValue.trim()

    switch (field) {
      case 'anbieter_name':
        if (value && value !== row.anbieter_name) {
          onSave({ id: row.id, anbieter_name: value })
        }
        break
      case 'tarif_name':
        onSave({ id: row.id, tarif_name: value || null })
        break
      case 'alter_von':
      case 'alter_bis':
      case 'summe': {
        const v = parseInt(value, 10)
        if (!Number.isNaN(v) && v !== (row[field as 'alter_von' | 'alter_bis' | 'summe'])) {
          onSave({ id: row.id, [field]: v } as Partial<RawTarifRow> & { id: string })
        }
        break
      }
      case 'beitrag_low': {
        const v = parseFloat(value.replace(',', '.'))
        if (!Number.isNaN(v) && v !== row.beitrag_low) {
          onSave({ id: row.id, beitrag_low: v, beitrag_high: v })
        }
        break
      }
      case 'berufsklasse':
        onSave({ id: row.id, berufsklasse: value || null })
        break
      default:
        // besonderheiten-Feld
        if (field.startsWith('besonderheiten.')) {
          const key = field.slice('besonderheiten.'.length)
          const parsed = parseBesonderheitValue(value)
          const next = { ...(row.besonderheiten ?? {}), [key]: parsed }
          onSave({ id: row.id, besonderheiten: next })
        }
    }
  }

  function renderEditable(field: string, currentDisplay: string, currentRaw: string) {
    if (editingField === field) {
      return (
        <input
          autoFocus
          value={draftValue}
          onChange={e => setDraftValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              ;(e.target as HTMLInputElement).blur()
            } else if (e.key === 'Escape') {
              setEditingField(null)
            }
          }}
          className={INPUT}
        />
      )
    }
    return (
      <button
        type="button"
        onClick={() => startEdit(field, currentRaw)}
        onDoubleClick={() => startEdit(field, currentRaw)}
        className="w-full text-left hover:bg-gray-50 px-1 py-0.5 -mx-1 -my-0.5 cursor-text"
        title="Klicken zum Bearbeiten"
        disabled={isPending}
      >
        {currentDisplay || <span className="text-[#bbb]">—</span>}
      </button>
    )
  }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50/50">
      <td className={TD}>{renderEditable('anbieter_name', row.anbieter_name, row.anbieter_name)}</td>
      <td className={TD}>{renderEditable('tarif_name', row.tarif_name ?? '', row.tarif_name ?? '')}</td>
      <td className={TD}>{renderEditable('alter_von', String(row.alter_von), String(row.alter_von))}</td>
      <td className={TD}>{renderEditable('alter_bis', String(row.alter_bis), String(row.alter_bis))}</td>
      <td className={TD}>
        {renderEditable('summe', row.summe.toLocaleString('de-DE'), String(row.summe))}
      </td>
      {columnAxes.map(a => {
        const v = (row as unknown as Record<string, unknown>)[a.key]
        const display = v === null || v === undefined ? '' : String(v)
        return (
          <td key={a.key} className={TD}>
            {renderEditable(a.key, display, display)}
          </td>
        )
      })}
      <td className={TD + ' font-mono text-right'}>
        {renderEditable(
          'beitrag_low',
          row.beitrag_low.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €',
          row.beitrag_low.toString(),
        )}
      </td>
      {besonderheitenAxes.map(a => {
        const v = (row.besonderheiten ?? {})[a.key]
        const display = v === null || v === undefined ? '' : String(v)
        return (
          <td key={a.key} className={TD}>
            {renderEditable(`besonderheiten.${a.key}`, display, display)}
          </td>
        )
      })}
      <td className={TD + ' max-w-[260px]'}>
        <BesonderheitenSummary besonderheiten={row.besonderheiten} />
      </td>
      <td className={TD + ' text-right'}>
        <button
          type="button"
          onClick={() => onDelete(row.id)}
          className="text-xs text-gray-400 hover:text-red-600"
          disabled={isPending}
          aria-label="Zeile löschen"
        >
          Löschen
        </button>
      </td>
    </tr>
  )
}

function parseBesonderheitValue(raw: string): unknown {
  if (raw === '' || raw.toLowerCase() === 'null') return null
  if (raw.toLowerCase() === 'true') return true
  if (raw.toLowerCase() === 'false') return false
  const num = Number(raw)
  if (!Number.isNaN(num) && raw.trim() !== '') return num
  return raw
}

function BesonderheitenSummary({
  besonderheiten,
}: {
  besonderheiten: Record<string, unknown> | null
}) {
  if (!besonderheiten || Object.keys(besonderheiten).length === 0) {
    return <span className="text-xs text-[#bbb]">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1 text-[10px] font-mono">
      {Object.entries(besonderheiten).map(([k, v]) => (
        <span key={k} className="bg-gray-100 px-1.5 py-0.5">
          {k}: {String(v)}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NewTarifRow — Quick-Anlage am Tabellenkopf
// ---------------------------------------------------------------------------

function NewTarifRow({
  produktId,
  einheit,
  columnAxes,
  onCancel,
  onSaved,
  onError,
}: {
  produktId: string
  einheit: 'eur_summe' | 'eur_monat'
  columnAxes: FilterAxis[]
  onCancel: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [draft, setDraft] = useState({
    anbieter_name: '',
    tarif_name: '',
    alter_von: 65,
    alter_bis: 65,
    summe: 0,
    beitrag: 0,
    berufsklasse: '',
  })
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const payload = {
        produkt_id: produktId,
        anbieter_name: draft.anbieter_name.trim(),
        tarif_name: draft.tarif_name.trim() || null,
        alter_von: draft.alter_von,
        alter_bis: draft.alter_bis,
        summe: draft.summe,
        beitrag_low: draft.beitrag,
        beitrag_high: draft.beitrag,
        einheit,
        berufsklasse: draft.berufsklasse.trim() || null,
        besonderheiten: {},
      }
      const result = await upsertTarif(payload)
      if (!result.success) {
        const msg =
          result.error ?? Object.values(result.fieldErrors ?? {}).flat().join(' · ')
        onError(msg || 'Fehler beim Anlegen')
      } else {
        onSaved()
      }
    })
  }

  return (
    <tr className="bg-yellow-50/40 border-t border-yellow-200">
      <td className={TD}>
        <input
          value={draft.anbieter_name}
          onChange={e => setDraft(d => ({ ...d, anbieter_name: e.target.value }))}
          placeholder="Anbieter"
          className={INPUT}
        />
      </td>
      <td className={TD}>
        <input
          value={draft.tarif_name}
          onChange={e => setDraft(d => ({ ...d, tarif_name: e.target.value }))}
          placeholder="Tarifname"
          className={INPUT}
        />
      </td>
      <td className={TD}>
        <input
          type="number"
          value={draft.alter_von}
          onChange={e => setDraft(d => ({ ...d, alter_von: parseInt(e.target.value, 10) || 0 }))}
          className={INPUT}
        />
      </td>
      <td className={TD}>
        <input
          type="number"
          value={draft.alter_bis}
          onChange={e => setDraft(d => ({ ...d, alter_bis: parseInt(e.target.value, 10) || 0 }))}
          className={INPUT}
        />
      </td>
      <td className={TD}>
        <input
          type="number"
          value={draft.summe}
          onChange={e => setDraft(d => ({ ...d, summe: parseInt(e.target.value, 10) || 0 }))}
          className={INPUT}
        />
      </td>
      {columnAxes.map(a => (
        <td key={a.key} className={TD}>
          {a.key === 'berufsklasse' ? (
            <select
              value={draft.berufsklasse}
              onChange={e => setDraft(d => ({ ...d, berufsklasse: e.target.value }))}
              className={INPUT}
            >
              <option value="">—</option>
              {a.options.map(o => (
                <option key={String(o.value)} value={o.value === null ? '' : String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input className={INPUT} disabled />
          )}
        </td>
      ))}
      <td className={TD}>
        <input
          type="number"
          step="0.01"
          value={draft.beitrag}
          onChange={e => setDraft(d => ({ ...d, beitrag: parseFloat(e.target.value) || 0 }))}
          className={INPUT}
        />
      </td>
      <td className={TD} colSpan={2}>
        <span className="text-xs text-[#999]">
          Besonderheiten nach Anlage editierbar.
        </span>
      </td>
      <td className={TD + ' text-right whitespace-nowrap'}>
        <button
          type="button"
          onClick={save}
          disabled={isPending || !draft.anbieter_name || draft.summe <= 0 || draft.beitrag <= 0}
          className="bg-[#1a365d] text-white px-2 py-1 text-xs disabled:opacity-50"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="ml-2 text-xs text-gray-400 hover:text-red-600"
        >
          Abbrechen
        </button>
      </td>
    </tr>
  )
}
