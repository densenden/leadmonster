// Pure prompt-building helpers for the product hero image.
// Safe to import from both Server and Client Components — no Node/Supabase deps.

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
}

const TYP_SCENES: Record<string, string> = {
  sterbegeld:
    'a calm outdoor park bench scene in golden German afternoon light, dignified end-of-life planning context',
  pflege:
    'a bright modern German home with a caring nurse helping a senior, warm hopeful atmosphere',
  leben:
    'a young German family in front of their house, sunset light, protective composition',
  bu:
    'a focused craftsperson or office worker in a German workplace, soft window light, sense of resilience and competence',
  unfall:
    'a safe German residential street with a family on bicycles, calm protective atmosphere, soft daylight',
}

const ZIELGRUPPE_PHRASES: Record<string, string> = {
  senioren_50plus: 'Germans aged 50 and above',
  familien: 'a German family with children',
  alleinstehende: 'a single German adult',
  paare: 'a German couple',
  berufstaetige: 'working-age German professionals',
}

const FOKUS_MOOD: Record<string, string> = {
  sicherheit: 'reassuring, dignified and trustworthy mood',
  preis: 'approachable, friendly and accessible mood',
  sofortschutz: 'decisive, energetic mood with a sense of immediate protection',
}

function joinList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function defaultHeroPrompt(produktTyp: string): string {
  const scene = TYP_SCENES[produktTyp] ?? TYP_SCENES.sterbegeld
  return `Photographic editorial scene: ${scene}. No clearly visible faces, no text overlays.`
}

export function buildHeroPrompt(
  produktTyp: string,
  opts: HeroPromptOptions = {},
): string {
  const scene = TYP_SCENES[produktTyp] ?? TYP_SCENES.sterbegeld

  const subjectPhrases = (opts.zielgruppe ?? [])
    .map(z => ZIELGRUPPE_PHRASES[z])
    .filter((p): p is string => Boolean(p))
  const subject = subjectPhrases.length > 0 ? joinList(subjectPhrases) : null

  const mood = opts.fokus ? FOKUS_MOOD[opts.fokus] : null

  const parts: string[] = [
    `Photographic editorial scene: ${scene}.`,
  ]
  if (subject) parts.push(`Main subject: ${subject}.`)
  if (mood) parts.push(`Tone: ${mood}.`)

  const argKeys = Object.keys(opts.argumente ?? {}).slice(0, 3)
  if (argKeys.length > 0) {
    parts.push(`Visual cues for: ${argKeys.join(', ')}.`)
  }

  // Note: anbieter (Allianz, DELA, etc.) deliberately NOT added to the prompt —
  // brand logos in AI imagery cause licensing and visual-quality issues.

  parts.push('No clearly visible faces, no text overlays, no brand logos.')
  return parts.join(' ')
}
