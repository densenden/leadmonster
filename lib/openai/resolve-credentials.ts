/**
 * Resolve OpenAI / Gateway credentials: env first, then einstellungen.openai_api_key.
 * Image + vision routes use this so keys saved in Admin work without Vercel redeploy.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { buildOpenAiRoute, type AiRoute } from './gateway'

function envGatewayKey(): string | null {
  const k = process.env.AI_GATEWAY_API_KEY?.trim()
  return k && k.length >= 8 ? k : null
}

function envOpenAiKey(): string | null {
  const k = process.env.OPENAI_API_KEY?.trim()
  return k && k.length >= 8 ? k : null
}

/** Load openai_api_key from DB (plain text in einstellungen.wert). */
export async function loadOpenAiKeyFromDb(): Promise<string | null> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('einstellungen')
      .select('wert')
      .eq('schluessel', 'openai_api_key')
      .maybeSingle()
    const k = data?.wert?.trim()
    return k && k.length >= 8 ? k : null
  } catch {
    return null
  }
}

export async function resolveOpenAiApiKey(): Promise<string> {
  const gateway = envGatewayKey()
  if (gateway) return gateway

  const fromEnv = envOpenAiKey()
  if (fromEnv) return fromEnv

  const fromDb = await loadOpenAiKeyFromDb()
  if (fromDb) return fromDb

  throw new Error(
    'OpenAI API key missing. Set OPENAI_API_KEY in .env.local / Vercel, or save it under Admin → Einstellungen → Bildgenerierung.',
  )
}

/** Active route for images/chat — includes DB fallback for direct OpenAI. */
export async function getOpenAiRouteResolved(): Promise<AiRoute> {
  const gateway = envGatewayKey()
  if (gateway) return buildOpenAiRoute({ gatewayKey: gateway })

  const openaiKey = envOpenAiKey() ?? (await loadOpenAiKeyFromDb())
  if (openaiKey) return buildOpenAiRoute({ openaiKey })

  throw new Error(
    'Weder AI_GATEWAY_API_KEY noch OPENAI_API_KEY verfügbar — bitte in Einstellungen oder .env setzen.',
  )
}

export async function isOpenAiConfigured(): Promise<boolean> {
  if (envGatewayKey() || envOpenAiKey()) return true
  return Boolean(await loadOpenAiKeyFromDb())
}
