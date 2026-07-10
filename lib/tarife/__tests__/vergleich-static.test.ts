import { describe, it, expect } from 'vitest'
import { mapTarifeToVergleichOffers } from '@/lib/tarife/vergleich-static'
import type { AnbieterTarif } from '@/lib/tarife/lookup'

const SAMPLE: AnbieterTarif[] = [
  {
    anbieter_name: 'Allianz',
    tarif_name: 'Bestattungsschutzbrief',
    beitrag_eur: 19.8,
    besonderheiten: {
      wartezeit_monate: 12,
      gp: false,
      doppelte_unfall: true,
      rueckholung: true,
      lebenslang: true,
    },
    badges: ['guenstigster'],
  },
  {
    anbieter_name: 'DELA',
    tarif_name: 'sorgenfrei Leben',
    beitrag_eur: 17.14,
    besonderheiten: {
      wartezeit_monate: 0,
      gp: false,
      doppelte_unfall: true,
      rueckholung: true,
      lebenslang: true,
    },
    badges: [],
  },
]

describe('mapTarifeToVergleichOffers', () => {
  it('maps DB tarife to Vergleich table rows with formatted beitrag', () => {
    const rows = mapTarifeToVergleichOffers(SAMPLE)
    expect(rows[0]?.name).toBe('Allianz')
    expect(rows[0]?.beitrag_beispiel).toBe('ab 19,80 €/Monat')
    expect(rows[0]?.wartezeit).toBe('Keine bei Unfalltod, sonst 12 Monate')
    expect(rows[0]?.gesundheitsfragen).toBe('Nein')
    expect(rows[0]?.garantierte_aufnahme).toBe(true)
  })

  it('formats zero waiting period as Keine', () => {
    const rows = mapTarifeToVergleichOffers(SAMPLE)
    expect(rows[1]?.wartezeit).toBe('Keine')
  })
})
