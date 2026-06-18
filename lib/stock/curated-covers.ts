/**
 * Curated Unsplash cover photos per ratgeber slug — no API key required.
 * Used when DB cover is missing or reuses the product hero image.
 */
import { buildUnsplashCdnUrl } from './unsplash'
import type { StockPhotoMeta } from './types'

export interface CuratedCover {
  photoId: string
  alt: string
  photographer: string
  photographer_url: string
  photo_page_url: string
}

/** One unique editorial photo per ratgeber slug (blog cards + article hero). */
export const CURATED_COVERS: Record<string, CuratedCover> = {
  'was-ist-sterbegeld': {
    photoId: 'photo-1507003211169-0a1dd7228f2d',
    alt: 'Seniorenpaar — ruhige Vorsorgeplanung',
    photographer: 'Jared Rice',
    photographer_url: 'https://unsplash.com/@jaredrice',
    photo_page_url: 'https://unsplash.com/photos/0a1dd7228f2d',
  },
  'fuer-wen': {
    photoId: 'photo-1488521787991-ed7bbaae773c',
    alt: 'Drei Generationen im Gartenlicht',
    photographer: 'Daiga Ellaby',
    photographer_url: 'https://unsplash.com/@daiga_ellaby',
    photo_page_url: 'https://unsplash.com/photos/ed7bbaae773c',
  },
  'kosten-leistungen': {
    photoId: 'photo-1450101499163-c8848c66ca85',
    alt: 'Dokumente und Stift auf dem Schreibtisch',
    photographer: 'Scott Graham',
    photographer_url: 'https://unsplash.com/@homajob',
    photo_page_url: 'https://unsplash.com/photos/c8848c66ca85',
  },
  'warum-sinnvoll': {
    photoId: 'photo-1493663284031-b7e3aefcae8e',
    alt: 'Gemütliches Wohnzimmer mit Fotoalbum',
    photographer: 'Daiga Ellaby',
    photographer_url: 'https://unsplash.com/@daiga_ellaby',
    photo_page_url: 'https://unsplash.com/photos/b7e3aefcae8e',
  },
  anbietervergleich: {
    photoId: 'photo-1554224155-6726b3ff858f',
    alt: 'Schreibtisch mit Taschenrechner und Unterlagen',
    photographer: 'Kelly Sikkema',
    photographer_url: 'https://unsplash.com/@kellysikkema',
    photo_page_url: 'https://unsplash.com/photos/6726b3ff858f',
  },
  'sterbegeld-mit-vorerkrankungen': {
    photoId: 'photo-1551836022-d5d88e9218df',
    alt: 'Seniorenpaar beim Spaziergang im Park',
    photographer: 'Annie Spratt',
    photographer_url: 'https://unsplash.com/@anniespratt',
    photo_page_url: 'https://unsplash.com/photos/d5d88e9218df',
  },
  'sterbegeld-vs-bestattungsvorsorge': {
    photoId: 'photo-1470071459604-3b5ec3a7fe05',
    alt: 'Nebel über ruhiger Landschaft — Zeit zum Nachdenken',
    photographer: 'Luca Bravo',
    photographer_url: 'https://unsplash.com/@lucabravo',
    photo_page_url: 'https://unsplash.com/photos/3b5ec3a7fe05',
  },
  'wie-hoch-versicherungssumme': {
    photoId: 'photo-1454165804606-c3d57bc86b40',
    alt: 'Planung am Laptop mit Notizen',
    photographer: 'Scott Graham',
    photographer_url: 'https://unsplash.com/@homajob',
    photo_page_url: 'https://unsplash.com/photos/c3d57bc86b40',
  },
  'sterbegeld-fuer-beamte': {
    photoId: 'photo-1497366216548-37526070297c',
    alt: 'Ruhiges Büro mit Schreibtisch',
    photographer: 'Corinne Kutz',
    photographer_url: 'https://unsplash.com/@corinnekutz',
    photo_page_url: 'https://unsplash.com/photos/37526070297c',
  },
  'sterbegeld-kuendigen': {
    photoId: 'photo-1586281380349-632531db7ed4',
    alt: 'Vertrag und Stift auf hellem Schreibtisch',
    photographer: 'Gabrielle Henderson',
    photographer_url: 'https://unsplash.com/@gabrielle_hk',
    photo_page_url: 'https://unsplash.com/photos/632531db7ed4',
  },
  'beerdigungskosten-2026': {
    photoId: 'photo-1500530855697-b586d89ba3ee',
    alt: 'Blumen im weichen Licht — würdevoll und ruhig',
    photographer: 'Aaron Burden',
    photographer_url: 'https://unsplash.com/@aaronburden',
    photo_page_url: 'https://unsplash.com/photos/b586d89ba3ee',
  },
  'sterbegeld-steuerfrei': {
    photoId: 'photo-1434030216411-0b793f4b4173',
    alt: 'Unterlagen und Stift auf dem Schreibtisch',
    photographer: 'NeONBRAND',
    photographer_url: 'https://unsplash.com/@neonbrand',
    photo_page_url: 'https://unsplash.com/photos/0b793f4b4173',
  },
  'sterbegeld-bei-suizid': {
    photoId: 'photo-1573496359142-b8d87734a5a2',
    alt: 'Beratungsgespräch in ruhiger Atmosphäre',
    photographer: 'Christina @ wocintechchat.com',
    photographer_url: 'https://unsplash.com/@wocintechchat',
    photo_page_url: 'https://unsplash.com/photos/b8d87734a5a2',
  },
  'sterbegeld-auszahlen-lassen': {
    photoId: 'photo-1600880292203-757bb62b4baf',
    alt: 'Beratungsgespräch am Tisch — Vertrauen',
    photographer: 'Austin Distel',
    photographer_url: 'https://unsplash.com/@austindistel',
    photo_page_url: 'https://unsplash.com/photos/757bb62b4baf',
  },
  'sterbegeld-vs-risikolebensversicherung': {
    photoId: 'photo-1556761175-b413da4baf72',
    alt: 'Beratungsgespräch am Tisch',
    photographer: 'Austin Distel',
    photographer_url: 'https://unsplash.com/@austindistel',
    photo_page_url: 'https://unsplash.com/photos/b413da4baf72',
  },
  'sterbegeld-fuer-senioren-80plus': {
    photoId: 'photo-1517841905240-472988babdf9',
    alt: 'Seniorin am Fenster mit weichem Licht',
    photographer: 'Erik Lucatero',
    photographer_url: 'https://unsplash.com/@eriklu',
    photo_page_url: 'https://unsplash.com/photos/472988babdf9',
  },
  'sterbegeld-ohne-gesundheitsfragen': {
    photoId: 'photo-1544025162-d76694265947',
    alt: 'Unterzeichnung eines Dokuments',
    photographer: 'Cytonn Photography',
    photographer_url: 'https://unsplash.com/@cytonn',
    photo_page_url: 'https://unsplash.com/photos/d76694265947',
  },
  'sterbegeld-vs-sparplan': {
    photoId: 'photo-1579621970563-ebec7560ff3e',
    alt: 'Spartopf und Münzen auf dem Tisch',
    photographer: 'Michael Longmire',
    photographer_url: 'https://unsplash.com/@longmire',
    photo_page_url: 'https://unsplash.com/photos/ebec7560ff3e',
  },
  'sterbegeld-und-pflegezusatz': {
    photoId: 'photo-1576091160399-112ba8d25d1d',
    alt: 'Pflege und medizinische Betreuung — symbolisch',
    photographer: 'National Cancer Institute',
    photographer_url: 'https://unsplash.com/@nci',
    photo_page_url: 'https://unsplash.com/photos/112ba8d25d1d',
  },
  'sterbegeld-online-abschliessen': {
    photoId: 'photo-1516321318423-f06f85e504b3',
    alt: 'Laptop auf dem Sofa — digitale Beratung von zu Hause',
    photographer: 'Marvin Meyer',
    photographer_url: 'https://unsplash.com/@marvelous',
    photo_page_url: 'https://unsplash.com/photos/f06f85e504b3',
  },
  'sterbegeld-wartezeit-umgehen': {
    photoId: 'photo-1506784365847-bbad939e9335',
    alt: 'Kalender und Planung auf dem Schreibtisch',
    photographer: 'Jazmin Quaynor',
    photographer_url: 'https://unsplash.com/@jazminantoinette',
    photo_page_url: 'https://unsplash.com/photos/bbad939e9335',
  },
  'sterbegeld-fuer-buergergeld-empfaenger': {
    photoId: 'photo-1529156069898-49953e39b3ac',
    alt: 'Menschen in freundlicher Gemeinschaft',
    photographer: 'Hannah Busing',
    photographer_url: 'https://unsplash.com/@hannahbusing',
    photo_page_url: 'https://unsplash.com/photos/49953e39b3ac',
  },
  'sterbegeld-bei-scheidung': {
    photoId: 'photo-1517245386807-bb43f82c33c4',
    alt: 'Gespräch in ruhiger Büroatmosphäre',
    photographer: 'Scott Graham',
    photographer_url: 'https://unsplash.com/@homajob',
    photo_page_url: 'https://unsplash.com/photos/bb43f82c33c4',
  },
  'sterbegeld-als-erbe-steuerlich': {
    photoId: 'photo-1522202176988-66273c2fd55f',
    alt: 'Team arbeitet an Unterlagen am Schreibtisch',
    photographer: 'Brooke Cagle',
    photographer_url: 'https://unsplash.com/@brookecagle',
    photo_page_url: 'https://unsplash.com/photos/66273c2fd55f',
  },
  'sterbegeld-mit-bestatter-treuhand-kombinieren': {
    photoId: 'photo-1441974231531-c6227db76b6e',
    alt: 'Ruhiger Waldweg — Bestattungsvorsorge symbolisch',
    photographer: 'Johannes Plenio',
    photographer_url: 'https://unsplash.com/@jplenio',
    photo_page_url: 'https://unsplash.com/photos/c6227db76b6e',
  },
}

