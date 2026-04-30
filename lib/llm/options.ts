/**
 * Pure data — no server-only imports.
 * Safe to import from Client Components (Settings UI dropdown).
 *
 * Pricing notes (per 1M tokens, in/out, indicative as of 2026-04):
 *   - claude-haiku-4-5     ~ $1 / $5
 *   - claude-sonnet-4-6    ~ $3 / $15
 *   - claude-opus-4-7      ~ $15 / $75
 *   - gpt-4o-mini          ~ $0.15 / $0.60   ← cheapest reliable OpenAI
 *   - gpt-4o               ~ $2.50 / $10
 */

export type LLMProvider = 'anthropic' | 'openai'

export interface LLMOption {
  provider: LLMProvider
  model: string
  label: string
  /** Relative cost rank — higher = pricier. 1 = cheapest. */
  costRank: number
}

/** Curated catalog. UI dropdown reads this list. Add new models here only. */
export const LLM_OPTIONS: LLMOption[] = [
  { provider: 'openai',    model: 'gpt-4o-mini',                    label: 'OpenAI GPT-4o-mini (günstig)',          costRank: 1 },
  { provider: 'anthropic', model: 'claude-haiku-4-5-20251001',      label: 'Anthropic Claude Haiku 4.5',             costRank: 2 },
  { provider: 'openai',    model: 'gpt-4o',                         label: 'OpenAI GPT-4o (Standard)',               costRank: 3 },
  { provider: 'anthropic', model: 'claude-sonnet-4-6',              label: 'Anthropic Claude Sonnet 4.6',            costRank: 4 },
  { provider: 'anthropic', model: 'claude-opus-4-7',                label: 'Anthropic Claude Opus 4.7 (premium)',    costRank: 5 },
]

/** Cheapest option — used as default when no setting exists. */
export const DEFAULT_LLM: LLMOption = LLM_OPTIONS[0]
