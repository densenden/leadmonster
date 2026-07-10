/**
 * Curated Unsplash cover photos per ratgeber slug — no API key required.
 * Used when DB cover is missing or reuses the product hero image.
 *
 * Editorial tone (funeral insurance / serious topics):
 * - Abstract, muted, solemn — landscapes, fog, documents, hands without faces
 * - No smiling people, no group portraits, no "friendly community" stock
 * - Aligned with lib/openai/section-prompt.ts faceless rules
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
    photoId: 'photo-1450101499163-c8848c66ca85',
    alt: 'Unterlagen und Stift — ruhige Vorsorgeplanung',
    photographer: 'Scott Graham',
    photographer_url: 'https://unsplash.com/@homajob',
    photo_page_url: 'https://unsplash.com/photos/c8848c66ca85',
  },
  'fuer-wen': {
    photoId: 'photo-1501594907352-04cda38ebc29',
    alt: 'Leere Parkbank im gedämpften Licht',
    photographer: 'Andrea Reiman',
    photographer_url: 'https://unsplash.com/@andrea_reiman',
    photo_page_url: 'https://unsplash.com/photos/04cda38ebc29',
  },
  'kosten-leistungen': {
    photoId: 'photo-1554224155-6726b3ff858f',
    alt: 'Taschenrechner und Unterlagen auf dem Schreibtisch',
    photographer: 'Kelly Sikkema',
    photographer_url: 'https://unsplash.com/@kellysikkema',
    photo_page_url: 'https://unsplash.com/photos/6726b3ff858f',
  },
  'warum-sinnvoll': {
    photoId: 'photo-1519681393784-d120267933ba',
    alt: 'Schneebedeckte Berge — stille Weite',
    photographer: 'Johannes Plenio',
    photographer_url: 'https://unsplash.com/@jplenio',
    photo_page_url: 'https://unsplash.com/photos/d120267933ba',
  },
  anbietervergleich: {
    photoId: 'photo-1579621970563-ebec7560ff3e',
    alt: 'Münzen auf dem Tisch — Kostenvergleich symbolisch',
    photographer: 'Michael Longmire',
    photographer_url: 'https://unsplash.com/@longmire',
    photo_page_url: 'https://unsplash.com/photos/ebec7560ff3e',
  },
  'sterbegeld-mit-vorerkrankungen': {
    photoId: 'photo-1464822759023-fed622ff2c3b',
    alt: 'Nebel über der Berglandschaft',
    photographer: 'Benjamin Voros',
    photographer_url: 'https://unsplash.com/@vorosbenisop',
    photo_page_url: 'https://unsplash.com/photos/fed622ff2c3b',
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
    alt: 'Planungsunterlagen am Schreibtisch',
    photographer: 'Scott Graham',
    photographer_url: 'https://unsplash.com/@homajob',
    photo_page_url: 'https://unsplash.com/photos/c3d57bc86b40',
  },
  'sterbegeld-fuer-beamte': {
    photoId: 'photo-1497366216548-37526070297c',
    alt: 'Leeres Büro mit Schreibtisch',
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
    photoId: 'photo-1416339306562-f3d12fefd36f',
    alt: 'Nebel über stiller Waldlandschaft',
    photographer: 'Jesse Bowser',
    photographer_url: 'https://unsplash.com/@jessebowser',
    photo_page_url: 'https://unsplash.com/photos/f3d12fefd36f',
  },
  'sterbegeld-auszahlen-lassen': {
    photoId: 'photo-1544025162-d76694265947',
    alt: 'Hände beim Unterzeichnen eines Dokuments',
    photographer: 'Cytonn Photography',
    photographer_url: 'https://unsplash.com/@cytonn',
    photo_page_url: 'https://unsplash.com/photos/d76694265947',
  },
  'sterbegeld-vs-risikolebensversicherung': {
    photoId: 'photo-1493246507139-91e8fad9978e',
    alt: 'Berglandschaft in gedämpften Farben',
    photographer: 'Luca Bravo',
    photographer_url: 'https://unsplash.com/@lucabravo',
    photo_page_url: 'https://unsplash.com/photos/91e8fad9978e',
  },
  'sterbegeld-fuer-senioren-80plus': {
    photoId: 'photo-1472214103451-9374bd1c798e',
    alt: 'Gedämpftes Abendlicht über ruhiger Landschaft',
    photographer: 'Diego PH',
    photographer_url: 'https://unsplash.com/@jdiegoph',
    photo_page_url: 'https://unsplash.com/photos/9374bd1c798e',
  },
  'sterbegeld-ohne-gesundheitsfragen': {
    photoId: 'photo-1486312338219-ce68d2c6f44d',
    alt: 'Hände über Laptop — Planung von zu Hause',
    photographer: 'Glenn Carstens-Peters',
    photographer_url: 'https://unsplash.com/@glenncarstenspeters',
    photo_page_url: 'https://unsplash.com/photos/ce68d2c6f44d',
  },
  'sterbegeld-vs-sparplan': {
    photoId: 'photo-1506905925346-21bda4d32df4',
    alt: 'Bergsee in ruhiger Atmosphäre',
    photographer: 'Yannic Läderach',
    photographer_url: 'https://unsplash.com/@ylad',
    photo_page_url: 'https://unsplash.com/photos/21bda4d32df4',
  },
  'sterbegeld-und-pflegezusatz': {
    photoId: 'photo-1518173946687-a4c8892bbd9f',
    alt: 'Einzelnes Blatt im sanften Licht',
    photographer: 'Weronika',
    photographer_url: 'https://unsplash.com/@veronikal',
    photo_page_url: 'https://unsplash.com/photos/a4c8892bbd9f',
  },
  'sterbegeld-online-abschliessen': {
    photoId: 'photo-1511895426328-dc8714191300',
    alt: 'Minimalistische Architektur — digitale Klarheit',
    photographer: 'David Tip',
    photographer_url: 'https://unsplash.com/@davidtip',
    photo_page_url: 'https://unsplash.com/photos/dc8714191300',
  },
  'sterbegeld-wartezeit-umgehen': {
    photoId: 'photo-1506784365847-bbad939e9335',
    alt: 'Kalender und Planung auf dem Schreibtisch',
    photographer: 'Jazmin Quaynor',
    photographer_url: 'https://unsplash.com/@jazminantoinette',
    photo_page_url: 'https://unsplash.com/photos/bbad939e9335',
  },
  'sterbegeld-fuer-buergergeld-empfaenger': {
    photoId: 'photo-1469474968028-56623f02e42e',
    alt: 'Waldweg im diffusem Licht',
    photographer: 'Dave Hoefler',
    photographer_url: 'https://unsplash.com/@davehoefler',
    photo_page_url: 'https://unsplash.com/photos/56623f02e42e',
  },
  'sterbegeld-bei-scheidung': {
    photoId: 'photo-1441974231531-c6227db76b6e',
    alt: 'Ruhiger Waldweg — Neuanfang symbolisch',
    photographer: 'Johannes Plenio',
    photographer_url: 'https://unsplash.com/@jplenio',
    photo_page_url: 'https://unsplash.com/photos/c6227db76b6e',
  },
  'sterbegeld-als-erbe-steuerlich': {
    photoId: 'photo-1500534314209-a25ddb2bd429',
    alt: 'Nebel über stiller Berglandschaft',
    photographer: 'Johannes Plenio',
    photographer_url: 'https://unsplash.com/@jplenio',
    photo_page_url: 'https://unsplash.com/photos/a25ddb2bd429',
  },
  'sterbegeld-mit-bestatter-treuhand-kombinieren': {
    photoId: 'photo-1518837695005-2083093ee35b',
    alt: 'Ruhige Meereswellen — Bestattungsvorsorge symbolisch',
    photographer: 'Matt Hardy',
    photographer_url: 'https://unsplash.com/@matthardy',
    photo_page_url: 'https://unsplash.com/photos/2083093ee35b',
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
