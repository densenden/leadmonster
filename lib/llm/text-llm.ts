/**
 * Text-LLM provider abstraction.
 *
 * One async function `callTextLLM()` works for both Anthropic and OpenAI.
 * Provider + model are resolved from the einstellungen table at request time
 * (see `resolveLLMConfig()`); fallbacks read from env, then to the cheapest
 * known model per provider.
 *
 * The abstraction expects the prompt to ask for raw JSON output. Both
 * providers return a string that the caller parses + Zod-validates.
 *
 * Exit-velocity choice: not using OpenAI structured outputs (json_schema)
 * — keeping the prompt-shaped JSON contract identical for both backends so
 * we can swap without touching the prompts.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/server'
import { LLM_OPTIONS, DEFAULT_LLM, type LLMProvider } from './options'

// Re-export for callers that already imported these from this file.
export { LLM_OPTIONS, DEFAULT_LLM, type LLMProvider } from './options'
export type { LLMOption } from './options'

// ─── Config Resolution ─────────────────────────────────────────────────────

export interface ResolvedLLMConfig {
  provider: LLMProvider
  model: string
}

/**
 * Resolve provider+model from einstellungen table → env fallback → DEFAULT_LLM.
 * Validates that the resolved option exists in the catalog; otherwise falls
 * back to default rather than calling an unknown model.
 */
export async function resolveLLMConfig(): Promise<ResolvedLLMConfig> {
  let provider: string | undefined
  let model: string | undefined

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('einstellungen')
      .select('schluessel,wert')
      .in('schluessel', ['ai_text_provider', 'ai_text_model'])

    for (const row of data ?? []) {
      if (row.schluessel === 'ai_text_provider' && row.wert) provider = row.wert
      if (row.schluessel === 'ai_text_model' && row.wert) model = row.wert
    }
  } catch {
    // DB unavailable — fall through to env / default
  }

  // Env override
  provider = provider || process.env.AI_TEXT_PROVIDER
  model = model || process.env.AI_TEXT_MODEL

  if (provider && model) {
    const match = LLM_OPTIONS.find(o => o.provider === provider && o.model === model)
    if (match) return { provider: match.provider, model: match.model }
  }

  return { provider: DEFAULT_LLM.provider, model: DEFAULT_LLM.model }
}

// ─── Call ──────────────────────────────────────────────────────────────────

export interface CallTextLLMParams {
  system: string
  user: string
  /** Hard cap on output tokens. */
  maxTokens?: number
  /** 0 = deterministic, higher = creative. Default 0 for content gen. */
  temperature?: number
  /** Override the resolved config — for tests or special routes. */
  override?: ResolvedLLMConfig
  /** Logging context. */
  logContext?: Record<string, unknown>
}

export interface ClaudeError extends Error {
  status?: number
  attempt_count?: number
}

/**
 * Calls the configured LLM and returns the raw text response with markdown
 * code-fences stripped. Caller is responsible for JSON-parsing + Zod validation.
 */
export async function callTextLLM({
  system,
  user,
  maxTokens = 4096,
  temperature = 0,
  override,
  logContext,
}: CallTextLLMParams): Promise<string> {
  const config = override ?? (await resolveLLMConfig())

  const start = Date.now()
  let raw: string

  try {
    if (config.provider === 'anthropic') {
      raw = await callAnthropic(system, user, config.model, maxTokens, temperature)
    } else {
      raw = await callOpenAI(system, user, config.model, maxTokens, temperature)
    }
  } catch (err) {
    console.error(JSON.stringify({
      event: 'llm_call_failed',
      provider: config.provider,
      model: config.model,
      duration_ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
      ...logContext,
    }))
    throw err
  }

  console.log(JSON.stringify({
    event: 'llm_call',
    provider: config.provider,
    model: config.model,
    duration_ms: Date.now() - start,
    response_len: raw.length,
    ...logContext,
  }))

  // Strip markdown code fences both providers occasionally wrap around JSON.
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

// ─── Anthropic backend ─────────────────────────────────────────────────────

async function callAnthropic(
  system: string,
  user: string,
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: user }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic')
  }
  return content.text
}

// ─── OpenAI backend ────────────────────────────────────────────────────────

async function callOpenAI(
  system: string,
  user: string,
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY missing')

  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })

  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('Empty response from OpenAI')
  return text
}
