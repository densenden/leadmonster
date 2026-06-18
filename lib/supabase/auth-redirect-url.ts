const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `https://${trimmed}`
}

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase())
}

function isHttpUrl(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:'
}

function toUrlOrNull(raw?: string | null): URL | null {
  if (!raw?.trim()) {
    return null
  }

  try {
    const value = raw.trim()
    const parsed = new URL(
      value.startsWith('http://') || value.startsWith('https://')
        ? value
        : normalizeBaseUrl(value)
    )
    if (!isHttpUrl(parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function canUseInCurrentEnv(candidate: URL, nodeEnv: string | undefined): boolean {
  if (nodeEnv !== 'production') {
    return true
  }
  return !isLocalHost(candidate.hostname)
}

type RedirectUrlOptions = {
  requestOrigin?: string | null
  vercelUrl?: string | null
  nodeEnv?: string
}

/**
 * Build a stable redirect target for Supabase auth emails.
 * In production we never allow localhost, because that creates broken email links.
 */
export function getSupabaseEmailRedirectUrl(path = '/admin/login', options: RedirectUrlOptions = {}): string {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  const candidates = [
    toUrlOrNull(options.requestOrigin),
    toUrlOrNull(options.vercelUrl ?? process.env.VERCEL_URL),
    toUrlOrNull(process.env.NEXT_PUBLIC_BASE_URL),
  ].filter((value): value is URL => Boolean(value))

  for (const candidate of candidates) {
    if (canUseInCurrentEnv(candidate, nodeEnv)) {
      return new URL(path, candidate).toString()
    }
  }

  if (nodeEnv === 'production') {
    throw new Error(
      'Supabase auth redirect base URL is missing or invalid in production. Set NEXT_PUBLIC_BASE_URL or provide a valid request origin/VERCEL_URL.'
    )
  }

  return new URL(path, 'http://localhost:3000').toString()
}
