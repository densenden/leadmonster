import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { isSquareDimensions, NotSquareImageError, prepareSquareIcon } from '../prepare-square-icon'

describe('isSquareDimensions', () => {
  it('accepts exact squares', () => {
    expect(isSquareDimensions(256, 256)).toBe(true)
  })

  it('rejects wide images', () => {
    expect(isSquareDimensions(380, 88)).toBe(false)
  })
})

describe('prepareSquareIcon', () => {
  it('accepts and normalizes a square png', async () => {
    const raw = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 0, g: 74, b: 173 },
      },
    }).png().toBuffer()

    const result = await prepareSquareIcon(raw, 'image/png')
    const meta = await sharp(result.buffer).metadata()
    expect(result.ext).toBe('png')
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(200)
  })

  it('rejects non-square images', async () => {
    const raw = await sharp({
      create: {
        width: 300,
        height: 100,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    }).png().toBuffer()

    await expect(prepareSquareIcon(raw, 'image/png')).rejects.toBeInstanceOf(NotSquareImageError)
  })
})
