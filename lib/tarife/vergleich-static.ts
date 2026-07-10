/**
 * Maps DB `tarife` rows (VergleichsRechner shape) to the static /vergleich table.
 * The comparison page must never render LLM-invented insurer rows from generierter_content.
 */
import type { AnbieterBesonderheiten, AnbieterTarif } from '@/lib/tarife/lookup'
import type { AnbieterOffer } from '@/components/sections/Vergleich'

function formatWartezeit(b: AnbieterBesonderheiten): string {
  const months = b.wartezeit_monate
  if (months === 0) return 'Keine'
  if (typeof months !== 'number') return '—'
  if (b.doppelte_unfall) {
    return `Keine bei Unfalltod, sonst ${months} Monate`
  }
  return `${months} Monate`
}

function formatGesundheitsfragen(b: AnbieterBesonderheiten): string {
  if (b.gp === true) return 'Ja'
  if (b.gp === false) return 'Nein'
  return '—'
}

/** No health check required → treated as guaranteed acceptance for table display. */
function formatGarantierteAufnahme(b: AnbieterBesonderheiten): boolean {
  return b.gp === false
}

function formatBeitrag(eur: number): string {
  const formatted = eur.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `ab ${formatted} €/Monat`
}

function formatBesonderheit(tarif: AnbieterTarif): string {
  const parts: string[] = []
  const b = tarif.besonderheiten

  if (b.doppelte_unfall) parts.push('Doppelte Summe bei Unfall')
  if (b.rueckholung) parts.push('Rückholung aus dem Ausland')
  if (b.lebenslang) parts.push('Lebenslang stabile Beiträge')
  if (b.kindermitvers) parts.push('Kindermitversicherung')

  if (parts.length > 0) return parts.join(', ')
  if (tarif.tarif_name) return tarif.tarif_name
  return '—'
}

export function mapTarifeToVergleichOffers(tarife: AnbieterTarif[]): AnbieterOffer[] {
  return tarife.map(t => ({
    name: t.anbieter_name,
    wartezeit: formatWartezeit(t.besonderheiten),
    gesundheitsfragen: formatGesundheitsfragen(t.besonderheiten),
    garantierte_aufnahme: formatGarantierteAufnahme(t.besonderheiten),
    beitrag_beispiel: formatBeitrag(t.beitrag_eur),
    besonderheit: formatBesonderheit(t),
  }))
}
