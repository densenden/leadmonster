/**
 * GET /api/produkte/[slug]/icon?size=48
 *
 * Favicon pipeline (Google-friendly: always 200 image/png, no redirect):
 * 1) If square product icon uploaded → fetch, resize, return PNG
 * 2) Else → generate letter-circle PNG from product name + accent
 */
import { type NextRequest } from 'next/server'
import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveAccentColor } from '@/lib/utils/accent'
import {
  letterFromProductName,
  parseFaviconSize,
  renderLetterFaviconPng,
} from '@/lib/branding/favicon'

export const runtime = 'nodejs'

interface RouteContext {
  params: { slug: string }
}

const CACHE =
  'public, max-age=3600, stale-while-revalidate=86400, s-maxage=3600'

export async function GET(request: NextRequest, { params }: RouteContext) {
  const slug = params.slug?.trim()
  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const size = parseFaviconSize(request.nextUrl.searchParams.get('size'))

  const supabase = createAdminClient()
  const { data: produkt, error } = await supabase
    .from('produkte')
    .select('name, brand_display_name, typ, accent_color, navbar_logo_url')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !produkt) {
    return new Response('Product not found', { status: 404 })
  }

  const uploaded = produkt.navbar_logo_url?.trim()
  if (uploaded) {
    try {
      // Serve 200 PNG from our own URL — Google often skips favicons behind 302.
      const upstream = await fetch(uploaded, { next: { revalidate: 3600 } })
      if (!upstream.ok) {
        throw new Error(`Upstream ${upstream.status}`)
      }
      const raw = Buffer.from(await upstream.arrayBuffer())
      const png = await sharp(raw)
        .resize(size, size, { fit: 'cover', position: 'centre' })
        .png()
        .toBuffer()

      return new Response(new Uint8Array(png), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': CACHE,
        },
      })
    } catch {
      // Fall through to letter favicon if storage fetch fails.
    }
  }

  const displayName = produkt.brand_display_name?.trim() || produkt.name
  const accent = resolveAccentColor(produkt.typ, produkt.accent_color)
  const letter = letterFromProductName(displayName)
  const png = await renderLetterFaviconPng({ letter, accentColor: accent, size })

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': CACHE,
    },
  })
}
