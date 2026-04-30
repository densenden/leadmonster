// Tests für lib/tarife/lookup.ts — fokussiert auf die deterministische Badge-
// Vergabe (assignBadges). Der DB-Pfad lookupVergleichTarife wird im API-Route-
// Test integriert geprüft.
import { describe, it, expect } from 'vitest'
import { assignBadges, type AnbieterTarif } from '../lookup'

function makeTarif(overrides: Partial<AnbieterTarif>): AnbieterTarif {
  return {
    anbieter_name: 'X',
    tarif_name: null,
    beitrag_eur: 30,
    besonderheiten: {},
    badges: [],
    ...overrides,
  }
}

describe('assignBadges', () => {
  it('vergibt guenstigster nur an die erste (sortierte) Zeile', () => {
    const tarife = [
      makeTarif({ anbieter_name: 'A', beitrag_eur: 19.8 }),
      makeTarif({ anbieter_name: 'B', beitrag_eur: 20.5 }),
      makeTarif({ anbieter_name: 'C', beitrag_eur: 22.9 }),
    ]
    const result = assignBadges(tarife)
    expect(result[0].badges).toContain('guenstigster')
    expect(result[1].badges).not.toContain('guenstigster')
    expect(result[2].badges).not.toContain('guenstigster')
  })

  it('schnellster_schutz: Anbieter mit minimaler wartezeit_monate (Tie-fähig)', () => {
    const tarife = [
      makeTarif({ anbieter_name: 'A', besonderheiten: { wartezeit_monate: 12 } }),
      makeTarif({ anbieter_name: 'B', besonderheiten: { wartezeit_monate: 0 } }),
      makeTarif({ anbieter_name: 'C', besonderheiten: { wartezeit_monate: 0 } }),
      makeTarif({ anbieter_name: 'D', besonderheiten: { wartezeit_monate: 36 } }),
    ]
    const result = assignBadges(tarife)
    expect(result.find(t => t.anbieter_name === 'A')!.badges).not.toContain('schnellster_schutz')
    expect(result.find(t => t.anbieter_name === 'B')!.badges).toContain('schnellster_schutz')
    expect(result.find(t => t.anbieter_name === 'C')!.badges).toContain('schnellster_schutz')
    expect(result.find(t => t.anbieter_name === 'D')!.badges).not.toContain('schnellster_schutz')
  })

  it('bester_schutz: maximaler Score aus rueckholung + doppelte_unfall + lebenslang', () => {
    const tarife = [
      // Score 3
      makeTarif({
        anbieter_name: 'Top',
        besonderheiten: { rueckholung: true, doppelte_unfall: true, lebenslang: true },
      }),
      // Score 2
      makeTarif({
        anbieter_name: 'Mittel',
        besonderheiten: { rueckholung: true, doppelte_unfall: true },
      }),
      // Score 0
      makeTarif({ anbieter_name: 'Basic', besonderheiten: {} }),
    ]
    const result = assignBadges(tarife)
    expect(result.find(t => t.anbieter_name === 'Top')!.badges).toContain('bester_schutz')
    expect(result.find(t => t.anbieter_name === 'Mittel')!.badges).not.toContain('bester_schutz')
    expect(result.find(t => t.anbieter_name === 'Basic')!.badges).not.toContain('bester_schutz')
  })

  it('keine bester_schutz-Badge wenn alle Anbieter Score 0 haben', () => {
    const tarife = [
      makeTarif({ anbieter_name: 'A', besonderheiten: {} }),
      makeTarif({ anbieter_name: 'B', besonderheiten: {} }),
    ]
    const result = assignBadges(tarife)
    expect(result.every(t => !t.badges.includes('bester_schutz'))).toBe(true)
  })

  it('keine schnellster_schutz-Badge wenn keine wartezeit_monate-Daten vorliegen', () => {
    const tarife = [
      makeTarif({ anbieter_name: 'A', besonderheiten: {} }),
      makeTarif({ anbieter_name: 'B', besonderheiten: {} }),
    ]
    const result = assignBadges(tarife)
    expect(result.every(t => !t.badges.includes('schnellster_schutz'))).toBe(true)
  })

  it('leerer Input → leerer Output', () => {
    expect(assignBadges([])).toEqual([])
  })

  it('Tie beim guenstigster wird NICHT geteilt (nur Index 0 erhält Badge)', () => {
    // Bewusst: zwei Anbieter mit gleichem niedrigsten Beitrag — nur die erste Zeile
    // bekommt das Badge. So bleibt die Einordnung eindeutig im UI.
    const tarife = [
      makeTarif({ anbieter_name: 'First', beitrag_eur: 19.8 }),
      makeTarif({ anbieter_name: 'Tied', beitrag_eur: 19.8 }),
    ]
    const result = assignBadges(tarife)
    expect(result[0].badges).toContain('guenstigster')
    expect(result[1].badges).not.toContain('guenstigster')
  })
})
