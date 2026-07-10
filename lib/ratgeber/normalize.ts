import type { RatgeberSection } from '@/lib/types/ratgeber'
import { getCuratedCoverForSlug, isReusedProductHeroCover } from '@/lib/stock/curated-covers'

/** Legacy generator shape (type "ratgeber") before intro/body migration. */
interface LegacyRatgeberSection {
  type: 'ratgeber'
  slug?: string
  titel?: string
  intro?: string
  body_paragraphs?: string[]
  cta_text?: string
}

export interface RatgeberContentLike {
  sections?: unknown[]
  cover_image_url?: string | null
  cover_image_alt?: string | null
}

export interface RatgeberRowLike {
  slug?: string | null
  title?: string | null
  meta_desc?: string | null
  content?: RatgeberContentLike | null
}

const TITLE_BY_SLUG: Record<string, string> = {
  'was-ist-sterbegeld': 'Was ist eine Sterbegeldversicherung?',
  'fuer-wen': 'Für wen ist eine Sterbegeldversicherung sinnvoll?',
  'kosten-leistungen': 'Kosten und Leistungen der Sterbegeldversicherung',
  'warum-sinnvoll': 'Warum ist eine Sterbegeldversicherung sinnvoll?',
  anbietervergleich: 'Worauf sollten Sie beim Anbietervergleich achten?',
  'sterbegeld-mit-vorerkrankungen': 'Sterbegeld mit Vorerkrankungen',
  'sterbegeld-vs-bestattungsvorsorge': 'Sterbegeld vs. Bestattungsvorsorge — was passt zu mir?',
  'wie-hoch-versicherungssumme': 'Wie hoch sollte die Versicherungssumme sein?',
  'sterbegeld-fuer-beamte': 'Sterbegeld für Beamte',
  'sterbegeld-kuendigen': 'Sterbegeldversicherung kündigen — geht das?',
  'beerdigungskosten-2026': 'Beerdigungskosten 2026 im Überblick',
  'sterbegeld-steuerfrei': 'Ist Sterbegeld steuerfrei?',
  'sterbegeld-bei-suizid': 'Sterbegeld bei Suizid — was zahlt die Versicherung?',
  'sterbegeld-auszahlen-lassen': 'Sterbegeld auszahlen lassen — wie funktioniert das?',
  'sterbegeld-vs-risikolebensversicherung': 'Sterbegeld vs. Risikolebensversicherung',
  'sterbegeld-fuer-senioren-80plus': 'Sterbegeld für Senioren über 80',
  'sterbegeld-ohne-gesundheitsfragen': 'Sterbegeldversicherung ohne Gesundheitsfragen',
  'sterbegeld-vs-sparplan': 'Sterbegeld vs. Sparplan — was lohnt sich?',
  'sterbegeld-und-pflegezusatz': 'Sterbegeld + Pflegezusatzversicherung kombinieren',
  'sterbegeld-online-abschliessen': 'Sterbegeldversicherung online abschließen',
  'sterbegeld-wartezeit-umgehen': 'Wartezeit umgehen — geht das?',
  'sterbegeld-fuer-buergergeld-empfaenger': 'Sterbegeld für Bürgergeld-Empfänger',
  'sterbegeld-bei-scheidung': 'Was passiert mit dem Sterbegeld bei Scheidung?',
  'sterbegeld-als-erbe-steuerlich': 'Sterbegeld als Erbe — steuerliche Behandlung',
  'sterbegeld-mit-bestatter-treuhand-kombinieren':
    'Sterbegeld mit Bestatter-Treuhand kombinieren',
}

