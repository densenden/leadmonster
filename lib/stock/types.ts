/** Metadata we store in `bilder.prompt_used` for stock photos (JSON). */
export interface StockPhotoMeta {
  source: 'unsplash'
  photo_id: string
  photographer: string
  photographer_url: string
  photo_page_url: string
  search_query: string
}

export interface ImageCredit {
  id: string
  alt_text: string
  url: string
  provider: string
  page_type: string | null
  slot: string | null
  /** Human-readable usage hint, e.g. ratgeber slug or hero. */
  usage_label: string | null
  photographer: string | null
  photographer_url: string | null
  photo_page_url: string | null
  license_note: string
}

export type UnsplashPhoto = {
  id: string
  alt_description: string | null
  description: string | null
  urls: { regular: string }
  links: { html: string }
  user: { name: string; links: { html: string } }
}
