import { describe, expect, it } from 'vitest'
import {
  buildStockSearchQuery,
  buildUnsplashCdnUrl,
  parseUnsplashPhotoId,
  serializeStockMeta,
} from '../unsplash'
import { rowsToImageCredits } from '../image-credits'
import type { BilderCreditRow } from '../image-credits'

describe('buildUnsplashCdnUrl', () => {
  it('builds sized CDN URL from photo id', () => {
    const url = buildUnsplashCdnUrl('photo-1567096038228-7d57aacd33b1', { width: 1200, height: 800 })
    expect(url).toContain('images.unsplash.com/photo-1567096038228-7d57aacd33b1')
    expect(url).toContain('w=1200')
    expect(url).toContain('h=800')
  })
})

describe('parseUnsplashPhotoId', () => {
  it('extracts id from CDN url', () => {
    expect(parseUnsplashPhotoId('https://images.unsplash.com/photo-abc123?w=100')).toBe('photo-abc123')
  })
})

describe('buildStockSearchQuery', () => {
  it('uses curated query for known slugs', () => {
    expect(buildStockSearchQuery('was-ist-sterbegeld', 'Was ist Sterbegeld')).toContain('senior')
  })

  it('falls back to slug words for unknown topics', () => {
    const q = buildStockSearchQuery('sterbegeld-fuer-beamte', 'Sterbegeld für Beamte')
    expect(q.toLowerCase()).toContain('beamte')
  })
})

describe('rowsToImageCredits', () => {
  it('parses JSON stock meta for imprint table', () => {
    const rows: BilderCreditRow[] = [
      {
        id: '1',
        alt_text: 'Senior am Tisch',
        url: 'https://images.unsplash.com/photo-abc?w=1600',
        provider: 'unsplash',
        page_type: 'ratgeber_was-ist-sterbegeld',
        slot: 'blog_cover',
        prompt_used: serializeStockMeta({
          source: 'unsplash',
          photo_id: 'abc',
          photographer: 'Jane Doe',
          photographer_url: 'https://unsplash.com/@jane',
          photo_page_url: 'https://unsplash.com/photos/abc',
          search_query: 'senior planning',
        }),
      },
    ]
    const credits = rowsToImageCredits(rows)
    expect(credits).toHaveLength(1)
    expect(credits[0].photographer).toBe('Jane Doe')
    expect(credits[0].usage_label).toContain('was-ist-sterbegeld')
  })

  it('dedupes same URL', () => {
    const row: BilderCreditRow = {
      id: '1',
      alt_text: 'A',
      url: 'https://images.unsplash.com/photo-x?w=100',
      provider: 'unsplash',
      page_type: 'a',
      slot: 'inline',
      prompt_used: null,
    }
    expect(rowsToImageCredits([row, { ...row, id: '2' }])).toHaveLength(1)
  })
})
