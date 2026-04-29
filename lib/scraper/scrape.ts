/**
 * Generic website scraper — extracts structured content for the wissensfundus.
 * Used by both the CLI script and the admin API route.
 */

import * as cheerio from 'cheerio'

export interface ScrapedData {
  hero_headline: string | null
  hero_subline: string | null
  features: string[]
  faq: Array<{ frage: string; antwort: string }>
  pricing: string[]
  insurers: string[]
  raw_text_snippets: string[]
}

const KNOWN_INSURERS = [
  'Allianz', 'AXA', 'Zurich', 'Volkswohl', 'Barmenia', 'Alte Leipziger',
  'Concordia', 'Gothaer', 'ERGO', 'Generali', 'R+V', 'HDI', 'Nürnberger', 'LVM',
  'Dialog', 'Württembergische', 'Debeka', 'Signal Iduna', 'Münchener Verein',
  'Bayerische', 'Continentale', 'DEVK', 'Hanse Merkur', 'SDK', 'VGH',
]

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
      'Accept-Language': 'de-DE,de;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

export function extractData(html: string): ScrapedData {
  const $ = cheerio.load(html)
  const result: ScrapedData = {
    hero_headline: null,
    hero_subline: null,
    features: [],
    faq: [],
    pricing: [],
    insurers: [],
    raw_text_snippets: [],
  }

  // Hero headline
  try {
    result.hero_headline = $('h1').first().text().trim() || null
    result.hero_subline = $('h1').first().next('p,h2').text().trim() || null
  } catch { /* skip */ }

  // Features / benefits
  try {
    const featureLists = $('[class*="feature"], [class*="benefit"], [class*="vorteil"], [class*="leistung"], [class*="advantage"]')
    featureLists.find('li').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 5 && text.length < 200) result.features.push(text)
    })
    if (result.features.length < 3) {
      $('main li, article li, section li').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length > 10 && text.length < 200 && !result.features.includes(text)) {
          result.features.push(text)
        }
      })
    }
    result.features = [...new Set(result.features)].slice(0, 15)
  } catch { /* skip */ }

  // FAQ — details/summary pattern
  try {
    $('details').each((_, el) => {
      const frage = $(el).find('summary').text().trim()
      const antwort = $(el).find('summary').remove().end().text().trim()
      if (frage && antwort) result.faq.push({ frage, antwort: antwort.slice(0, 600) })
    })
    // FAQ class patterns
    $('[class*="faq"] .question, [class*="faq"] h3, [class*="accordion"] h3, [class*="accordion"] button, [class*="faq-question"]').each((_, el) => {
      const frage = $(el).text().trim()
      const antwort = $(el).parent().find('p').first().text().trim()
      if (frage && antwort && !result.faq.some(f => f.frage === frage)) {
        result.faq.push({ frage, antwort: antwort.slice(0, 600) })
      }
    })
    // dt/dd pattern (definition lists)
    $('dl dt').each((_, el) => {
      const frage = $(el).text().trim()
      const antwort = $(el).next('dd').text().trim()
      if (frage && antwort && !result.faq.some(f => f.frage === frage)) {
        result.faq.push({ frage, antwort: antwort.slice(0, 600) })
      }
    })
    result.faq = result.faq.slice(0, 15)
  } catch { /* skip */ }

  // Pricing — €/Monat patterns
  try {
    $('body').find('*').each((_, el) => {
      const text = $(el).children().length === 0 ? $(el).text().trim() : ''
      if (/€|EUR/.test(text) && /Monat|mtl\.|monatl\./.test(text) && text.length < 200) {
        result.pricing.push(text)
      }
    })
    result.pricing = [...new Set(result.pricing)].slice(0, 10)
  } catch { /* skip */ }

  // Insurer names
  try {
    const bodyText = $('body').text()
    for (const name of KNOWN_INSURERS) {
      if (bodyText.includes(name)) result.insurers.push(name)
    }
  } catch { /* skip */ }

  // Raw text snippets from main content
  try {
    $('main p, article p, section p, .content p, .page-content p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 50 && text.length < 800) result.raw_text_snippets.push(text)
    })
    // Fallback: all p tags if nothing found
    if (result.raw_text_snippets.length < 3) {
      $('p').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length > 50 && text.length < 800 && !result.raw_text_snippets.includes(text)) {
          result.raw_text_snippets.push(text)
        }
      })
    }
    result.raw_text_snippets = [...new Set(result.raw_text_snippets)].slice(0, 25)
  } catch { /* skip */ }

  return result
}

/**
 * Build wissensfundus articles from scraped data.
 * `kategorie` and `thema_prefix` are used as upsert keys.
 */
export function buildArticles(
  data: ScrapedData,
  kategorie: string,
  sourceLabel: string,
  thema_prefix: string,
) {
  return [
    {
      kategorie,
      thema: `${thema_prefix}_hero`,
      inhalt: [
        data.hero_headline ? `# ${data.hero_headline}` : '',
        data.hero_subline ?? '',
      ].filter(Boolean).join('\n\n') || 'Kein Hero-Inhalt gefunden.',
      tags: ['scraped', thema_prefix, 'hero'],
    },
    {
      kategorie,
      thema: `${thema_prefix}_features`,
      inhalt: data.features.length > 0
        ? `# Vorteile und Leistungen\n\n${data.features.map(f => `- ${f}`).join('\n')}`
        : 'Keine Features gefunden.',
      tags: ['scraped', thema_prefix, 'features'],
    },
    {
      kategorie,
      thema: `${thema_prefix}_faq`,
      inhalt: data.faq.length > 0
        ? `# Häufige Fragen\n\n${data.faq.map(f => `## ${f.frage}\n\n${f.antwort}`).join('\n\n')}`
        : 'Keine FAQ gefunden.',
      tags: ['scraped', thema_prefix, 'faq'],
    },
    {
      kategorie,
      thema: `${thema_prefix}_inhalt`,
      inhalt: data.raw_text_snippets.length > 0
        ? `# Seiteninhalt — ${sourceLabel}\n\n${data.raw_text_snippets.join('\n\n')}`
        : 'Kein Textinhalt gefunden.',
      tags: ['scraped', thema_prefix, 'inhalt'],
    },
  ]
}
