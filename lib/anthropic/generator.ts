// Anthropic content generation helpers.
// This module provides utility functions that prepare context payloads
// from the wissensfundus knowledge base before calling the Claude API,
// and the primary generateContent function that orchestrates all page-type calls.
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import {
  composePrompt,
  buildWissensfundusBlock,
  buildProduktDnaBlock,
  buildVertriebssteuerungBlock,
  type WissensfundusRow,
} from './prompt-builder'
import { PageResponseSchemas } from './schemas'
import { buildSchemaMarkup } from '@/lib/seo/schema'
import type { GenerationResult, PageType, PageTypeError, PageTypeResult } from './types'

// Fetch relevant knowledge base articles for a given product type and format
// them as a Markdown context block ready for injection into a Claude system prompt.
//
// Queries both the product-specific category and 'allgemein' to ensure
// universal knowledge is always included.
//
// Returns an empty string (not an error) when no articles are found,
// so the generation pipeline can continue without knowledge context.
export async function fetchWissensfundusKontext(produktTyp: string): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('wissensfundus')
    .select('thema, inhalt')
    .in('kategorie', [produktTyp, 'allgemein'])

  if (error || !data || data.length === 0) {
    if (error) {
      // Log but do not throw — the pipeline continues without knowledge context.
      console.warn('Wissensfundus query error:', error.message)
    }
    return ''
  }

  const blocks = data
    .map((row) => `### ${row.thema}\n${row.inhalt}`)
    .join('\n\n')

  return `## Wissensfundus-Kontext\n\n${blocks}`
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ClaudeError {
  status?: number
  attempt_count?: number
}

// Safely casts a Supabase Json field to a Record<string, string> for use in prompts.
// Returns null when the value is not a plain object (e.g. string, number, array).
function castArgumenteToRecord(value: Json | null | undefined): Record<string, string> | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object' || Array.isArray(value)) return null
  // Cast the Json object — values may be any JSON primitive, so we stringify them
  return Object.fromEntries(
    Object.entries(value as Record<string, Json>).map(([k, v]) => [k, String(v)]),
  )
}

// Calls the Claude API with exponential backoff on HTTP 429 rate-limit errors.
// Throws on non-retryable errors immediately. After maxAttempts exhausted,
// attaches `attempt_count` to the thrown error for the caller to record.
async function callClaudeWithRetry(
  client: Anthropic,
  system: string,
  user: string,
  pageType: PageType,
  produktId: string,
): Promise<string> {
  const MAX_ATTEMPTS = 3
  let attempt = 0

  while (attempt < MAX_ATTEMPTS) {
    const start = Date.now()
    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        temperature: 0,
        system,
        messages: [{ role: 'user', content: user }],
      })

      console.log(
        JSON.stringify({
          event: 'claude_call',
          produktId,
          page_type: pageType,
          attempt,
          duration_ms: Date.now() - start,
        }),
      )

      const content = response.content[0]
      if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
      return content.text
    } catch (err: unknown) {
      const isRateLimit = (err as ClaudeError).status === 429
      if (isRateLimit && attempt < MAX_ATTEMPTS - 1) {
        // Exponential backoff: 1s, 2s before each retry
        await new Promise<void>(r => setTimeout(r, Math.pow(2, attempt) * 1000))
        attempt++
        continue
      }
      // Attach attempt count to the error so callers can record it in PageTypeError.
      throw Object.assign(err as object, { attempt_count: attempt + 1 })
    }
  }

  throw Object.assign(new Error('Max retries exceeded'), { attempt_count: MAX_ATTEMPTS })
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

// The fixed set of ratgeber article slugs generated per product when no topic is given.
// Each becomes its own row in generierter_content with page_type = 'ratgeber'.
const RATGEBER_SLUGS = [
  'was-ist-sterbegeld',
  'fuer-wen',
  'kosten-leistungen',
] as const

