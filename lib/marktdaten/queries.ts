// Marktdaten-Queries auf der View `tarife_besonderheiten_aggregiert`.
// Liefert datengetriebene Listen für /marktdaten-Pages — Backlink-Magneten.
import { createAdminClient } from '@/lib/supabase/server'

export interface MarktdatenRow {
  produkt_slug: string
  produkt_name: string
  anbieter_name: string
  tarif_name: string | null
  beitrag_min: number
  beitrag_max: number
  wartezeit_min_monate: number | null
  zahlung_bis_alter: number | null
  doppelte_unfall: boolean
  rueckholung: boolean
  lebenslang: boolean
  gesundheitspruefung: boolean
}

interface RawAggRow {
  produkt_id: string
  anbieter_name: string
  tarif_name: string | null
  beitrag_min: number
  beitrag_max: number
  wartezeit_min_monate: number | null
  zahlung_bis_alter: number | null
  doppelte_unfall: boolean
  rueckholung: boolean
  lebenslang: boolean
  gesundheitspruefung: boolean
  produkte: { name: string; slug: string } | null
}

export interface MarktdatenThemaConfig {
  slug: string
  titel: string
  einleitung: string
  produktTypen: string[]
  filter: (row: MarktdatenRow) => boolean
  spalten: { label: string; render: (row: MarktdatenRow) => string }[]
  /** Sortierschlüssel — niedriger zuerst */
  sort?: (row: MarktdatenRow) => number
}

export const MARKTDATEN_THEMEN: MarktdatenThemaConfig[] = [
  {
    slug: 'sterbegeld-bis-95',
    titel: 'Sterbegeldversicherer mit Schutz bis 95 Jahre',
    einleitung:
      'Wer im hohen Alter noch Beiträge zahlt, will wissen: bis wann läuft mein '
      + 'Vertrag eigentlich? Diese Anbieter ermöglichen Beitragszahlung bis '
      + 'mindestens zum 95. Lebensjahr — relevant für die Generation 50+.',
    produktTypen: ['sterbegeld'],
    filter: row => (row.zahlung_bis_alter ?? 0) >= 95,
    spalten: [
      { label: 'Anbieter', render: r => r.anbieter_name },
      { label: 'Tarif', render: r => r.tarif_name ?? '—' },
      { label: 'Beitrag ab', render: r => `${r.beitrag_min.toFixed(2)} €` },
      { label: 'Zahlung bis Alter', render: r => `${r.zahlung_bis_alter ?? '—'}` },
    ],
    sort: r => r.beitrag_min,
  },
  {
    slug: 'sterbegeld-ohne-wartezeit',
    titel: 'Sterbegeld ohne Wartezeit — Sofortschutz-Anbieter',
    einleitung:
      'Bei den meisten Sterbegeldtarifen greift der volle Schutz erst nach '
      + '6 oder 12 Monaten Wartezeit. Diese Anbieter bieten Sofortschutz oder '
      + 'eine besonders kurze Wartezeit:',
    produktTypen: ['sterbegeld'],
    filter: row => (row.wartezeit_min_monate ?? 99) === 0,
    spalten: [
      { label: 'Anbieter', render: r => r.anbieter_name },
      { label: 'Tarif', render: r => r.tarif_name ?? '—' },
      { label: 'Wartezeit', render: () => 'Keine' },
      { label: 'Beitrag ab', render: r => `${r.beitrag_min.toFixed(2)} €` },
    ],
    sort: r => r.beitrag_min,
  },
  {
    slug: 'sterbegeld-doppelte-unfallleistung',
    titel: 'Sterbegeldtarife mit doppelter Auszahlung bei Unfalltod',
    einleitung:
      'Welche Anbieter zahlen bei einem tödlichen Unfall die doppelte '
      + 'Versicherungssumme aus? Wir haben den Markt durchforstet:',
    produktTypen: ['sterbegeld'],
    filter: row => row.doppelte_unfall,
    spalten: [
      { label: 'Anbieter', render: r => r.anbieter_name },
      { label: 'Tarif', render: r => r.tarif_name ?? '—' },
      { label: 'Doppelte Auszahlung', render: () => 'Ja' },
      { label: 'Beitrag ab', render: r => `${r.beitrag_min.toFixed(2)} €` },
    ],
    sort: r => r.beitrag_min,
  },
  {
    slug: 'sterbegeld-ohne-gesundheitspruefung',
    titel: 'Sterbegeld ohne Gesundheitsprüfung — garantierte Aufnahme',
    einleitung:
      'Bei diesen Anbietern werden keine Gesundheitsfragen gestellt — '
      + 'Aufnahme ist auch mit Vorerkrankungen garantiert.',
    produktTypen: ['sterbegeld'],
    filter: row => !row.gesundheitspruefung,
    spalten: [
      { label: 'Anbieter', render: r => r.anbieter_name },
      { label: 'Tarif', render: r => r.tarif_name ?? '—' },
      { label: 'Gesundheitsprüfung', render: () => 'Nein' },
      { label: 'Beitrag ab', render: r => `${r.beitrag_min.toFixed(2)} €` },
    ],
    sort: r => r.beitrag_min,
  },
]

export function findThema(slug: string): MarktdatenThemaConfig | null {
  return MARKTDATEN_THEMEN.find(t => t.slug === slug) ?? null
}

export async function loadMarktdatenForThema(thema: MarktdatenThemaConfig): Promise<MarktdatenRow[]> {
  const supabase = createAdminClient()
  const { data: produkte } = await supabase
    .from('produkte')
    .select('id, slug, name, typ')
    .in('typ', thema.produktTypen)
  const produktIds = (produkte ?? []).map(p => p.id)
  if (produktIds.length === 0) return []

  const { data } = await supabase
    .from('tarife_besonderheiten_aggregiert')
    .select('*, produkte:produkt_id(name, slug)')
    .in('produkt_id', produktIds)
  const rows = (data as unknown as RawAggRow[] | null) ?? []
  const mapped: MarktdatenRow[] = rows.map(r => ({
    produkt_slug: r.produkte?.slug ?? '',
    produkt_name: r.produkte?.name ?? '',
    anbieter_name: r.anbieter_name,
    tarif_name: r.tarif_name,
    beitrag_min: Number(r.beitrag_min),
    beitrag_max: Number(r.beitrag_max),
    wartezeit_min_monate: r.wartezeit_min_monate,
    zahlung_bis_alter: r.zahlung_bis_alter,
    doppelte_unfall: r.doppelte_unfall,
    rueckholung: r.rueckholung,
    lebenslang: r.lebenslang,
    gesundheitspruefung: r.gesundheitspruefung,
  }))
  const filtered = mapped.filter(thema.filter)
  if (thema.sort) filtered.sort((a, b) => thema.sort!(a) - thema.sort!(b))
  return filtered
}
