import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import {
  buildProduktFaviconPath,
  buildProduktFaviconUrl,
  parseFaviconSize,
  renderLetterFaviconPng,
} from '../favicon'

describe('favicon pipeline helpers', () => {
  it('builds relative and absolute favicon paths', () => {
    expect(buildProduktFaviconPath('sterbegeld24plus')).toBe(
      '/api/produkte/sterbegeld24plus/icon',
    )
    expect(buildProduktFaviconPath('sterbegeld24plus', 180)).toBe(
      '/api/produkte/sterbegeld24plus/icon?size=180',
    )
    expect(
      buildProduktFaviconUrl('sterbegeld24plus', {
        domain: 'https://www.sterbegeld24plus.de',
      }),
    ).toBe('https://www.sterbegeld24plus.de/api/produkte/sterbegeld24plus/icon')
  })

  it('parses and clamps size', () => {
    expect(parseFaviconSize(null)).toBe(48)
    expect(parseFaviconSize('180')).toBe(180)
    expect(parseFaviconSize('9999')).toBe(512)
    expect(parseFaviconSize('2')).toBe(16)
  })

  it('renders a square letter png', async () => {
    const png = await renderLetterFaviconPng({
      letter: 'S',
      accentColor: '#f26522',
      size: 48,
    })
    const meta = await sharp(png).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(48)
    expect(meta.height).toBe(48)
  })
})