const HINT_BY_SLUG: Record<string, string> = {
  'sterbegeld-mit-vorerkrankungen': 'Aufnahmegarantie, Wartezeit, was zu beachten ist.',
  'sterbegeld-vs-bestattungsvorsorge': 'Vergleich beider Konzepte, Vor- und Nachteile.',
  'wie-hoch-versicherungssumme': 'Orientierung an realen Bestattungskosten 2026.',
  'sterbegeld-fuer-beamte': 'Besonderheit der Beamtenversorgung + ergänzende Privatpolice.',
  'sterbegeld-kuendigen': 'Rückkaufswert, Wartezeit-Anrechnung, Beitragsfreistellung.',
  'beerdigungskosten-2026': 'Sarg, Friedhof, Trauerfeier, Grabstein — reale Spannen.',
  'sterbegeld-steuerfrei': 'Erbschaftsteuer, Bezugsberechtigung, Freibeträge.',
  'sterbegeld-bei-suizid': 'Sensibles Thema, Karenzzeit, Klauseln, würdig formuliert.',
  'sterbegeld-auszahlen-lassen': 'Auszahlungsweg an Hinterbliebene, Fristen, benötigte Unterlagen.',
  'sterbegeld-vs-risikolebensversicherung': 'Wann welche, Kombination, Kostenrechnung.',
  'sterbegeld-fuer-senioren-80plus': 'Aufnahmealter, höhere Beiträge, Aufnahmegarantie.',
  'sterbegeld-ohne-gesundheitsfragen': 'Welche Anbieter, Wartezeit-Kompromiss, Sofortschutz Unfall.',
  'sterbegeld-vs-sparplan': 'Rendite, Auszahlungssicherheit, Verfügbarkeit.',
  'sterbegeld-und-pflegezusatz': 'Sinnvolle Bausteine für die Generation 60+, Konditionen.',
  'sterbegeld-online-abschliessen': 'Schritte, Antrag, digitale Beratung mit Christian Wimmer.',
  'sterbegeld-wartezeit-umgehen': 'Sofortschutz Unfall, Kombi-Tarife, transparente Aufklärung.',
  'sterbegeld-fuer-buergergeld-empfaenger': 'Schonvermögen, anrechenbares Vermögen, Praxis-Tipps.',
  'sterbegeld-bei-scheidung': 'Bezugsberechtigung ändern, Versorgungsausgleich.',
  'sterbegeld-als-erbe-steuerlich': 'Erbschaftsteuer-Konstellationen, Freibetrag.',
  'sterbegeld-mit-bestatter-treuhand-kombinieren':
    'Vor-/Nachteile, Liquiditäts-Sicherheit, Anbieter-Auswahl.',
  'warum-sinnvoll': 'Emotionale und finanzielle Gründe für Vorsorge ab 50.',
  anbietervergleich: 'Kriterien für Tarifvergleich, Wartezeit, Gesundheitsfragen.',
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function isLegacySection(section: unknown): section is LegacyRatgeberSection {
  return (
    typeof section === 'object' &&
    section !== null &&
    (section as { type?: string }).type === 'ratgeber'
  )
}

/** Convert legacy `{ type: "ratgeber" }` blocks to intro/body/cta sections. */
export function normalizeRatgeberSections(sections: unknown[] | undefined): RatgeberSection[] {
  if (!sections?.length) return []

  const out: RatgeberSection[] = []

  for (const section of sections) {
    if (isLegacySection(section)) {
      if (section.intro) {
        out.push({ type: 'intro', text: section.intro })
      }
      const paragraphs = section.body_paragraphs ?? []
      if (paragraphs.length > 0) {
        const mid = Math.ceil(paragraphs.length / 2)
        out.push({
          type: 'body',
          heading: section.titel ?? 'Hintergrund',
          paragraphs: paragraphs.slice(0, mid),
        })
        if (paragraphs.length > mid) {
          out.push({
            type: 'body',
            heading: 'Das sollten Sie wissen',
            paragraphs: paragraphs.slice(mid),
          })
        }
      }
      if (section.cta_text) {
        out.push({
          type: 'cta',
          headline: 'Persönliche Beratung',
          cta_text: section.cta_text,
          cta_anchor: '#formular',
        })
      }
      continue
    }

    out.push(section as RatgeberSection)
  }

  return out
}

/** Resolve display title from DB row, legacy section, or slug map. */
export function resolveRatgeberTitle(row: RatgeberRowLike): string {
  if (row.title?.trim()) return row.title.trim()

  const legacy = row.content?.sections?.find(isLegacySection)
  if (legacy?.titel?.trim()) return legacy.titel.trim()

  const slug = row.slug?.trim()
  if (slug && TITLE_BY_SLUG[slug]) return TITLE_BY_SLUG[slug]
  if (slug) return humanizeSlug(slug)

  return 'Ratgeber'
}

/** True when batch generator wrote generic was-ist content under a different slug. */
export function hasWrongLegacyContent(row: RatgeberRowLike): boolean {
  const slug = row.slug?.trim()
  if (!slug || slug === 'was-ist-sterbegeld') return false

  const legacy = row.content?.sections?.find(isLegacySection)
  if (!legacy) return false

  return legacy.slug === 'was-ist-sterbegeld' || legacy.titel?.includes('Was ist eine Sterbegeldversicherung') === true
}

export function getTitleForSlug(slug: string): string {
  return TITLE_BY_SLUG[slug] ?? humanizeSlug(slug)
}

export function getHintForSlug(slug: string): string {
  return HINT_BY_SLUG[slug] ?? ''
}

/** True when article lacks full pipeline sections or still has generic wrong copy. */
export function needsRatgeberPipelineRegeneration(row: RatgeberRowLike): boolean {
  const sections = normalizeRatgeberSections(row.content?.sections)
  if (sections.length < 8) return true

  const types = new Set(sections.map(s => s.type))
  if (!types.has('image_text') || !types.has('quote') || !types.has('info_box')) {
    return true
  }

  return sections.some(
    s =>
      s.type === 'body' &&
      typeof s.heading === 'string' &&
      s.heading.includes('Was ist eine Sterbegeldversicherung'),
  )
}

/** Only Supabase-hosted images are trusted from DB JSON — hotlinked Unsplash URLs go stale. */
export function isStoredCoverUrl(url: string | null | undefined): boolean {
  return isInternalImageUrl(url)
}

/** LeadMonster images are hosted on Supabase Storage — reject CDN hotlinks. */
export function isInternalImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  try {
    return new URL(url).hostname.includes('supabase.co')
  } catch {
    return false
  }
}

