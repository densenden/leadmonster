// Schema.org/Organization-Builder — zentrale Definition.
// Wird von schema-person.ts (Person.worksFor), schema.ts (Article.publisher)
// und allen anderen Stellen verwendet, die einen kanonischen Org-Knoten brauchen.
//
// Brand-Strategie (siehe docs/content-strategie-nischen-anbieter.md § 8):
//   - `name` = Brand-Name unter dem die Site auftritt
//   - `legalName` = juristische Trägerin (finanzteam26 GmbH & Co. KG)
//   - `url` = primäre Brand-URL (sterbegeld24plus.de)
//   - `sameAs` enthält die Corporate-Domain finanzteam26.de

export const LEGAL_NAME = 'finanzteam26 GmbH & Co. KG'
export const CORPORATE_URL = 'https://finanzteam26.de'
export const DEFAULT_BASE_URL = 'https://www.sterbegeld24plus.de'

// Root-Produkt: das Produkt, dessen Hauptseite unter `/` (nicht `/<slug>`) lebt.
// Siehe docs/content-strategie-nischen-anbieter.md § 8 — Single-Domain-Strategie.
// Wird in app/page.tsx, app/sitemap.ts, next.config.mjs (Redirect) und der
// Schema-Canonical-Logik referenziert.
export const ROOT_PRODUKT_SLUG = 'sterbegeld24plus'

// Resolve a canonical https-Origin from an optional `domain` field, the
// `NEXT_PUBLIC_BASE_URL` env var, or a hard-coded fallback. Robust against:
//   - `domain`-Spalte ohne https-Prefix (z. B. 'sterbegeld24plus.de')
//   - env-Wert mit https-Prefix (z. B. 'https://www.sterbegeld24plus.de')
//   - leere oder fehlende Werte
//   - trailing slashes
function isVercelHost(raw: string): boolean {
  const host = raw.replace(/^https?:\/\//, '').split('/')[0]?.split(':')[0]?.toLowerCase() ?? ''
  return host === 'vercel.app' || host.endsWith('.vercel.app')
}

export function resolveBaseUrl(domain?: string | null): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL
  const candidates = [domain, env, DEFAULT_BASE_URL]
  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    const raw = trimmed.replace(/\/+$/, '')
    const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
    // Customer links must use the public site. A *.vercel.app value is not that site.
    if (isVercelHost(withProto)) continue
    return withProto
  }
  return DEFAULT_BASE_URL
}

export interface Organization {
  '@type': 'Organization'
  name: string
  legalName: string
  url: string
  sameAs?: string[]
}

export function buildOrganization(baseUrl: string): Organization {
  return {
    '@type': 'Organization',
    name: LEGAL_NAME,
    legalName: LEGAL_NAME,
    url: baseUrl,
    sameAs: [CORPORATE_URL],
  }
}
