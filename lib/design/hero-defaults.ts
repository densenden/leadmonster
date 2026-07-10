import type { HeroSection } from '@/lib/types/content'

export const STERBEGELD_HERO_BENEFITS = [
  'Keine Gesundheitsfragen',
  'Günstig & hohes Leistungsniveau',
  'Sehr kurze Wartezeit',
  'Eintrittsalter 40–90 Jahre',
  'Persönlicher Ansprechpartner',
] as const

export const STERBEGELD_PRICE_FROM = '6,97€'
export const STERBEGELD_PRICE_LABEL = '6,97 €'

export interface MarkdownLink {
  label: string
  href: string
}

/** Pull `[label](href)` pairs from generator / auto-linker copy. */
export function extractMarkdownLinks(text: string): MarkdownLink[] {
  const links: MarkdownLink[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    links.push({ label: match[1], href: match[2] })
  }
  return links
}

/**
 * Emotional Vorsorge headline — keeps SEO links from DB (or sensible ratgeber defaults).
 */
export function buildSterbegeldHeroHeadline(
  produktSlug: string,
  dbHeadline?: string | null,
): string {
  const fromDb = extractMarkdownLinks(dbHeadline ?? '')
  const fallback: MarkdownLink[] = [
    {
      label: 'Sterbegeldversicherung',
      href: `/${produktSlug}/ratgeber/was-ist-sterbegeld`,
    },
    {
      label: 'Bestattungsvorsorge',
      href: `/${produktSlug}/ratgeber/was-ist-sterbegeld`,
    },
  ]

  const links =
    fromDb.length > 0
      ? fromDb
      : fallback

  const primary = links[0]
  const secondary = links[1]

  if (secondary) {
    return (
      `Vorsorge mit Herz — [${primary.label}](${primary.href}) ` +
      `und [${secondary.label}](${secondary.href}) für Ihre Liebsten`
    )
  }

  return (
    `Ein Akt der Fürsorge: [${primary.label}](${primary.href}) — ` +
    `heute Klarheit schaffen, morgen Ihre Familie entlasten`
  )
}

/** Replace outdated 9,99 € claims in hero/marketing copy with current floor price. */
export function normalizeSterbegeldPriceInText(text: string): string {
  return text
    .replace(/9[,.]99\s*€/gi, STERBEGELD_PRICE_LABEL)
    .replace(/ab\s+9[,.]99/gi, `ab ${STERBEGELD_PRICE_LABEL.replace(' €', '')}`)
}

/** Flyer copy for Sterbegeld homepage hero — merged with DB content when fields are missing. */
export function getSterbegeldHeroDefaults(produktSlug: string): Partial<HeroSection> {
  return {
    variant: 'inviting',
    headline: buildSterbegeldHeroHeadline(produktSlug),
    headline_accent: undefined,
    subline:
      'Damit Ihre Liebsten in einer schweren Zeit finanziell entlastet sind. Beitrag ab 6,97 € pro Monat — Sofortschutz bei Unfalltod ab Tag 1.',
    cta_text: 'Jetzt Beitrag berechnen',
    cta_anchor: `/${produktSlug}/tarife`,
    price_from: STERBEGELD_PRICE_FROM,
    benefits: [...STERBEGELD_HERO_BENEFITS],
  }
}

export function enrichHeroSection(
  section: HeroSection,
  produktTyp: string,
  produktSlug: string,
  adminHero?: { image_url?: string | null; image_alt?: string | null },
): HeroSection {
  if (produktTyp !== 'sterbegeld') {
    return {
      ...section,
      variant: section.variant ?? 'classic',
      image_url: section.image_url ?? adminHero?.image_url ?? null,
      image_alt: section.image_alt ?? adminHero?.image_alt ?? null,
    }
  }

  const defaults = getSterbegeldHeroDefaults(produktSlug)
  const emotionalHeadline = buildSterbegeldHeroHeadline(produktSlug, section.headline)
  const imageUrl = section.image_url ?? adminHero?.image_url ?? null
  const imageAlt = section.image_alt ?? adminHero?.image_alt ?? null

  return {
    ...defaults,
    ...section,
    headline: emotionalHeadline,
    variant: section.variant ?? defaults.variant ?? 'inviting',
    subline: normalizeSterbegeldPriceInText(
      section.subline?.trim() ? section.subline : (defaults.subline ?? ''),
    ),
    benefits: section.benefits?.length ? section.benefits : defaults.benefits,
    price_from: section.price_from ?? defaults.price_from,
    headline_accent:
      section.headline_accent !== undefined ? section.headline_accent : undefined,
    cta_text: section.cta_text?.trim() || defaults.cta_text || 'Jetzt Beitrag berechnen',
    cta_anchor: defaults.cta_anchor ?? `/${produktSlug}/tarife`,
    image_url: imageUrl,
    image_alt: imageAlt,
  }
}
