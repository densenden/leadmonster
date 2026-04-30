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

ZWINGENDE Output-Regeln (Validierungsfehler sonst):
- Antworte ausschließlich mit gültigem JSON. Keine Markdown-Fences.
- Top-Level-Keys sind IMMER: meta_title, meta_desc, schema_markup, sections
- Erlaubte section.type-Werte (NUR diese!): "hero" | "features" | "trust" | "faq" | "vergleich" | "ratgeber" | "tarif"
- Erfinde keine neuen type-Werte (nicht "intro", nicht "paragraph", nicht "feature" singular, nicht "trust_bar", etc.)`

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

// Pre-baked output-schema specs for each page-type — this is the contract
// the LLM MUST follow. Without injecting these explicitly, smaller models
// (Haiku, gpt-4o-mini) hallucinate top-level keys and fail Zod validation.
//
// Keep these strings tightly aligned with lib/anthropic/schemas.ts.
const OUTPUT_SCHEMAS: Record<PageType, string> = {
  hauptseite: `## Output-Schema (JSON) — STRENGE Mengen-Anforderungen!
{
  "meta_title": "string, max 60 Zeichen",
  "meta_desc":  "string, max 160 Zeichen",
  "schema_markup": { "@context": "https://schema.org", "@type": "InsuranceAgency", ...weitere Felder },
  "sections": [
    { "type": "hero",     "headline": "string", "subline": "string", "cta_text": "string", "cta_anchor": "#formular" },
    { "type": "features", "items": [ { "icon": "shield", "title": "string", "text": "string" }, ... GENAU 4 BIS 6 ITEMS ] },
    { "type": "trust",    "stat_items": [ { "label": "string", "value": "string" }, ... GENAU 3 BIS 6 ITEMS ] },
    { "type": "faq",      "items": [ { "frage": "string", "antwort": "string" }, ... GENAU 8 BIS 15 ITEMS ] }
  ]
}

WICHTIG: features.items braucht 4-6 Einträge, trust.stat_items braucht 3-6, faq.items braucht 8-15. Weniger = Validierungsfehler.`,
  faq: `## Output-Schema (JSON) — STRENGE Mengen!
{
  "meta_title": "string, max 60",
  "meta_desc":  "string, max 160",
  "schema_markup": { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [...] },
  "sections": [
    { "type": "faq", "items": [ { "frage": "string (Frage wie Nutzer sie stellt)", "antwort": "string (direkte Antwort, 1. Satz = Kernantwort)" }, ... GENAU 8 BIS 15 ITEMS ] }
  ]
}

WICHTIG: faq.items MUSS 8-15 Einträge enthalten. Weniger als 8 = Fehler.`,
  vergleich: `## Output-Schema (JSON) — STRENGE Mengen!
{
  "meta_title": "string, max 60",
  "meta_desc":  "string, max 160",
  "schema_markup": { "@context": "https://schema.org", "@type": "ItemList", ... },
  "sections": [
    {
      "type": "vergleich",
      "anbieter": [
        {
          "name": "string (z.B. AXA)",
          "wartezeit": "string (z.B. 'Keine bei Unfalltod' oder '6 Monate')",
          "gesundheitsfragen": "string ('Ja' | 'Nein' | 'Vereinfacht')",
          "garantierte_aufnahme": true,
          "beitrag_beispiel": "string (z.B. 'ab 23 €/Monat')",
          "besonderheit": "string (kurzer USP)"
        }
      ]
    }
  ]
}

WICHTIG: anbieter MUSS 3-10 Einträge enthalten. Weniger als 3 = Fehler.`,
  tarif: `## Output-Schema (JSON) — STRENGE Mengen!
{
  "meta_title": "string, max 60",
  "meta_desc":  "string, max 160",
  "schema_markup": { "@context": "https://schema.org", "@type": "Product", ... },
  "sections": [
    {
      "type": "tarif",
      "alters_stufen": [
        { "von": 40, "bis": 49, "beitrag_ab": 12.5, "beitrag_bis": 18.9 },
        { "von": 50, "bis": 59, "beitrag_ab": 18.9, "beitrag_bis": 26.5 },
        { "von": 60, "bis": 69, "beitrag_ab": 26.5, "beitrag_bis": 38.0 },
        { "von": 70, "bis": 79, "beitrag_ab": 38.0, "beitrag_bis": 52.0 }
      ],
      "disclaimer": "string (Hinweis dass es sich um Beispielbeiträge handelt)"
    }
  ]
}

WICHTIG: type MUSS exakt "tarif" sein. alters_stufen sind Objekte mit den 4 numerischen Feldern.`,
  ratgeber: `## Output-Schema (JSON) — STRENGE Mengen!
{
  "meta_title": "string, max 60",
  "meta_desc":  "string, max 160",
  "schema_markup": { "@context": "https://schema.org", "@type": "Article", ... },
  "sections": [
    {
      "type": "ratgeber",
      "slug": "string (z.B. 'was-ist-sterbegeld')",
      "titel": "string (Hauptüberschrift des Artikels)",
      "intro": "string (2-3 Sätze Definition / Antwort auf 'Was ist X?')",
      "body_paragraphs": [
        "Absatz 1 — Hintergrund / Kontext",
        "Absatz 2 — Hauptinhalt / Detail 1",
        "Absatz 3 — Hauptinhalt / Detail 2",
        "Absatz 4 — Empfehlung / Fazit"
      ],
      "cta_text": "string (Call-to-Action zum Lead-Formular)"
    }
  ]
}

WICHTIG:
- type MUSS exakt "ratgeber" sein (nicht "article", nicht "intro", nicht "paragraph").
- Genau EINE ratgeber-Section pro Response.
- body_paragraphs MUSS 4-6 Strings (volle Absätze, nicht einzelne Sätze) enthalten.`,
}

// Compose the full system + user message pair for a given page type.
// Combines all four layers and appends the JSON-only output instruction.
export function composePrompt(
  pageType: PageType,
  layers: { wissensfundus: string; produktDna: string; vertriebssteuerung: string },
): { system: string; user: string } {
  const schemaSpec = OUTPUT_SCHEMAS[pageType]
  const userParts = [
    layers.wissensfundus,
    layers.produktDna,
    layers.vertriebssteuerung,
    schemaSpec,
    `\nErstelle jetzt den ${pageType}-Inhalt. WICHTIG: Antworte ausschließlich mit gültigem JSON, das EXAKT das oben gezeigte Output-Schema erfüllt. Keine Markdown-Fences, keine Erklärungen außerhalb des JSON-Objekts. Top-Level-Keys MÜSSEN sein: meta_title, meta_desc, schema_markup, sections.`,
  ].filter(Boolean)

  return { system: SYSTEM_PROMPT, user: userParts.join('\n\n') }
}
