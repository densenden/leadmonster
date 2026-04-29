// POST /api/admin/scrape
// Fetches a URL, extracts content via cheerio, and optionally saves to wissensfundus.
// Auth-guarded — admin session required.
import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchHtml, extractData, buildArticles } from '@/lib/scraper/scrape'

const bodySchema = z.object({
  url: z.string().url(),
  kategorie: z.string().min(1),
  thema_prefix: z.string().min(1).regex(/^[a-z0-9_]+$/),
  save: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  // Auth guard
  const sessionClient = createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { url, kategorie, thema_prefix, save } = parsed.data

  // Fetch and parse the target URL
  let html: string
  try {
    html = await fetchHtml(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fetch failed'
    return Response.json({ error: 'FETCH_ERROR', message: msg }, { status: 502 })
  }

  const data = extractData(html)
  const articles = buildArticles(data, kategorie, url, thema_prefix)

  // Dry run — return preview without saving
  if (!save) {
    return Response.json({
      preview: data,
      articles,
      stats: {
        html_kb: +(html.length / 1024).toFixed(1),
        features: data.features.length,
        faq: data.faq.length,
        pricing: data.pricing.length,
        insurers: data.insurers.length,
        snippets: data.raw_text_snippets.length,
      },
    })
  }

  // Save — upsert all 4 articles to wissensfundus
  const supabase = createAdminClient()
  const results: { thema: string; ok: boolean; error?: string }[] = []

  for (const article of articles) {
    const { error } = await supabase
      .from('wissensfundus')
      .upsert(article, { onConflict: 'kategorie,thema' })

    results.push({ thema: article.thema, ok: !error, error: error?.message })
  }

  return Response.json({ saved: results, articles })
}
