/**
 * Validate + normalize product icon uploads.
 * Icons must be square (or very close) — wide wordmarks are rejected.
 */
import sharp from 'sharp'

const MAX_SIDE = 512
/** Allow tiny encoding / crop differences (e.g. 500x498). */
const SQUARE_TOLERANCE = 0.03

export class NotSquareImageError extends Error {
  constructor(width: number, height: number) {
    super(
      `Icon must be square (1:1). Got ${width}×${height}. Please upload a square PNG/JPG/WebP.`,
    )
    this.name = 'NotSquareImageError'
  }
}

export function isSquareDimensions(width: number, height: number): boolean {
  if (width < 8 || height < 8) return false
  const ratio = Math.abs(width - height) / Math.max(width, height)
  return ratio <= SQUARE_TOLERANCE
}

export async function prepareSquareIcon(
  buffer: Buffer,
  mime: string,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  if (mime === 'image/svg+xml') {
    const size = parseSvgSize(buffer.toString('utf8'))
    if (size && !isSquareDimensions(size.width, size.height)) {
      throw new NotSquareImageError(size.width, size.height)
    }
    return { buffer, contentType: mime, ext: 'svg' }
  }

  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!isSquareDimensions(width, height)) {
    throw new NotSquareImageError(width, height)
  }

  const side = Math.min(Math.max(width, height), MAX_SIDE)
  const out = await sharp(buffer)
    .resize(side, side, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  return { buffer: out, contentType: 'image/png', ext: 'png' }
}

function parseSvgSize(svg: string): { width: number; height: number } | null {
  const widthMatch = svg.match(/\bwidth=["'](\d+(?:\.\d+)?)["']/i)
  const heightMatch = svg.match(/\bheight=["'](\d+(?:\.\d+)?)["']/i)
  if (widthMatch && heightMatch) {
    return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) }
  }
  const vb = svg.match(/viewBox=["']\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*["']/i)
  if (vb) {
    return { width: Number(vb[3]), height: Number(vb[4]) }
  }
  return null
}