// Orchestrate all Claude content generation calls for a product.
// Fetches product data, composes prompts, calls Claude for each page type,
// validates the response JSON, and upserts rows to generierter_content.
//
// When an optional `topic` string is provided, only a single ratgeber article
// is generated for that topic — all other page types are skipped.
//
// This function NEVER throws — all errors are collected in the returned
// GenerationResult.failed array so callers can surface partial failures.
export async function generateContent(
  produktId: string,
  topic?: string,
): Promise<GenerationResult> {
  const success: PageTypeResult[] = []
  const failed: PageTypeError[] = []

  try {
    const supabase = createAdminClient()

    // Fetch product and config rows (separate queries — Supabase JS v2 pattern)
    const { data: produkt } = await supabase
      .from('produkte')
      .select('id, name, typ, slug')
      .eq('id', produktId)
      .single()

    if (!produkt) {
      return {
        success: [],
        failed: [{ page_type: 'hauptseite', error_message: 'Product not found', attempt_count: 0 }],
      }
    }

    const { data: config } = await supabase
      .from('produkt_config')
      .select('zielgruppe, fokus, anbieter, argumente')
      .eq('produkt_id', produktId)
      .single()

    // Fetch all wissensfundus rows matching the product type
    const { data: wissensRows } = await supabase
      .from('wissensfundus')
      .select('thema, inhalt, tags')
      .eq('kategorie', produkt.typ)

    const wissensfundusRows: WissensfundusRow[] = wissensRows ?? []
    const produktConfigTags: string[] = config?.zielgruppe ?? []

    // Instantiate Anthropic client per-call (consistent with Supabase server pattern)
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Assemble the shared context layers once — reused across all page-type calls.
    // argumente is a jsonb column typed as Json; cast it to Record<string, string> for the prompt.
    const wissensfundus = buildWissensfundusBlock(wissensfundusRows, produktConfigTags)
    const produktDna = buildProduktDnaBlock(
      { name: produkt.name, typ: produkt.typ },
      {
        anbieter: config?.anbieter,
        argumente: castArgumenteToRecord(config?.argumente),
      },
    )
    const vertriebssteuerung = buildVertriebssteuerungBlock(config ?? {})
    const layers = { wissensfundus, produktDna, vertriebssteuerung }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://leadmonster.de'

    // -------------------------------------------------------------------------
    // Single ratgeber generation — when a topic is provided, skip all other types
    // -------------------------------------------------------------------------
    if (topic !== undefined && topic.trim().length > 0) {
      const ratgeberSlug = topic.trim()
      try {
        const { system, user } = composePrompt('ratgeber', layers)
        const raw = await callClaudeWithRetry(client, system, user, 'ratgeber', produktId)
        const parsed = JSON.parse(raw) as Json
        const validated = PageResponseSchemas.ratgeber.parse(parsed)

        const canonicalUrl = `${baseUrl}/${produkt.slug}/ratgeber/${ratgeberSlug}`
        const schemaMarkup = buildSchemaMarkup('ratgeber', { canonicalUrl })

        const { data: row } = await supabase
          .from('generierter_content')
          .upsert(
            {
              produkt_id: produktId,
              page_type: 'ratgeber',
              slug: ratgeberSlug,
              meta_title: (validated as { meta_title: string }).meta_title,
              meta_desc: (validated as { meta_desc: string }).meta_desc,
              content: validated as unknown as Json,
              schema_markup: schemaMarkup as unknown as Json,
              status: 'entwurf',
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'produkt_id,page_type,slug' },
          )
          .select('id')
          .single()

        if (row) {
          success.push({ page_type: 'ratgeber', slug: ratgeberSlug, rowId: row.id })
        }
      } catch (err: unknown) {
        failed.push({
          page_type: 'ratgeber',
          slug: ratgeberSlug,
          error_message: err instanceof Error ? err.message : String(err),
          attempt_count: (err as ClaudeError).attempt_count ?? 1,
        })
      }

      return { success, failed }
    }

    // -------------------------------------------------------------------------
    // Sequential page-type calls: hauptseite → faq → vergleich → tarif
    // -------------------------------------------------------------------------
    const pageTypes: PageType[] = ['hauptseite', 'faq', 'vergleich', 'tarif']

    for (const pageType of pageTypes) {
      try {
        const { system, user } = composePrompt(pageType, layers)
        const raw = await callClaudeWithRetry(client, system, user, pageType, produktId)
        const parsed = JSON.parse(raw) as Json
        const schema = PageResponseSchemas[pageType]
        const validated = schema.parse(parsed)

        const canonicalUrl = `${baseUrl}/${produkt.slug}${pageType !== 'hauptseite' ? '/' + pageType : ''}`
        const schemaMarkup = buildSchemaMarkup(pageType, {
          canonicalUrl,
          produktName: produkt.name,
        })

        const { data: row } = await supabase
          .from('generierter_content')
          .upsert(
            {
              produkt_id: produktId,
              page_type: pageType,
              slug: pageType,
              title:
                (validated as { sections?: Array<{ headline?: string }> }).sections?.[0]
                  ?.headline ?? produkt.name,
              meta_title: (validated as { meta_title: string }).meta_title,
              meta_desc: (validated as { meta_desc: string }).meta_desc,
              content: validated as unknown as Json,
              schema_markup: schemaMarkup as unknown as Json,
              status: 'entwurf',
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'produkt_id,page_type,slug' },
          )
          .select('id')
          .single()

        if (row) {
          success.push({ page_type: pageType, slug: pageType, rowId: row.id })
        }
      } catch (err: unknown) {
        failed.push({
          page_type: pageType,
          error_message: err instanceof Error ? err.message : String(err),
          attempt_count: (err as ClaudeError).attempt_count ?? 1,
        })
      }
    }

    // -------------------------------------------------------------------------
    // Three independent ratgeber sub-calls — each failure is isolated
    // -------------------------------------------------------------------------
    for (const ratgeberSlug of RATGEBER_SLUGS) {
      try {
        const { system, user } = composePrompt('ratgeber', layers)
        const raw = await callClaudeWithRetry(client, system, user, 'ratgeber', produktId)
        const parsed = JSON.parse(raw) as Json
        const validated = PageResponseSchemas.ratgeber.parse(parsed)

        const canonicalUrl = `${baseUrl}/${produkt.slug}/ratgeber/${ratgeberSlug}`
        const schemaMarkup = buildSchemaMarkup('ratgeber', { canonicalUrl })

        const { data: row } = await supabase
          .from('generierter_content')
          .upsert(
            {
              produkt_id: produktId,
              page_type: 'ratgeber',
              slug: ratgeberSlug,
              meta_title: (validated as { meta_title: string }).meta_title,
              meta_desc: (validated as { meta_desc: string }).meta_desc,
              content: validated as unknown as Json,
              schema_markup: schemaMarkup as unknown as Json,
              status: 'entwurf',
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'produkt_id,page_type,slug' },
          )
          .select('id')
          .single()

        if (row) {
          success.push({ page_type: 'ratgeber', slug: ratgeberSlug, rowId: row.id })
        }
      } catch (err: unknown) {
        failed.push({
          page_type: 'ratgeber',
          slug: ratgeberSlug,
          error_message: err instanceof Error ? err.message : String(err),
          attempt_count: (err as ClaudeError).attempt_count ?? 1,
        })
      }
    }
  } catch (err: unknown) {
    // Outer safety net — should never be reached if all inner paths are handled correctly
    failed.push({
      page_type: 'hauptseite',
      error_message: err instanceof Error ? err.message : 'Unknown error',
      attempt_count: 0,
    })
  }

  return { success, failed }
}
