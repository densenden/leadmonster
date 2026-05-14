// Pure prompt-building helpers for product hero AND section images.
// Safe to import from both Server and Client Components — no Node/Supabase deps.
//
// Storytelling-Update 2026-04-30:
//   - Mehr narrative Szenen statt Stock-Photography
//   - Strikte No-Faces-Regel (Hände, Objekte, Symbolik statt Porträts)
//   - Pro Produkttyp ein konsistenter Brand-Look (Farb-Palette + Lichtstimmung)
//   - Section-Variationen (Feature-Detail, Inline-Storytelling) leiten ab
//
// Diese Datei ist die Single Source of Truth für alle Prompt-Bausteine —
// section-prompt.ts importiert von hier, image-generator.ts kombiniert
// das Ergebnis mit STYLE_GUARD beim API-Call.

export type HeroPromptZielgruppe =
  | 'senioren_50plus'
  | 'familien'
  | 'alleinstehende'
  | 'paare'
  | 'berufstaetige'

export type HeroPromptFokus = 'sicherheit' | 'preis' | 'sofortschutz'

export interface HeroPromptOptions {
  zielgruppe?: string[] | null
  fokus?: string | null
  anbieter?: string[] | null
  argumente?: Record<string, string> | null
  /** Optionale, vom Style-Reference-Upload abgeleitete Stil-Direktive
   *  ("warm coloring, watercolor illustration"). Wird vom Caller per
   *  GPT-Vision aus dem Referenzbild extrahiert und hier reingereicht. */
  styleDescription?: string | null
}

// ---------------------------------------------------------------------------
// Brand-Looks pro Produkttyp — die Farb-Palette / Bildstimmung, die alle
// Bilder eines Produkts gemeinsam haben sollen. Ohne Style-Reference greift
// dieser Default. Pro Sektion variiert nur das Motiv, nicht der Look.
//
// Diese Konstanten dienen als **Hard-Fallback**. Seit Migration 20260504000000
// liegen Brand-Look + Scenes auch in `produkt_typen.image_brand_look` /
// `image_typ_scenes` und können vom Admin pro Versicherungsart editiert
// werden. Ein DB-getriebener Reader für hero-prompt ist für eine Folge-
// Iteration vorgesehen — bis dahin werden neue Versicherungsarten ohne
// Code-Eintrag automatisch auf Sterbegeld zurückfallen.
// ---------------------------------------------------------------------------

interface BrandLook {
  /** Atmosphäre + Farbpalette */
  palette: string
  /** Lichtstimmung */
  lighting: string
  /** Symbolische Bildelemente, die das Produkt-Thema ankern */
  motifs: string
}

const BRAND_LOOKS: Record<string, BrandLook> = {
  sterbegeld: {
    palette: 'soft sage green, warm cream, dusty beige',
    lighting: 'late golden afternoon light filtering through windows',
    motifs: 'open hands resting on letters, a single candle, an unfinished cup of tea, family photo frames seen from behind',
  },
  pflege: {
    palette: 'warm amber, terracotta, soft cream',
    lighting: 'morning sunlight in a sunlit kitchen or living room',
    motifs: 'helping hands placing a teacup, a freshly folded blanket, walking-aid silhouette near a window, plants on a windowsill',
  },
  leben: {
    palette: 'deep navy, soft sand, brushed gold accents',
    lighting: 'late summer sunset over a quiet residential street',
    motifs: 'an empty bicycle in front of a house, two coffee cups on a porch table, family keys in a wooden bowl, seedlings in a small pot',
  },
  bu: {
    palette: 'cool industrial blue-grey, warm tool-belt brown',
    lighting: 'overcast workshop daylight or focused desk lamp',
    motifs: 'callused hands holding a clipboard, an idle workbench with carefully laid-out tools, an empty office chair seen from above, a thermos and notebook',
  },
  unfall: {
    palette: 'soft sky blue, neutral grey, accent orange',
    lighting: 'crisp morning light after rain',
    motifs: 'children\'s bicycles on a quiet sidewalk, a helmet on a bench, hiking boots by an open door, a bandaged hand reaching for a coffee cup',
  },
}

// ---------------------------------------------------------------------------
// Sub-Mappings — bewusst zurückhaltend, gewinnen erst durch Storytelling
// ---------------------------------------------------------------------------

export const TYP_SCENES: Record<string, string> = {
  sterbegeld:
    'an intimate domestic German interior at golden hour — a kitchen table with an open envelope, soft sunlight on wooden surfaces — symbolic of dignified end-of-life planning',
  pflege:
    'a sunlit German home — a hand carefully placing a folded blanket on an armchair, an empty walking aid waiting nearby — symbolic of attentive care',
  leben:
    'a quiet German residential street at sunset — a family bicycle leaning against a hedge, glowing windows in the background — symbolic of protective love',
  bu:
    'a focused German workshop or office at end-of-day — a clipboard and tools resting on a clean workbench, single window light — symbolic of professional resilience',
  unfall:
    'a German residential courtyard after rain — bicycles, scooters, a fallen scarf on a bench — symbolic of safe everyday life',
}

