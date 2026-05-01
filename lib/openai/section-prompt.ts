// Section-image prompt builder — analogous to hero-prompt.ts but tuned for
// per-section visuals (feature cards, inline storytelling, blog covers,
// ratgeber heroes). Keeps the brand look (color palette, lighting) consistent
// with the product's hero image while varying the motif.
//
// All prompts are intentionally SUGGESTIVE, not directive — the user can
// edit the auto-prompt before submitting. Auto-prompts solve the "leerer
// Prompt"-Bug: previously SectionImagePanel started with an empty textarea,
// now it's pre-filled with a context-aware suggestion.
//
// Safe to import from both Server and Client Components — no runtime deps.

import {
  TYP_SCENES,
  ZIELGRUPPE_PHRASES,
  FOKUS_MOOD,
  joinList,
  getBrandLook,
} from './hero-prompt'

export type SectionType =
  | 'hero'
  | 'features'
  | 'feature_grid'
  | 'feature'
  | 'trust'
  | 'faq'
  | 'lead_form'
  | 'tarif'
  | 'tarif_rechner'
  | 'vergleich'
  | 'vergleichsrechner'
  | 'ratgeber'
  | 'intro'
  | 'body'
  | 'steps'
  | 'cta'
  | 'related'
  | 'blog_post'

export type SectionImageSlot = 'hero' | 'feature' | 'inline' | 'og' | 'blog_cover'

export interface SectionPromptOptions {
  /** Produkttyp — bestimmt Brand-Look + Default-Szene. */
  produktTyp: string
  /** Section-Type — bestimmt Motiv-Variation. */
  sectionType: SectionType | string
  /** Slot — bestimmt Aspect Ratio + Layout-Konvention. */
  slot: SectionImageSlot
  /** Optional: Section-spezifischer Hinweistext (z. B. Headline). Wenn gesetzt,
   *  fließt er als Story-Hook in den Prompt. */
  contextHint?: string
  /** Vom Style-Reference-Upload abgeleitete Stil-Direktive. */
  styleDescription?: string | null
  /** Übernommen aus produkt_config — gleiche Felder wie HeroPromptOptions. */
  zielgruppe?: string[] | null
  fokus?: string | null
  argumente?: Record<string, string> | null
}

// ---------------------------------------------------------------------------
// Slot-spezifische Composition-Direktiven
// ---------------------------------------------------------------------------

const SLOT_COMPOSITION: Record<SectionImageSlot, string> = {
  hero:
    'cinematic wide composition, room for headline overlay on the left third, depth-of-field blur in the background',
  blog_cover:
    'editorial wide composition with strong central focal point, leaving headline space at top or bottom',
  og:
    'centered composition that survives heavy cropping (1200×630), main subject in safe center 60%',
  feature:
    'tight square composition focused on a single object or detail, minimal background, clear silhouette',
  inline:
    'square or near-square mid-shot, story-fragment style — like a photograph in the middle of a magazine article',
}

// ---------------------------------------------------------------------------
// Section-spezifische Motiv-Variationen
// ---------------------------------------------------------------------------

/**
 * Pro Section-Type ein "Story-Beat", der den Brand-Look kontextualisiert.
 * Beispiel: features-Section → einzelnes Detail-Objekt, vergleich-Section
 * → zwei nebeneinander liegende Symbole, ratgeber-body → ein still-life
 * mit erzählerischer Komponente.
 */
const SECTION_BEATS: Record<string, string> = {
  // Hauptseite
  features:
    'a single iconic object or detail that represents one core benefit — placed on a clean surface',
  feature_grid:
    'a single iconic object or detail that represents one core benefit — placed on a clean surface',
  feature:
    'a single iconic object or detail that represents one core benefit — placed on a clean surface',
  trust:
    'a small, quiet still-life that suggests reliability — keys, a stamped envelope, a notebook',
  faq:
    'an overhead view of a notebook page with a pen and a coffee cup — calm, contemplative',

  // Vergleich
  vergleich:
    'two parallel objects side by side on a neutral surface — symbolic of weighing options',
  vergleichsrechner:
    'a calm desk scene with a calculator, an open envelope and a pen — soft afternoon light',

  // Tarif
  tarif:
    'a tidy desk with a magnifying glass, a price-list document, a single cup of coffee',
  tarif_rechner:
    'a tidy desk with a magnifying glass, a price-list document, a single cup of coffee',

  // Ratgeber
  ratgeber:
    'an editorial still-life that visually anchors the article topic, with one or two symbolic objects',
  intro:
    'an opening scene — an open book or letter, soft natural light, the moment before reading',
  body:
    'a mid-article still-life — a hand turning a page, an underlined paragraph in a brochure',
  steps:
    'a clean overhead flat-lay of three or four numbered objects in a row — symbolic of a sequence',
  cta:
    'a phone resting next to a steaming cup of coffee — a moment of decision, no screen content visible',
  related:
    'a small stack of magazine spreads partially overlapping — invitation to keep reading',

  // Blog
  blog_post:
    'an editorial still-life appropriate to the article subject, with strong storytelling composition',
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Baut einen Auto-Prompt für ein Section-Bild. Der Caller darf das Ergebnis
 * vor dem Generations-Aufruf verändern (UI-Editor in SectionImagePanel).
 */
export function buildSectionPrompt(opts: SectionPromptOptions): string {
  const look = getBrandLook(opts.produktTyp)
  const baseScene = TYP_SCENES[opts.produktTyp] ?? TYP_SCENES.sterbegeld
  const beat = SECTION_BEATS[opts.sectionType] ?? SECTION_BEATS.body
  const composition = SLOT_COMPOSITION[opts.slot] ?? SLOT_COMPOSITION.inline

  const subjectPhrases = (opts.zielgruppe ?? [])
    .map(z => ZIELGRUPPE_PHRASES[z])
    .filter((p): p is string => Boolean(p))
  const subject = subjectPhrases.length > 0 ? joinList(subjectPhrases) : null
  const mood = opts.fokus ? FOKUS_MOOD[opts.fokus] : null

  const parts: string[] = [
    `Editorial storytelling photograph for an insurance product page, ${opts.sectionType} section.`,
    `Story beat: ${beat}.`,
    `Brand-consistent setting (kept identical across all images of this product): ${baseScene}.`,
    `Color palette: ${look.palette}.`,
    `Lighting: ${look.lighting}.`,
    `Composition: ${composition}.`,
  ]

  if (opts.contextHint && opts.contextHint.trim().length > 0) {
    parts.push(`Specific topic: ${opts.contextHint.trim()}.`)
  }

  if (subject) parts.push(`Implied subject: ${subject}.`)
  if (mood) parts.push(`Mood: ${mood}.`)

  if (opts.styleDescription && opts.styleDescription.trim().length > 0) {
    parts.push(`Visual style direction (from product reference): ${opts.styleDescription.trim()}.`)
  }

  parts.push(
    'Strict rules: no clearly visible human faces, no front-facing portraits, no text overlays, no brand logos, no UI mockups. Show humans only via hands, silhouettes, back-views or symbolic absence.',
  )
  return parts.join(' ')
}

/** Convenience: Default-Slot pro SectionType — analog SectionImagePanel.defaultSlot(). */
export function defaultSlotForSection(sectionType: string): SectionImageSlot {
  if (sectionType === 'hero' || sectionType === 'intro') return 'hero'
  if (sectionType === 'features' || sectionType === 'feature_grid' || sectionType === 'feature') return 'feature'
  if (sectionType === 'blog_post') return 'blog_cover'
  return 'inline'
}
