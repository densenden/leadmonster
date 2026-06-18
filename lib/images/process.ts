/**
 * Bild-Pipeline: Square-Crop + WebP-Konvertierung mit Sharp.
 * Wird für Author-Fotos (`redaktion-fotos`) und Trust-Asset-Logos verwendet.
 *
 * Limits:
 *   - max. ~200 KB Output (qualität wird iterativ runtergedreht falls überschritten)
 *   - Standard-Größe 600 × 600 für Author-Portraits
 *   - Format: WebP (kleinste Größe + breite Browser-Unterstützung)
 *
 * Server-only (Node-Bindings).
 */
import sharp from 'sharp'
import { PORTRAIT_CROP_TOP_BIAS } from '@/lib/styles/portrait-circle'

export interface ProcessImageOptions {
  /** Zielkantenlänge des Quadrats. Default 600. */
  size?: number
  /** Maximale Datei-Größe in KB. Default 200. */
  maxKB?: number
  /** Start-WebP-Qualität (1-100). Default 85. */
  quality?: number
}

export interface ProcessedImage {
  buffer: Buffer
  width: number
  height: number
  bytes: number
  format: 'webp'
}

function squareExtractRegion(width: number, height: number): { left: number; top: number; size: number } {
  const size = Math.min(width, height)
  const left = Math.floor((width - size) / 2)

  if (height > width) {
    const slack = height - size
    return { left, top: Math.floor(slack * PORTRAIT_CROP_TOP_BIAS), size }
  }

  if (width > height) {
    const slack = width - size
    return { left: Math.floor(slack * 0.5), top: 0, size }
  }

  return { left: 0, top: 0, size }
}

/**
 * Schneidet das Bild zentral auf 1:1, resize auf `size×size`, konvertiert zu WebP.
 * Reduziert Qualität iterativ, bis `maxKB` eingehalten wird.
 */
export async function toSquareWebp(
  input: Buffer | Uint8Array,
  options: ProcessImageOptions = {},
): Promise<ProcessedImage> {
  const size = options.size ?? 600
  const maxBytes = (options.maxKB ?? 200) * 1024
  let quality = options.quality ?? 85

  const rotated = sharp(input).rotate()
  const meta = await rotated.metadata()
  const width = meta.width ?? size
  const height = meta.height ?? size
  const region = squareExtractRegion(width, height)

  const base = region.size === width && region.size === height
    ? rotated.resize(size, size)
    : rotated
        .extract({
          left: region.left,
          top: region.top,
          width: region.size,
          height: region.size,
        })
        .resize(size, size)

  for (let attempt = 0; attempt < 4; attempt++) {
    const buffer = await base.clone().webp({ quality, effort: 5 }).toBuffer()
    if (buffer.length <= maxBytes || quality <= 50) {
      return {
        buffer,
        width: size,
        height: size,
        bytes: buffer.length,
        format: 'webp',
      }
    }
    quality = Math.max(50, quality - 10)
  }

  // Final fallback (sollte nie erreicht werden)
  const final = await base.clone().webp({ quality: 50, effort: 5 }).toBuffer()
  return { buffer: final, width: size, height: size, bytes: final.length, format: 'webp' }
}