export const ZIELGRUPPE_PHRASES: Record<string, string> = {
  senioren_50plus: 'people aged 50 and above (shown as hands, silhouettes or back-views, never frontal portraits)',
  familien: 'a German family (shown via objects, clothing details or back-views, never frontal portraits)',
  alleinstehende: 'a single adult (shown via hands, possessions or environment, never frontal portraits)',
  paare: 'a couple (shown via two coffee cups, two pairs of shoes, two hands, never frontal portraits)',
  berufstaetige: 'a working-age professional (shown via tools, workspace, hands at work, never frontal portraits)',
}

export const FOKUS_MOOD: Record<string, string> = {
  sicherheit: 'reassuring, dignified and trustworthy mood — quiet confidence',
  preis: 'approachable, friendly and accessible mood — warmth without luxury',
  sofortschutz: 'decisive but calm mood — readiness, not urgency',
}

export function joinList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function getBrandLook(produktTyp: string): BrandLook {
  return BRAND_LOOKS[produktTyp] ?? BRAND_LOOKS.sterbegeld
}

// ---------------------------------------------------------------------------
// Hero-Prompt
// ---------------------------------------------------------------------------

export function defaultHeroPrompt(produktTyp: string): string {
  const scene = TYP_SCENES[produktTyp] ?? TYP_SCENES.sterbegeld
  const look = getBrandLook(produktTyp)
  return `Editorial storytelling photography: ${scene}. Color palette: ${look.palette}. Lighting: ${look.lighting}. No visible faces, no text overlays.`
}

/**
 * Per-Produkttyp Negativ-Prompt-Motive — wenn eine Style-Reference greift,
 * sollen die Default-Motive aus BRAND_LOOKS NICHT mehr durchschlagen (z. B.
 * keine Trauerkerze, wenn eine Garten-Vorlage hochgeladen wurde).
 */
const TYP_NEGATIVE_MOTIFS: Record<string, string> = {
  sterbegeld: 'candles, lit flames, lily flowers, gravestones, urns, funeral wreaths, mourning veils',
  pflege: 'hospital beds, medical equipment, walking frames, clinical interiors',
  leben: 'wedding rings, gravestones, funeral imagery, hospital scenes',
  bu: 'wheelchairs, hospital scenes, crutches, medical bandages',
  unfall: 'ambulances, blood, severe injuries, hospital interiors',
}

export function buildHeroPrompt(
  produktTyp: string,
  opts: HeroPromptOptions = {},
): string {
  const scene = TYP_SCENES[produktTyp] ?? TYP_SCENES.sterbegeld
  const look = getBrandLook(produktTyp)
  const hasStyleRef =
    !!opts.styleDescription && opts.styleDescription.trim().length > 0

  const subjectPhrases = (opts.zielgruppe ?? [])
    .map(z => ZIELGRUPPE_PHRASES[z])
    .filter((p): p is string => Boolean(p))
  const subject = subjectPhrases.length > 0 ? joinList(subjectPhrases) : null

  const mood = opts.fokus ? FOKUS_MOOD[opts.fokus] : null

  // STYLE-FIRST Strategie: Wenn eine Style-Reference vorliegt, dominiert sie
  // den Prompt-Anfang. LLMs gewichten Anfangs-Tokens stärker. Die Default-
  // Motive aus BRAND_LOOKS werden weggelassen und stattdessen das Subject
  // generisch beschrieben, damit der Style nicht überschrieben wird.
  const parts: string[] = []

  if (hasStyleRef) {
    parts.push(
      `VISUAL STYLE (primary direction, overrides defaults): ${opts.styleDescription!.trim()}.`,
    )
    parts.push(`SUBJECT: ${scene}.`)
    // Farb-Palette + Lighting nur als sanfte Sekundär-Hinweise — Style hat Vorrang.
    parts.push(`Secondary palette hint if compatible with style: ${look.palette}.`)
  } else {
    parts.push(`Editorial storytelling photography: ${scene}.`)
    parts.push(`Color palette: ${look.palette}.`)
    parts.push(`Lighting: ${look.lighting}.`)
    parts.push(`Symbolic objects (choose one or two, never all): ${look.motifs}.`)
  }

  if (subject) parts.push(`Implied subject: ${subject}.`)
  if (mood) parts.push(`Mood: ${mood}.`)

  const argKeys = Object.keys(opts.argumente ?? {}).slice(0, 3)
  if (argKeys.length > 0) {
    parts.push(`Story should evoke: ${argKeys.join(', ')}.`)
  }

  // Note: anbieter (Allianz, DELA, etc.) deliberately NOT added to the prompt —
  // brand logos in AI imagery cause licensing and visual-quality issues.

  // Negativ-Prompt: wenn Style-Ref aktiv, explizit gegen Default-Motive
  // dieses Produkttyps anschreiben.
  if (hasStyleRef && TYP_NEGATIVE_MOTIFS[produktTyp]) {
    parts.push(
      `Strictly avoid (unless explicitly part of the style reference): ${TYP_NEGATIVE_MOTIFS[produktTyp]}.`,
    )
  }

  parts.push(
    'Strict rules: no clearly visible human faces, no front-facing portraits, no text overlays, no brand logos, no UI mockups. Show humans only via hands, silhouettes, back-views or symbolic absence.',
  )
  return parts.join(' ')
}
