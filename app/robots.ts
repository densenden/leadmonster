// Generates /robots.txt via Next.js MetadataRoute.Robots.
// Disallows /admin/ for all crawlers; explicitly allows named AI crawlers.
// The sitemap URL is built from NEXT_PUBLIC_BASE_URL — fails fast if missing.
import type { MetadataRoute } from 'next'
import { buildCanonicalUrl } from '@/lib/seo/metadata'

export default function robots(): MetadataRoute.Robots {
  let sitemapUrl: string
  try {
    sitemapUrl = buildCanonicalUrl('/sitemap.xml')
  } catch {
    console.error('NEXT_PUBLIC_BASE_URL not set — robots.txt will have empty sitemap')
    // Return a valid robots file with no sitemap when the base URL is missing.
    return { rules: [] }
  }

  return {
    rules: [
      { userAgent: '*', disallow: '/admin/' },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'anthropic-ai', allow: '/' },
      { userAgent: 'CCBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
    ],
    sitemap: sitemapUrl,
  }
}