export function getCuratedCoverForSlug(slug: string | null | undefined): {
  cover_image_url: string
  cover_image_alt: string
} | null {
  const key = slug?.trim()
  if (!key) return null
  const entry = CURATED_COVERS[key]
  if (!entry) return null
  return {
    cover_image_url: buildUnsplashCdnUrl(entry.photoId, { width: 1600, height: 900 }),
    cover_image_alt: entry.alt,
  }
}

export function curatedCoverToStockMeta(slug: string): StockPhotoMeta | null {
  const entry = CURATED_COVERS[slug.trim()]
  if (!entry) return null
  const photo_id = entry.photoId.replace(/^photo-/, '')
  return {
    source: 'unsplash',
    photo_id,
    photographer: entry.photographer,
    photographer_url: entry.photographer_url,
    photo_page_url: entry.photo_page_url,
    search_query: `curated:${slug}`,
  }
}

/** True when cover URL is the product hero or another reused hero asset. */
export function isReusedProductHeroCover(
  coverUrl: string | null | undefined,
  heroUrl: string | null | undefined,
): boolean {
  if (!coverUrl?.trim()) return false
  if (heroUrl?.trim() && coverUrl.split('?')[0] === heroUrl.split('?')[0]) return true
  const file = coverUrl.split('/').pop()?.toLowerCase() ?? ''
  // Batch jobs wrongly stored the product hauptbild as ratgeber cover
  return file.includes('hero-hauptbild-')
}
