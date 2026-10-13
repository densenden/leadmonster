/**
 * Human-readable Details for Admin → Bot-Versuche table.
 * Reads the quarantine payload (signals, dwell, placement, …).
 */
import type { Json } from '@/lib/supabase/types'

const SIGNAL_LABEL: Record<string, string> = {
  born_after_1990: 'Geburtsjahr nach 1990',
  vergleich_defaults_unchanged: 'VergleichsRechner-Defaults unverändert',
}

function asRecord(payload: Json | null | undefined): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {}
  return payload as Record<string, unknown>
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s || null
}

/** Short multi-line summary for the Details column. */
export function formatBotAttemptDetails(payload: Json | null | undefined): string[] {
  const p = asRecord(payload)
  const lines: string[] = []

  const signals = p.signals
  if (Array.isArray(signals)) {
    for (const hit of signals) {
      if (!hit || typeof hit !== 'object') continue
      const code = str((hit as { code?: unknown }).code)
      if (!code) continue
      lines.push(SIGNAL_LABEL[code] ?? code)
    }
  }

  const captchaCode = str(p.captchaCode)
  if (captchaCode) lines.push(`Captcha: ${captchaCode}`)

  const sessionCode = str(p.sessionCode)
  if (sessionCode) lines.push(`Sitzung: ${sessionCode}`)

  const dwellMs = p.dwellMs
  if (typeof dwellMs === 'number' && Number.isFinite(dwellMs)) {
    lines.push(`Dwell: ${Math.round(dwellMs)} ms`)
  }

  const geburtsdatum = str(p.geburtsdatum)
  if (geburtsdatum) lines.push(`Geburtsdatum: ${geburtsdatum}`)

  const summe = p.sterbegeldSumme
  if (typeof summe === 'number' && Number.isFinite(summe)) {
    lines.push(`Summe: ${summe.toLocaleString('de-DE')} €`)
  }

  const wart = p.akzeptierteWartezeitMonate
  if (typeof wart === 'number' && Number.isFinite(wart)) {
    lines.push(`Wartezeit: ${wart === 0 ? 'Egal/0' : `${wart} Monate`}`)
  }

  const placement = str(p.formPlacement)
  if (placement) lines.push(`Platzierung: ${placement}`)

  const interesse = str(p.interesse)
  if (interesse) {
    const short = interesse.length > 90 ? `${interesse.slice(0, 87)}…` : interesse
    lines.push(short)
  }

  return lines.length > 0 ? lines : ['—']
}
