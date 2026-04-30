/**
 * Auto-Cross-Linker
 *
 * Liest aus der `wissensfundus`-Tabelle alle Einträge mit `published=true`
 * und nicht-leeren `link_phrases`, und ersetzt im Eingabetext die erste
 * Vorkommens-Stelle jeder Phrase durch einen Markdown-Link.
 *
 * URL-Strategie (site-aware):
 *   - Wenn `produktSlug` UND ein passender Ratgeber im selben Produkt
 *     existiert (gleicher slug) → `/{produktSlug}/ratgeber/{slug}` (in-context)
 *   - Sonst → `/wissen/{slug}` (globale Wissensbasis)
 *
 *   Damit bleibt der User auf der Produkt-Seite wenn der Ratgeber dort
 *   gespiegelt ist; sonst wandert er ins zentrale Wissen-Verzeichnis.
 *
 * Designentscheidungen:
 *   - Pro Phrase max. 1 Ersetzung pro Text (vermeidet Spam)
 *   - Bestehende Markdown-Links werden nicht gestört
 *   - Längste Phrasen zuerst (vermeidet, dass "Pflegegrad" gegen "Pflege" verliert)
 *   - Case-insensitive match, aber Original-Casing wird übernommen
 */
import { createAdminClient } from '@/lib/supabase/server'

interface LinkRule {
  slug: string
  phrases: string[]
}

interface CompiledRule {
  slug: string
  phrase: string
  regex: RegExp
}

export interface Linker {
  linkify(text: string): string
}

export interface LoadLinkerOptions {
  /** Produkttyp-Filter — Linker zieht <kategorie> + 'allgemein'. */
  kategorie?: string
  /** Aktiver Produkt-Slug (z.B. 'sterbegeld24plus'). Aktiviert in-context Linking. */
  produktSlug?: string
  /**
   * Slugs der Ratgeber-Artikel, die für diesen Produkt existieren.
   * Wenn ein wissensfundus-Slug HIER drin ist UND `produktSlug` gesetzt ist,
   * verlinkt der Linker nach `/{produktSlug}/ratgeber/{slug}` statt
   * `/wissen/{slug}`. So bleibt der User auf der Produktseite.
   */
  produktRatgeberSlugs?: string[]
}

/**
 * Lädt alle Wissensfundus-Einträge mit Slug + link_phrases aus der DB
 * und kompiliert sie zu einem wiederverwendbaren Linker. In Produktion
 * sollte der Linker pro Generator-Lauf einmal gebaut und für alle
 * Sektionen wiederverwendet werden.
 */
export async function loadLinker(opts?: LoadLinkerOptions): Promise<Linker> {
  const supabase = createAdminClient()
  let query = supabase
    .from('wissensfundus')
    .select('slug, link_phrases')
    .eq('published', true)
    .not('slug', 'is', null)

  if (opts?.kategorie) {
    // Linker zieht produkttyp-spezifische + 'allgemein'
    query = query.in('kategorie', [opts.kategorie, 'allgemein'])
  }

  const { data, error } = await query
  if (error || !data) {
    return { linkify: (t: string) => t }
  }

  const rules: LinkRule[] = data
    .map(r => ({
      slug: r.slug as string,
      phrases: (r.link_phrases as string[] | null) ?? [],
    }))
    .filter(r => r.phrases.length > 0)

  // Flatten und nach Phrasen-Länge absteigend sortieren — sonst überschreibt
  // "Pflege" das längere "Pflegegrad".
  const compiled: CompiledRule[] = rules
    .flatMap(r =>
      r.phrases.map(p => ({
        slug: r.slug,
        phrase: p,
        regex: new RegExp(
          // \b sorgt für Wortgrenzen; Sonderzeichen escapen
          `\\b(${escapeRegex(p)})\\b`,
          'i',
        ),
      })),
    )
    .sort((a, b) => b.phrase.length - a.phrase.length)

  // Set für O(1) Lookup ob Slug als product-internal Ratgeber existiert.
  const ratgeberSet = new Set(opts?.produktRatgeberSlugs ?? [])
  const produktSlug = opts?.produktSlug

  function urlFor(slug: string): string {
    if (produktSlug && ratgeberSet.has(slug)) {
      return `/${produktSlug}/ratgeber/${slug}`
    }
    return `/wissen/${slug}`
  }

  return {
    linkify(text: string): string {
      if (!text || compiled.length === 0) return text
      const used = new Set<string>()
      let out = text

      for (const rule of compiled) {
        if (used.has(rule.slug)) continue
        const match = findUnlinkedMatch(out, rule.regex)
        if (!match) continue
        const before = out.slice(0, match.index)
        const matched = out.slice(match.index, match.index + match[0].length)
        const after = out.slice(match.index + match[0].length)
        out = `${before}[${matched}](${urlFor(rule.slug)})${after}`
        used.add(rule.slug)
      }
      return out
    },
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface MatchResult {
  index: number
  0: string
  length: number
}

/**
 * Findet die erste Phrase, die NICHT innerhalb eines bestehenden Markdown-
 * Links liegt. Approximation — wir tracken offene `[...](...)` Konstrukte.
 */
function findUnlinkedMatch(text: string, regex: RegExp): MatchResult | null {
  let pos = 0
  while (pos < text.length) {
    const slice = text.slice(pos)
    const m = slice.match(regex)
    if (!m || m.index === undefined) return null
    const absIndex = pos + m.index

    if (!isInsideMarkdownLink(text, absIndex)) {
      return { index: absIndex, 0: m[0], length: m[0].length }
    }
    pos = absIndex + m[0].length
  }
  return null
}

function isInsideMarkdownLink(text: string, index: number): boolean {
  // Prüft, ob `index` innerhalb eines [..](..) Konstrukts liegt.
  // Strategie: rückwärts ein '[' suchen; wenn vor dem nächsten ']' steht
  // und danach ein '(' folgt, sind wir im Linktext.
  const before = text.slice(0, index)
  const lastOpen = before.lastIndexOf('[')
  if (lastOpen < 0) return false
  const between = text.slice(lastOpen, index)
  if (between.includes(']')) {
    // ']' wurde bereits geschlossen — checken, ob '(' direkt darauf folgt
    const closeIdx = lastOpen + between.indexOf(']')
    const after = text.slice(closeIdx + 1)
    return after.startsWith('(') && after.indexOf(')') > -1 && index < closeIdx + 1 + after.indexOf(')') + 1
  }
  return true // ']' noch offen → wir sind im Linktext
}
