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

  const base = sharp(input).rotate().resize(size, size, {
    fit: 'cover',
    position: 'attention',
  })

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
