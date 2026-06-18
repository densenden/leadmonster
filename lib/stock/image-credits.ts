/**
 * Parse `bilder` rows into imprint-ready image credits.
 */
import { parseUnsplashPhotoId } from './unsplash'
import type { ImageCredit, StockPhotoMeta } from './types'

export interface BilderCreditRow {
  id: string
  alt_text: string
  url: string
  provider: string
  page_type: string | null
  slot: string | null
  prompt_used: string | null
}

function parseStockMeta(promptUsed: string | null): StockPhotoMeta | null {
  if (!promptUsed?.trim()) return null
  if (promptUsed.startsWith('{')) {
    try {
      const parsed = JSON.parse(promptUsed) as StockPhotoMeta
      if (parsed.source === 'unsplash' && parsed.photo_id) return parsed
    } catch {
      /* legacy string */
    }
  }
  return null
}

function usageLabel(pageType: string | null, slot: string | null): string | null {
  if (!pageType) return slot
  if (pageType.startsWith('ratgeber_')) {
    return `Ratgeber: ${pageType.replace(/^ratgeber_/, '')}`
  }
  const labels: Record<string, string> = {
    hauptseite: 'Produktseite',
    hauptseite_warum: 'Produktseite — Vorsorge',
    hauptseite_ablauf: 'Produktseite — Ablauf',
    ratgeber_was_ist: 'Ratgeber: Was ist Sterbegeld',
    ratgeber_fuer_wen: 'Ratgeber: Für wen',
    ratgeber_kosten: 'Ratgeber: Kosten',
  }
  return labels[pageType] ?? pageType
}

function creditForUnsplash(
  row: BilderCreditRow,
  meta: StockPhotoMeta | null,
): ImageCredit {
  const photoId = meta?.photo_id ?? parseUnsplashPhotoId(row.url)
  const photoPage =
    meta?.photo_page_url ??
    (photoId ? `https://unsplash.com/photos/${photoId.replace(/^photo-/, '')}` : null)

  return {
    id: row.id,
    alt_text: row.alt_text,
    url: row.url,
    provider: 'unsplash',
    page_type: row.page_type,
    slot: row.slot,
    usage_label: usageLabel(row.page_type, row.slot),
    photographer: meta?.photographer ?? null,
    photographer_url: meta?.photographer_url ?? 'https://unsplash.com',
    photo_page_url: photoPage,
    license_note: 'Unsplash License — free for commercial use with attribution',
  }
}

function creditForOpenAi(row: BilderCreditRow): ImageCredit {
  return {
    id: row.id,
    alt_text: row.alt_text,
    url: row.url,
    provider: row.provider,
    page_type: row.page_type,
    slot: row.slot,
    usage_label: usageLabel(row.page_type, row.slot),
    photographer: null,
    photographer_url: null,
    photo_page_url: null,
    license_note: 'KI-generiert (OpenAI gpt-image-1), Nutzungsrechte beim Betreiber',
  }
}

export function rowToImageCredit(row: BilderCreditRow): ImageCredit {
  const meta = parseStockMeta(row.prompt_used)

  if (row.provider === 'unsplash' || meta?.source === 'unsplash') {
    return creditForUnsplash(row, meta)
  }

  if (row.provider === 'openai') {
    return creditForOpenAi(row)
  }

  return {
    id: row.id,
    alt_text: row.alt_text,
    url: row.url,
    provider: row.provider,
    page_type: row.page_type,
    slot: row.slot,
    usage_label: usageLabel(row.page_type, row.slot),
    photographer: null,
    photographer_url: null,
    photo_page_url: null,
    license_note: row.provider === 'manual' ? 'Eigene Aufnahme / lizenziert' : 'Siehe Anbieter',
  }
}

/** Deduplicate by URL — same stock CDN may appear on multiple sections. */
export function dedupeImageCredits(credits: ImageCredit[]): ImageCredit[] {
  const seen = new Set<string>()
  const out: ImageCredit[] = []
  for (const c of credits) {
    const key = c.url.split('?')[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out.sort((a, b) => {
    const prov = a.provider.localeCompare(b.provider)
    if (prov !== 0) return prov
    return (a.usage_label ?? '').localeCompare(b.usage_label ?? '', 'de')
  })
}

export function rowsToImageCredits(rows: BilderCreditRow[]): ImageCredit[] {
  return dedupeImageCredits(rows.map(rowToImageCredit))
}
