/**
 * Vercel AI Gateway Adapter.
 *
 * Routet OpenAI-API-Calls (Chat-Completions + Images) durch das Vercel
 * AI Gateway, falls `AI_GATEWAY_API_KEY` gesetzt ist. Sonst direkter
 * OpenAI-Call mit `OPENAI_API_KEY` (Legacy-Pfad).
 *
 * Vorteil Gateway: Kosten-Tracking pro Projekt, einheitlicher Bearer-Key,
 * Provider-Abstraktion (zukünftige Anthropic-Bilder o. Ä. ohne Code-Change).
 *
 * Aktive Route wird zur Laufzeit ermittelt — keine Env-Branches im
 * Aufrufer-Code. `getOpenAiRoute()` liefert das URL-Trio (chat, images,
 * model-prefix) + Bearer-Token.
 *
 * Gateway-URL-Schema (OpenAI-kompatibel):
 *   https://ai-gateway.vercel.sh/v1/chat/completions
 *   https://ai-gateway.vercel.sh/v1/images/generations
 *
 * Model-Namen brauchen Provider-Prefix im Gateway, z. B. `openai/gpt-4o-mini`
 * oder `openai/gpt-image-1`. Wir mappen das in `prefixModel()`.
 */

const VERCEL_AI_GATEWAY_BASE = 'https://ai-gateway.vercel.sh/v1'
const OPENAI_BASE = 'https://api.openai.com/v1'

export interface AiRoute {
  chatUrl: string
  imagesUrl: string
  apiKey: string
  /** true = Calls laufen durch Vercel-Gateway; false = direkt OpenAI. */
  viaGateway: boolean
  /** Bei Gateway-Routes brauchen Modelle ein `openai/`-Prefix. */
  prefixModel: (model: string) => string
}

/**
 * Liefert die aktive Route. Wirft, wenn weder Gateway- noch OpenAI-Key
 * verfügbar ist — der Aufrufer kann dann auf Stock-Fallback umschalten.
 */
export function getOpenAiRoute(): AiRoute {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (gatewayKey) {
    return {
      chatUrl: `${VERCEL_AI_GATEWAY_BASE}/chat/completions`,
      imagesUrl: `${VERCEL_AI_GATEWAY_BASE}/images/generations`,
      apiKey: gatewayKey,
      viaGateway: true,
      prefixModel: (model) =>
        model.includes('/') ? model : `openai/${model}`,
    }
  }

  if (openaiKey) {
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
    'Weder AI_GATEWAY_API_KEY noch OPENAI_API_KEY in .env gesetzt — kein AI-Provider verfügbar.',
  )
}
