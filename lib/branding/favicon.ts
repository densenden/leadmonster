/**
 * Per-product favicon pipeline helpers.
 *
 * Flow: optional square upload → else generate letter-circle PNG.
 * Served by GET /api/produkte/[slug]/icon
 */
import sharp from 'sharp'
import { productInitialLetter } from '@/lib/branding/navbar-logo'
import { resolveBaseUrl } from '@/lib/seo/organization'

export const FAVICON_SIZES = {
  /** Google wants multiples of 48px for Search results favicon. */
  default: 48,
  apple: 180,
} as const

export type FaviconSizeKey = keyof typeof FAVICON_SIZES

/** Public path used in <link rel="icon"> / metadata.icons */
export function buildProduktFaviconPath(slug: string, size?: number): string {
  const q = size && size !== FAVICON_SIZES.default ? `?size=${size}` : ''
  return `/api/produkte/${encodeURIComponent(slug)}/icon${q}`
}

/** Absolute favicon URL for metadata (some crawlers prefer absolute). */
export function buildProduktFaviconUrl(
  slug: string,
  opts?: { size?: number; domain?: string | null },
): string {
  return `${resolveBaseUrl(opts?.domain)}${buildProduktFaviconPath(slug, opts?.size)}`
}

export function parseFaviconSize(raw: string | null): number {
  if (raw == null || raw.trim() === '') return FAVICON_SIZES.default
  const n = Number(raw)
  if (!Number.isFinite(n)) return FAVICON_SIZES.default
  // Clamp to sensible favicon range
  return Math.min(512, Math.max(16, Math.round(n)))
}

/** Render a circular letter mark as PNG (same idea as navbar default). */
export async function renderLetterFaviconPng(args: {
  letter: string
  accentColor: string
  size?: number
}): Promise<Buffer> {
  const size = args.size ?? FAVICON_SIZES.default
  const letter = (args.letter || '?').slice(0, 1)
  const fill = sanitizeHexColor(args.accentColor) ?? '#02a9e6'
  const fontSize = Math.round(size * 0.52)
  // Slight optical shift — capital letters sit a bit high in SVG text.
  const dy = Math.round(size * 0.04)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${fill}"/>
  <text
    x="50%"
    y="50%"
    dy="${dy}"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="700"
    font-size="${fontSize}"
    fill="#ffffff"
  >${escapeXml(letter)}</text>
</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

export function letterFromProductName(name: string): string {
  return productInitialLetter(name)
}

function sanitizeHexColor(raw: string): string | null {
  const m = raw.trim().match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/)
  if (!m) return null
  if (m[1].length === 3) {
    const [r, g, b] = m[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return `#${m[1]}`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
