// Four-layer prompt composition for the AI content generation pipeline.
// Each layer adds a distinct context block; they are assembled into a single
// system + user message pair that is sent to the Anthropic Claude API.
import type { PageType } from './types'

export interface WissensfundusRow {
  thema: string
  inhalt: string
  tags: string[] | null
}

// System prompt constant — declares the Claude role, AEO rules, and brand tone.
// This remains constant across all page-type calls.
const SYSTEM_PROMPT = `Du bist ein erfahrener deutscher SEO-Texter spezialisiert auf Versicherungsprodukte.
Dein Ziel ist es, hochwertige, AEO-optimierte Inhalte zu erstellen, die sowohl in klassischen Suchmaschinen als auch in KI-gestützten Suchanfragen (ChatGPT, Perplexity, Gemini) gefunden werden.

AEO-Regeln:
- Jede Seite beginnt mit einer klaren 2-3 Satz Definition ("Was ist X?")
- FAQs formulieren wie echte Nutzerfragen; direkte Antwort im ersten Satz
- Alle Entitäten explizit nennen: Produktname, Anbieter, Zielgruppe
- Keine Marketing-Floskeln in Headings — direkte, informative H-Tags
- Premium-Ton, konsistent mit Nunito Sans / Roboto Design-System

Antworte ausschließlich mit gültigem JSON. Keine Markdown-Fences.`

// Layer 2: Build the Wissensfundus context block.
// Filters rows to those whose tags intersect with the product config tags,
// keeping prompt context concise and relevant.
export function buildWissensfundusBlock(
  rows: WissensfundusRow[],
  produktConfigTags: string[],
): string {
  const relevant = rows.filter(
    row =>
      !row.tags || row.tags.length === 0 || row.tags.some(tag => produktConfigTags.includes(tag)),
  )

  if (relevant.length === 0) return ''

  const blocks = relevant.map(r => `### ${r.thema}\n${r.inhalt}`).join('\n\n')
  return `## Wissensfundus\n\n${blocks}`
}

// Layer 3: Build the Produkt-DNA block.
// Includes product name, type, insurer list, and key selling points.
export function buildProduktDnaBlock(
  produkt: { name: string; typ: string },
  config: { anbieter?: string[] | null; argumente?: Record<string, string> | null },
): string {
  const anbieterList = (config.anbieter ?? []).join(', ')
  const argumente = Object.entries(config.argumente ?? {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  return [
    '## Produkt-DNA',
    '',
    `Produktname: ${produkt.name}`,
    `Produkttyp: ${produkt.typ}`,
    `Anbieter: ${anbieterList}`,
    '',
    'Key-Selling-Points:',
    argumente,
  ].join('\n')
}

// Layer 4: Build the Vertriebssteuerung block.
// Includes target audience and focus, instructing Claude to weight CTAs accordingly.
export function buildVertriebssteuerungBlock(
  config: { zielgruppe?: string[] | null; fokus?: string | null },
): string {
  const zielgruppe = (config.zielgruppe ?? []).join(', ')

  const fokusText =
    config.fokus === 'sicherheit'
      ? 'Sicherheit & Verlässlichkeit — CTA und Argumente auf Stabilität ausrichten'
      : config.fokus === 'preis'
        ? 'Bester Preis — Preis-Leistungs-Argumente in den Vordergrund'
        : 'Sofortschutz — Schnelligkeit und unkomplizierter Abschluss betonen'

  return `## Vertriebssteuerung\n\nZielgruppe: ${zielgruppe}\nFokus: ${fokusText}`
}

// Compose the full system + user message pair for a given page type.
// Combines all four layers and appends the JSON-only output instruction.
export function composePrompt(
  pageType: PageType,
  layers: { wissensfundus: string; produktDna: string; vertriebssteuerung: string },
): { system: string; user: string } {
  const userParts = [
    layers.wissensfundus,
    layers.produktDna,
    layers.vertriebssteuerung,
    `\nErstelle jetzt den ${pageType}-Inhalt. Antworte mit gültigem JSON only, keine Markdown-Fences, passend zum Output-Schema für diesen Seitentyp.`,
  ].filter(Boolean)

  return { system: SYSTEM_PROMPT, user: userParts.join('\n\n') }
}
