/**
 * Schema.org/Person-Builder für Autoren-Profile.
 * Wird beim Save in der Admin-UI, beim Seed, und vor jedem Render auf
 * /redaktion/<slug> aufgerufen und in `redaktion.schema_person` (jsonb) persistiert.
 *
 * Server- + edge-safe (kein Node-Built-in dependency).
 */

export interface RedaktionForSchema {
  slug: string
  vorname: string
  nachname: string
  titel?: string | null
  rolle: string
  kurz_bio: string
  expertise?: string[] | null
  qualifikationen?: string[] | null
  vermittlerregister_nr?: string | null
  ihk_kammer?: string | null
  paragraph_34d?: string | null
  jahre_erfahrung?: number | null
  foto_url?: string | null
  email?: string | null
  telefon?: string | null
  linkedin_url?: string | null
  xing_url?: string | null
  website_url?: string | null
}

const FT26_ORG = {
  '@type': 'Organization' as const,
  name: 'finanzteam26 GmbH & Co. KG',
  url: 'https://finanzteam26.de',
}

function absoluteUrl(value: string | null | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`
}

export function buildSchemaPerson(p: RedaktionForSchema, baseUrl: string) {
  const sameAs = [p.linkedin_url, p.xing_url, p.website_url].filter(Boolean) as string[]

  const credentials = [
    ...(p.qualifikationen ?? []).map(name => ({
      '@type': 'EducationalOccupationalCredential' as const,
      name,
    })),
    ...(p.vermittlerregister_nr
      ? [{
          '@type': 'EducationalOccupationalCredential' as const,
          name: `Vermittlerregister Nr. ${p.vermittlerregister_nr}`,
          recognizedBy: p.ihk_kammer ? { '@type': 'Organization', name: p.ihk_kammer } : undefined,
        }]
      : []),
  ]

  const fullName = [p.titel, p.vorname, p.nachname].filter(Boolean).join(' ')

  return {
    '@context': 'https://schema.org' as const,
    '@type': 'Person' as const,
    '@id': `${baseUrl}/redaktion/${p.slug}#person`,
    name: fullName,
    givenName: p.vorname,
    familyName: p.nachname,
    honorificPrefix: p.titel ?? undefined,
    jobTitle: p.rolle,
    description: p.kurz_bio,
    image: absoluteUrl(p.foto_url, baseUrl),
    url: `${baseUrl}/redaktion/${p.slug}`,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    knowsAbout: p.expertise && p.expertise.length > 0 ? p.expertise : undefined,
    hasCredential: credentials.length > 0 ? credentials : undefined,
    worksFor: FT26_ORG,
    email: p.email ?? undefined,
    telephone: p.telefon ?? undefined,
  }
}

/**
 * Helper für Inline-Author-References in Article-/Blog-/FAQ-Schemas.
 * Schreibt `{ "@id": "...redaktion/<slug>#person" }` — die volle Person
 * wird genau einmal pro Page (im AuthorByline-Component) gerendert.
 */
export function buildAuthorRef(slug: string, baseUrl: string) {
  return { '@id': `${baseUrl}/redaktion/${slug}#person` }
}