interface IntroImageSection {
  type: 'intro'
  image_url?: string | null
  image_alt?: string | null
}

function getIntroSectionImage(
  content: RatgeberContentLike | null | undefined,
): { cover_image_url: string; cover_image_alt: string | null } | null {
  const intro = content?.sections?.find(
    (s): s is IntroImageSection =>
      typeof s === 'object' && s !== null && (s as { type?: string }).type === 'intro',
  )
  const url = intro?.image_url?.trim()
  if (!url) return null
  return { cover_image_url: url, cover_image_alt: intro?.image_alt ?? null }
}

/**
 * Resolve cover for blog cards + ratgeber hero.
 * 1) Dedicated ratgeber cover in Supabase (not a reused product hero file)
 * 2) intro-Section image_url (post-processor / legacy generator)
 * 3) Curated Unsplash photo per slug (unique on /blog)
 * 4) Product hero as last resort
 */
export function resolveRatgeberCover(
  content: RatgeberContentLike | null | undefined,
  produktHero?: { hero_image_url: string | null; hero_image_alt: string | null } | null,
  slug?: string | null,
): { cover_image_url: string | null; cover_image_alt: string | null } {
  const cover = content?.cover_image_url
  const coverAlt = content?.cover_image_alt
  const heroUrl = produktHero?.hero_image_url

  if (
    isStoredCoverUrl(cover) &&
    !isReusedProductHeroCover(cover, heroUrl)
  ) {
    return { cover_image_url: cover!, cover_image_alt: coverAlt ?? null }
  }

  const introCover = getIntroSectionImage(content)
  if (
    introCover &&
    isStoredCoverUrl(introCover.cover_image_url) &&
    !isReusedProductHeroCover(introCover.cover_image_url, heroUrl)
  ) {
    return introCover
  }

  const curated = getCuratedCoverForSlug(slug)
  if (curated) {
    return curated
  }

  if (isInternalImageUrl(heroUrl)) {
    return {
      cover_image_url: heroUrl!,
      cover_image_alt: produktHero?.hero_image_alt ?? null,
    }
  }

  return { cover_image_url: null, cover_image_alt: null }
}

const RATGEBER_IMAGE_SECTION_TYPES = new Set(['intro', 'image_text'])

/**
 * Replace hotlinked Unsplash (or other external) section images with the curated
 * cover for this slug. Supabase-hosted images are kept — only CDN hotlinks go stale.
 */
export function sanitizeRatgeberSectionImages(
  slug: string | null | undefined,
  sections: RatgeberSection[],
): RatgeberSection[] {
  const curated = getCuratedCoverForSlug(slug)
  if (!curated) return sections

  return sections.map(section => {
    if (!RATGEBER_IMAGE_SECTION_TYPES.has(section.type)) return section
    if (section.type !== 'intro' && section.type !== 'image_text') return section
    const url = section.image_url
    if (!url?.trim() || isInternalImageUrl(url)) return section
    return {
      ...section,
      image_url: curated.cover_image_url,
      image_alt: section.image_alt?.trim() ? section.image_alt : curated.cover_image_alt,
    }
  })
}
