/**
 * Unsplash stock search + CDN URLs for editorial content images.
 * Server/scripts only — needs UNSPLASH_ACCESS_KEY.
 */
import type { StockPhotoMeta, UnsplashPhoto } from './types'

const API_BASE = 'https://api.unsplash.com'

export function getUnsplashAccessKey(): string | null {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim()
  return key && key.length > 8 ? key : null
}

/** Build a sized Unsplash CDN URL from a photo id like `photo-1567096038228-7d57aacd33b1`. */
export function buildUnsplashCdnUrl(
  photoId: string,
  options: { width?: number; height?: number; fit?: 'crop' | 'max' } = {},
): string {
  const w = options.width ?? 1600
  const h = options.height ?? 1066
  const fit = options.fit ?? 'crop'
  const id = photoId.startsWith('photo-') ? photoId : `photo-${photoId}`
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=${fit}&auto=format&q=80`
}

/** Extract Unsplash photo id from CDN URL, if present. */
export function parseUnsplashPhotoId(url: string): string | null {
  const m = url.match(/images\.unsplash\.com\/(photo-[a-z0-9-]+)/i)
  return m?.[1] ?? null
}

/** English search terms for German insurance / ratgeber slugs (abstract, solemn — no cheerful people). */
export function buildStockSearchQuery(slug: string, title: string): string {
  const slugMap: Record<string, string> = {
    'was-ist-sterbegeld': 'documents desk pen planning muted abstract',
    'fuer-wen': 'empty bench park solitude fog muted',
    'kosten-leistungen': 'funeral costs documents desk pen calculator',
    'beerdigungskosten': 'funeral flowers still life muted peaceful',
    'sterbegeld-mit-vorerkrankungen': 'fog mountain landscape abstract solemn',
    'sterbegeld-ohne-gesundheitsfragen': 'hands signing document desk no face',
    'sterbegeld-als-erbe-steuerlich': 'inheritance documents desk pen abstract',
    'sterbegeld-bei-scheidung': 'divorce papers contract desk minimal muted',
    'sterbegeld-fuer-senioren': 'empty bench fog landscape solitude no people',
    'sterbegeld-vs-lebensversicherung': 'insurance comparison documents calculator hands',
    'sterbegeld-vs-sparplan': 'coins savings jar desk still life muted',
    'sterbegeld-online-abschliessen': 'hands laptop overhead desk no face',
    'bestattungsvorsorge': 'memorial flowers fog landscape quiet abstract',
    wartezeit: 'calendar desk planning muted abstract',
    'sterbegeld-bei-suizid': 'fog forest wilderness abstract solemn',
    'sterbegeld-fuer-buergergeld-empfaenger': 'forest path fog muted landscape',
  }

  if (slugMap[slug]) return slugMap[slug]

  const fromTitle = title
    .replace(/[»«|—–-]/g, ' ')
    .replace(/Sterbegeld|versicherung|Ratgeber|\d{4}/gi, '')
    .trim()

  const slugWords = slug.replace(/-/g, ' ')
  return `${fromTitle || slugWords} documents fog landscape abstract muted germany editorial no people`
}

export function serializeStockMeta(meta: StockPhotoMeta): string {
  return JSON.stringify(meta)
}

export function stockMetaFromPhoto(photo: UnsplashPhoto, searchQuery: string): StockPhotoMeta {
  return {
    source: 'unsplash',
    photo_id: photo.id,
    photographer: photo.user.name,
    photographer_url: photo.user.links.html,
    photo_page_url: photo.links.html,
    search_query: searchQuery,
  }
}

export function cdnUrlForCover(photo: UnsplashPhoto): string {
  const u = new URL(photo.urls.regular)
  u.searchParams.set('w', '1600')
  u.searchParams.set('h', '900')
  u.searchParams.set('fit', 'crop')
  u.searchParams.set('auto', 'format')
  u.searchParams.set('q', '80')
  return u.toString()
}

interface SearchResult {
  results: UnsplashPhoto[]
}

export async function searchUnsplashPhotos(
  query: string,
  options: { perPage?: number; orientation?: 'landscape' | 'portrait' | 'squarish' } = {},
): Promise<UnsplashPhoto[]> {
  const key = getUnsplashAccessKey()
  if (!key) {
    throw new Error('UNSPLASH_ACCESS_KEY is not set — add it to .env.local')
  }

  const params = new URLSearchParams({
    query,
    per_page: String(options.perPage ?? 8),
    orientation: options.orientation ?? 'landscape',
    content_filter: 'high',
  })

  const res = await fetch(`${API_BASE}/search/photos?${params}`, {
    headers: {
      Authorization: `Client-ID ${key}`,
      'Accept-Version': 'v1',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Unsplash search failed (${res.status}): ${body.slice(0, 200)}`)
  }

  const json = (await res.json()) as SearchResult
  return json.results ?? []
}

/** Pick first photo that looks editorial (no brand/UI, no cheerful people). */
export function pickEditorialPhoto(photos: UnsplashPhoto[]): UnsplashPhoto | null {
  const blocked =
    /\b(logo|screenshot|mockup|ui|website|advertisement|billboard|smiling|smile|happy|laughing|cheerful|celebration|party|selfie|portrait|headshot|community|team|friends|wedding|crowd)\b/i
  const peopleHeavy =
    /\b(couple|family|generations|senior couple|people group|group of people|business meeting|advisory)\b/i
  for (const p of photos) {
    const text = `${p.alt_description ?? ''} ${p.description ?? ''}`
    if (blocked.test(text) || peopleHeavy.test(text)) continue
    return p
  }
  return photos[0] ?? null
}

export async function findStockPhotoForTopic(
  slug: string,
  title: string,
): Promise<{ photo: UnsplashPhoto; query: string; meta: StockPhotoMeta; url: string } | null> {
  const query = buildStockSearchQuery(slug, title)
  const results = await searchUnsplashPhotos(query, { perPage: 10, orientation: 'landscape' })
  const photo = pickEditorialPhoto(results)
  if (!photo) return null

  const meta = stockMetaFromPhoto(photo, query)
  return { photo, query, meta, url: cdnUrlForCover(photo) }
}
