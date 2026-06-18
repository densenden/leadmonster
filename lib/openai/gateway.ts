/**
 * Vercel AI Gateway Adapter.
 *
 * Routet OpenAI-API-Calls (Chat-Completions + Images) durch das Vercel
 * AI Gateway, falls `AI_GATEWAY_API_KEY` gesetzt ist. Sonst direkter
 * OpenAI-Call mit `OPENAI_API_KEY` (Legacy-Pfad).
 */
const VERCEL_AI_GATEWAY_BASE = 'https://ai-gateway.vercel.sh/v1'
const OPENAI_BASE = 'https://api.openai.com/v1'

export interface AiRoute {
  chatUrl: string
  imagesUrl: string
  apiKey: string
  viaGateway: boolean
  prefixModel: (model: string) => string
}

export function buildOpenAiRoute(opts: {
  gatewayKey?: string | null
  openaiKey?: string | null
}): AiRoute {
  const gatewayKey = opts.gatewayKey?.trim()
  if (gatewayKey && gatewayKey.length >= 8) {
    return {
      chatUrl: `${VERCEL_AI_GATEWAY_BASE}/chat/completions`,
      imagesUrl: `${VERCEL_AI_GATEWAY_BASE}/images/generations`,
      apiKey: gatewayKey,
      viaGateway: true,
      prefixModel: (model) => (model.includes('/') ? model : `openai/${model}`),
    }
  }

  const openaiKey = opts.openaiKey?.trim()
  if (openaiKey && openaiKey.length >= 8) {
    return {
      chatUrl: `${OPENAI_BASE}/chat/completions`,
      imagesUrl: `${OPENAI_BASE}/images/generations`,
      apiKey: openaiKey,
      viaGateway: false,
      prefixModel: (model) =>
        model.startsWith('openai/') ? model.replace(/^openai\//, '') : model,
    }
  }

  throw new Error(
    'Weder AI_GATEWAY_API_KEY noch OPENAI_API_KEY verfügbar — bitte in Einstellungen oder .env setzen.',
  )
}

/** Sync route — env vars only (no DB). Prefer getOpenAiRouteResolved() in server code. */
export function getOpenAiRoute(): AiRoute {
  return buildOpenAiRoute({
    gatewayKey: process.env.AI_GATEWAY_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
  })
}
