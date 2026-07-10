import type { RatgeberSection } from '@/lib/types/ratgeber'
import { getCuratedCoverForSlug } from '@/lib/stock/curated-covers'
import { getHintForSlug, getTitleForSlug } from './normalize'

const DEFAULT_QUOTE = {
  quote:
    'In über 20 Jahren Beratung habe ich gelernt: Wer die Bestattung vorab klärt, schenkt den Angehörigen die größte Entlastung in einer schweren Stunde.',
  author: 'Christian Wimmer',
  author_role: 'Versicherungsmakler, finanzteam26',
}

function bodyIndices(sections: RatgeberSection[]): number[] {
  return sections.map((s, i) => (s.type === 'body' ? i : -1)).filter(i => i >= 0)
}

/**
 * Adds image_text, quote, and info_box sections after Claude generation —
 * same visual rhythm as the pilot articles (was-ist / fuer-wen / kosten-leistungen).
 */
export function enrichRatgeberPipelineSections(
  slug: string,
  sections: RatgeberSection[],
): RatgeberSection[] {
  const types = new Set(sections.map(s => s.type))
  if (types.has('image_text') && types.has('quote') && types.has('info_box')) {
    return sections
  }

  const curated = getCuratedCoverForSlug(slug)
  const imageUrl = curated?.cover_image_url ?? ''
  const imageAlt = curated?.cover_image_alt ?? getTitleForSlug(slug)
  const hint = getHintForSlug(slug)
  const bodies = bodyIndices(sections)

  const imageText: RatgeberSection = {
    type: 'image_text',
    image_url: imageUrl,
    image_alt: imageAlt,
    image_side: bodies.length % 2 === 0 ? 'right' : 'left',
    heading: 'Das Wichtigste auf einen Blick',
    body:
      hint ||
      `Dieser Ratgeber fasst die wichtigsten Punkte zu „${getTitleForSlug(slug)}" verständlich zusammen — ` +
        'mit Blick auf Sterbegeld24Plus und typische Fragen unserer Kunden ab 50.',
  }

  const infoBox: RatgeberSection = {
    type: 'info_box',
    variant: 'tip',
    heading: 'Praxis-Tipp',
    body: hint
      ? `${hint} Vergleichen Sie mehrere Tarife, bevor Sie sich entscheiden.`
      : 'Lassen Sie sich unverbindlich beraten — ein kurzes Gespräch klärt oft mehr als stundenlange Recherche.',
    cta_label: 'Persönliches Angebot anfordern',
    cta_href: '#formular',
  }

  const quote: RatgeberSection = { type: 'quote', ...DEFAULT_QUOTE }

  const out: RatgeberSection[] = []
  let addedImage = types.has('image_text')
  let addedQuote = types.has('quote')
  let addedInfo = types.has('info_box')

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    if (section.type === 'cta' && !addedInfo) {
      out.push(infoBox)
      addedInfo = true
    }
    out.push(section)
    if (section.type === 'body' && !addedImage && i === bodies[0]) {
      out.push(imageText)
      addedImage = true
    }
    if (
      section.type === 'body' &&
      !addedQuote &&
      bodies.length > 0 &&
      i === bodies[Math.min(2, bodies.length - 1)]
    ) {
      out.push(quote)
      addedQuote = true
    }
  }

  if (!addedImage) out.splice(Math.min(2, out.length), 0, imageText)
  if (!addedQuote) {
    const stepsIdx = out.findIndex(s => s.type === 'steps')
    if (stepsIdx >= 0) out.splice(stepsIdx, 0, quote)
    else out.push(quote)
  }
  if (!addedInfo) {
    const ctaIdx = out.findIndex(s => s.type === 'cta')
    if (ctaIdx >= 0) out.splice(ctaIdx, 0, infoBox)
    else out.push(infoBox)
  }

  return out
}
