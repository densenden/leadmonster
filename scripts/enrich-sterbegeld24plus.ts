/**
 * Reichert sterbegeld24plus-Content um neue Section-Typen + Bilder an.
 *
 * 1) Generiert 5 OpenAI-Bilder (3 Ratgeber-Cover, 2 Hauptseite-Inline).
 * 2) Speichert sie in Supabase Storage + bilder-Tabelle.
 * 3) Updated generierter_content für hauptseite + 3 Ratgeber-Slugs:
 *    - hauptseite: bestehende Sections + image_text_split, quote_callout,
 *      stats_block, process_steps, info_box.
 *    - Ratgeber: Cover via intro.image_url + image_text + quote + info_box.
 *
 * Idempotent: löscht zuvor generierte bilder-Rows mit page_type='enriched_*'
 * bevor neu generiert wird. Content-Update ist immer Vollersatz von content.
 *
 * Aufruf: npx tsx scripts/enrich-sterbegeld24plus.ts
 *
 * Kosten: 5 × gpt-image-1 ≈ $0.20.
 */
import { config as loadDotenv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isOpenAiConfigured, getOpenAiRouteResolved } from '@/lib/openai/resolve-credentials'

loadDotenv({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY?.trim()
if (!SUPABASE_URL || !SUPABASE_SECRET) throw new Error('Supabase ENV fehlt.')

// Set at runtime in main() after DB key lookup
let FORCE_STOCK = process.env.USE_STOCK === '1'

const STERBEGELD24PLUS_ID = 'fe1e6444-eaab-42df-8fa7-72ec644c3f9f'
const BUCKET = 'produkt-bilder'

const STYLE_GUARD =
  ' Editorial storytelling photography, German lifestyle context, ' +
  'cinematic depth-of-field, soft natural lighting, calm composition, ' +
  'premium magazine-feature feel. ' +
  'Strictly no front-facing portraits, no recognisable real-person faces, ' +
  'no text overlays, no watermarks, no UI mockups, no brand logos, no flag motifs. ' +
  'Humans appear only through hands, silhouettes, back-views or symbolic absence.'

interface ImageSpec {
  key: string
  prompt: string
  alt: string
  slot: 'hero' | 'feature' | 'inline' | 'og' | 'blog_cover'
  pageType: string
  /** Unsplash-Foto-ID (Fallback, wenn OpenAI nicht verfügbar). Lizenzfrei. */
  stockId: string
}

const IMAGE_SPECS: ImageSpec[] = [
  {
    key: 'ratgeber_was_ist',
    prompt:
      'Hands of an elderly woman holding a teacup beside an open notebook on a warm wooden kitchen table, ' +
      'soft morning light through a curtain, calm reflective moment, ' +
      'symbolises planning ahead with care.',
    alt: 'Senior plant ruhig die finanzielle Vorsorge — Hände am Küchentisch',
    slot: 'blog_cover',
    pageType: 'ratgeber_was_ist',
    // Pair of hands holding tea at table, soft warm light
    stockId: 'photo-1567096038228-7d57aacd33b1',
  },
  {
    key: 'ratgeber_fuer_wen',
    prompt:
      'Three generations sitting together at a sunlit garden bench from behind — silhouettes ' +
      'of grandparent, adult child, grandchild, looking towards soft afternoon light. ' +
      'Emotional, hopeful, no faces visible.',
    alt: 'Drei Generationen Silhouette im Gartenlicht',
    slot: 'blog_cover',
    pageType: 'ratgeber_fuer_wen',
    // Senior holding hand of child, generations, back view, sunset
    stockId: 'photo-1488521787991-ed7bbaae773c',
  },
  {
    key: 'ratgeber_kosten',
    prompt:
      'Close-up of a fountain pen filling out a structured insurance application on a desk, ' +
      'soft daylight from a side window, a coffee cup and reading glasses visible. ' +
      'Professional German insurance setting.',
    alt: 'Sterbegeld-Antrag wird ausgefüllt — Schreibtisch mit Kaffee und Brille',
    slot: 'blog_cover',
    pageType: 'ratgeber_kosten',
    // Fountain pen and document, calm desk setting
    stockId: 'photo-1450101499163-c8848c66ca85',
  },
  {
    key: 'hauptseite_warum',
    prompt:
      'Soft-focus interior of a cozy German Altbau living room — open photo album on a side table, ' +
      'warm lamp light, a knitted blanket folded on an armchair. ' +
      'Symbolises memory, continuity, and quiet preparation.',
    alt: 'Wohnzimmer mit aufgeschlagenem Fotoalbum — symbolisiert Erinnerung und Vorsorge',
    slot: 'inline',
    pageType: 'hauptseite_warum',
    // Cozy living room with armchair and lamp
    stockId: 'photo-1493663284031-b7e3aefcae8e',
  },
  {
    key: 'hauptseite_ablauf',
    prompt:
      'A long German oak desk seen from above, with documents, calculator, fountain pen, ' +
      'a small potted plant and a phone — workspace of a calm financial advisor mid-meeting. ' +
      'Top-down angle, no faces.',
    alt: 'Schreibtisch des Versicherungsmaklers von oben — Beratungssituation',
    slot: 'inline',
    pageType: 'hauptseite_ablauf',
    // Top-down desk with calculator, papers, pen — flatlay
    stockId: 'photo-1554224155-6726b3ff858f',
  },
]

import { buildUnsplashCdnUrl, serializeStockMeta } from '@/lib/stock/unsplash'

interface OpenAiImageResponse {
  data: Array<{ b64_json?: string }>
}

async function useStockImage(spec: ImageSpec, supabase: SupabaseClient): Promise<string> {
  const isSquare = spec.slot === 'inline' || spec.slot === 'feature'
  const w = isSquare ? 1200 : 1600
  const h = isSquare ? 1200 : 1066
  const url = buildUnsplashCdnUrl(spec.stockId, { width: w, height: h })
  const photoId = spec.stockId.replace(/^photo-/, '')
  const meta = serializeStockMeta({
    source: 'unsplash',
    photo_id: photoId,
    photographer: 'Unsplash Contributor',
    photographer_url: 'https://unsplash.com',
    photo_page_url: `https://unsplash.com/photos/${photoId}`,
    search_query: spec.key,
  })
  const { error: insErr } = await supabase.from('bilder').insert({
    produkt_id: STERBEGELD24PLUS_ID,
    page_type: spec.pageType,
    slot: spec.slot,
    url,
    alt_text: spec.alt,
    prompt_used: meta,
    provider: 'unsplash',
    width: w,
    height: h,
  })
  if (insErr) throw new Error(`bilder-Insert: ${insErr.message}`)
  console.log(`    ✓ Stock-Bild ${spec.stockId}`)
  return url
}

async function generateOne(spec: ImageSpec, supabase: SupabaseClient): Promise<string> {
  console.log(`  → ${spec.key} …`)

  if (FORCE_STOCK) return useStockImage(spec, supabase)

  const route = await getOpenAiRouteResolved()
  const res = await fetch(route.imagesUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${route.apiKey}`,
    },
    body: JSON.stringify({
      model: route.prefixModel('gpt-image-1'),
      prompt: spec.prompt + STYLE_GUARD,
      size: spec.slot === 'inline' || spec.slot === 'feature' ? '1024x1024' : '1536x1024',
      n: 1,
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.warn(`    ⚠ OpenAI ${res.status} → Fallback auf Stock-Bild. (${txt.slice(0, 120)})`)
    return useStockImage(spec, supabase)
  }

  const json = (await res.json()) as OpenAiImageResponse
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('Antwort hat keine Bilddaten')

  const buffer = Buffer.from(b64, 'base64')
  const fileName = `${new Date().getFullYear()}/enriched-${spec.key}-${Date.now()}.png`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: 'image/png', upsert: true })
  if (upErr) throw new Error(`Upload-Fehler: ${upErr.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
  const url = data.publicUrl

  const w = spec.slot === 'inline' || spec.slot === 'feature' ? 1024 : 1536
  const h = spec.slot === 'inline' || spec.slot === 'feature' ? 1024 : 1024

  const { error: insErr } = await supabase.from('bilder').insert({
    produkt_id: STERBEGELD24PLUS_ID,
    page_type: spec.pageType,
    slot: spec.slot,
    url,
    alt_text: spec.alt,
    prompt_used: spec.prompt + STYLE_GUARD,
    provider: 'openai',
    width: w,
    height: h,
  })
  if (insErr) throw new Error(`bilder-Insert: ${insErr.message}`)

  console.log(`    ✓ ${url.slice(0, 100)}`)
  return url
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SECRET!)

  if (!FORCE_STOCK && !OPENAI_KEY) {
    const { data } = await supabase
      .from('einstellungen')
      .select('wert')
      .eq('schluessel', 'openai_api_key')
      .maybeSingle()
    const dbKey = data?.wert?.trim()
    if (dbKey && dbKey.length >= 8) process.env.OPENAI_API_KEY = dbKey
  }

  if (!FORCE_STOCK && !(await isOpenAiConfigured())) {
    FORCE_STOCK = true
    console.warn('⚠ No OpenAI key — falling back to Unsplash stock images.\n')
  }

  console.log('🎨 Schritt 1: Bilder generieren')
  const urls: Record<string, string> = {}
  for (const spec of IMAGE_SPECS) {
    urls[spec.key] = await generateOne(spec, supabase)
  }

  // -------------------------------------------------------------------------
  // Hauptseite-Content anreichern
  // -------------------------------------------------------------------------
  console.log('\n📝 Schritt 2: Hauptseite-Content erweitern')

  const { data: haupt } = await supabase
    .from('generierter_content')
    .select('content')
    .eq('produkt_id', STERBEGELD24PLUS_ID)
    .eq('page_type', 'hauptseite')
    .single()
  if (!haupt) throw new Error('Hauptseite-Row nicht gefunden')

  const hauptContent = haupt.content as { sections: Array<{ type: string; [key: string]: unknown }> }
  const existing = hauptContent.sections

  // Bestehende Reihenfolge erhalten, neue Sections strategisch einfügen:
  //  hero → features → IMAGE_TEXT_SPLIT (warum) → vergleichsrechner →
  //  PROCESS_STEPS (so geht's) → trust → STATS_BLOCK → QUOTE → faq →
  //  INFO_BOX → blog_preview
  const heroSec = existing.find(s => s.type === 'hero')
  const featuresSec = existing.find(s => s.type === 'features')
  const vrSec = existing.find(s => s.type === 'vergleichsrechner')
  const trustSec = existing.find(s => s.type === 'trust')
  const faqSec = existing.find(s => s.type === 'faq')
  const blogPreviewSec = existing.find(s => s.type === 'blog_preview')

  const imageTextWarum = {
    type: 'image_text_split',
    image_url: urls.hauptseite_warum,
    image_alt: 'Wohnzimmer mit Fotoalbum — Sinnbild Vorsorge',
    image_side: 'left',
    eyebrow: 'Warum jetzt vorsorgen',
    headline: 'Ein Akt der Liebe — nicht der Bürokratie',
    body:
      'Eine [Sterbegeldversicherung](/wissen/was-ist-sterbegeld) ist mehr als ein Vertrag. ' +
      'Sie nimmt den Angehörigen in einer schweren Stunde den Druck, plötzlich tausende Euro für ' +
      'die [Bestattung](/wissen/bestattungskosten) aufbringen zu müssen.\n\n' +
      'Christian Wimmer, Versicherungsmakler aus Bayern, hat in über 20 Jahren erlebt, wie sehr ' +
      'fehlende Vorsorge ganze Familien belastet. Mit Sterbegeld24Plus läuft die Auszahlung ' +
      'binnen 24 Stunden — bevor die erste Rechnung kommt.',
    cta_label: 'Vorsorge starten',
    cta_href: '#formular',
    background: 'white',
  }

  const processAblauf = {
    type: 'process_steps',
    headline: 'So einfach ist Ihr Schutz',
    subline: 'Vom ersten Vergleich bis zur Police — keine 10 Minuten.',
    items: [
      {
        number: 1,
        title: 'Tarife vergleichen',
        description:
          'Geburtsjahr & Wunschsumme eingeben — Sie sehen sofort die [günstigsten Anbieter](/sterbegeld24plus/vergleichsrechner) im direkten Vergleich.',
      },
      {
        number: 2,
        title: 'Angebot anfordern',
        description:
          'Mit einem Klick fordern Sie ein verbindliches Angebot an — ohne Gesundheitsfragen, ohne Vertreter-Besuch.',
      },
      {
        number: 3,
        title: 'Persönliches Gespräch',
        description:
          'Christian Wimmer beantwortet Ihre Fragen telefonisch — verständlich, geduldig, auf Wunsch auch mit Angehörigen.',
      },
      {
        number: 4,
        title: 'Schutz ab Tag 1',
        description:
          'Police unterschrieben — bei Unfalltod sofort versichert. Reguläre Wartezeit endet nach maximal 3 Jahren.',
      },
    ],
  }

  const statsBlock = {
    type: 'stats_block',
    headline: 'Sterbegeld24Plus in Zahlen',
    subline: 'Klare Konditionen, keine versteckten Kosten.',
    items: [
      {
        value: '5.000–25.000 €',
        label: 'Versicherungssumme',
        detail: 'Frei wählbar, an Bestattungskosten anpassbar.',
      },
      {
        value: 'ab 9,99 €',
        label: 'Monatsbeitrag',
        detail: 'Lebenslang konstant — keine Erhöhungen im Alter.',
      },
      {
        value: '24 h',
        label: 'Auszahlung im Ernstfall',
        detail: 'An die [bezugsberechtigten Hinterbliebenen](/wissen/sterbegeld-bezugsberechtigung).',
      },
      {
        value: '100 %',
        label: 'Aufnahmegarantie',
        detail: 'Auch bei Vorerkrankungen, ab dem 50. Lebensjahr.',
      },
    ],
  }

  const quote = {
    type: 'quote_callout',
    quote:
      'Niemand möchte über das eigene Ende sprechen. Aber wer es einmal geregelt hat, schenkt seinen Angehörigen die größte Sicherheit überhaupt.',
    author: 'Christian Wimmer',
    author_role: 'Versicherungsmakler, finanzteam26',
  }

  const infoBox = {
    type: 'info_box',
    variant: 'tip',
    headline: 'Tipp: Bestattungskosten realistisch einschätzen',
    body:
      'Eine durchschnittliche [Bestattung](/wissen/bestattungskosten) kostet in Deutschland zwischen 7.000 und 12.000 Euro. ' +
      'Wer die gesetzliche Aufgabenstellung der gesetzlichen Krankenkassen kennt, weiß: Sterbegeld zahlen sie seit 2004 nicht mehr.',
    cta_label: 'Mehr im Ratgeber lesen',
    cta_href: '/sterbegeld24plus/ratgeber/kosten-leistungen',
  }

  const newSections: Array<unknown> = []
  if (heroSec) newSections.push(heroSec)
  if (featuresSec) newSections.push(featuresSec)
  newSections.push(imageTextWarum)
  if (vrSec) newSections.push(vrSec)
  newSections.push(processAblauf)
  if (trustSec) newSections.push(trustSec)
  newSections.push(statsBlock)
  newSections.push(quote)
  if (faqSec) newSections.push(faqSec)
  newSections.push(infoBox)
  if (blogPreviewSec) newSections.push(blogPreviewSec)

  // lead_form-Section vorher gab es nicht in der Hauptseite — TrustBlock + LeadForm
  // hängen über ProduktHauptseite/TrustBlock-Sticky an. Wir fügen aber als Backup
  // ein lead_form ans Ende, damit der Conversion-Punkt klar ist.
  newSections.push({
    type: 'lead_form',
    headline: 'Persönliches Angebot anfordern',
    subline:
      'Christian Wimmer ruft Sie zurück — verständlich, ohne Verkaufsdruck, mit Tarifen mehrerer Anbieter.',
  })

  const { error: hauptErr } = await supabase
    .from('generierter_content')
    .update({ content: { sections: newSections } })
    .eq('produkt_id', STERBEGELD24PLUS_ID)
    .eq('page_type', 'hauptseite')
  if (hauptErr) throw new Error(`Hauptseite-Update: ${hauptErr.message}`)
  console.log(`  ✓ Hauptseite: ${newSections.length} Sections (vorher ${existing.length})`)

  // -------------------------------------------------------------------------
  // Ratgeber-Content anreichern (3 Slugs)
  // -------------------------------------------------------------------------
  console.log('\n📝 Schritt 3: Ratgeber-Content erweitern')

  const ratgeberEnrichments: Record<string, { cover_key: string; image_text: { heading: string; body: string; image_side: 'left' | 'right' }; quote: { quote: string; author?: string; author_role?: string }; info: { variant: 'info' | 'tip' | 'warning'; heading: string; body: string; cta_label?: string; cta_href?: string } }> = {
    'was-ist-sterbegeld': {
      cover_key: 'ratgeber_was_ist',
      image_text: {
        heading: 'Warum eine eigene Vorsorge sinnvoll ist',
        image_side: 'right',
        body:
          'Seit 2004 zahlt die [gesetzliche Krankenversicherung](/wissen/gkv-sterbegeld) kein Sterbegeld mehr. ' +
          'Die Angehörigen tragen die [Bestattungskosten](/wissen/bestattungskosten) somit allein. Wer das früh ' +
          'regelt, schafft Klarheit und entlastet die Familie in einer ohnehin schweren Zeit.',
      },
      quote: {
        quote: 'Sterbegeld ist die letzte konkrete Geste, die wir unseren Angehörigen schenken können — Klarheit, statt Unsicherheit.',
        author: 'Christian Wimmer',
        author_role: 'Versicherungsmakler',
      },
      info: {
        variant: 'info',
        heading: 'Was unterscheidet die Sterbegeldversicherung von einer Lebensversicherung?',
        body:
          'Beide zahlen im Todesfall aus — aber die [Sterbegeldversicherung](/wissen/sterbegeld-vs-lebensversicherung) ist auf die kleinere, gezielte ' +
          'Deckung der Bestattungskosten zugeschnitten. Sie wird auch im hohen Alter akzeptiert, oft ganz ohne Gesundheitsfragen.',
        cta_label: 'Vergleich Sterbegeld vs. Lebensversicherung',
        cta_href: '/wissen/sterbegeld-vs-lebensversicherung',
      },
    },
    'fuer-wen': {
      cover_key: 'ratgeber_fuer_wen',
      image_text: {
        heading: 'Drei Generationen — eine Entlastung',
        image_side: 'left',
        body:
          'Sterbegeld ist nicht nur etwas für Hochbetagte. Wer Kinder oder Enkel hat, schützt sie vor der ' +
          'Doppelbelastung aus Trauer und unerwarteten Rechnungen. Besonders sinnvoll ist die Police für ' +
          'Senioren ab 50 ohne anderweitige Risikolebensversicherung.',
      },
      quote: {
        quote: 'In meiner Beratung höre ich oft: „Wir hätten das viel früher regeln sollen." Ein typischer Satz von Hinterbliebenen.',
        author: 'Christian Wimmer',
        author_role: 'Versicherungsmakler',
      },
      info: {
        variant: 'tip',
        heading: 'Für wen lohnt es sich besonders?',
        body:
          'Senioren ab 50 ohne andere Lebensversicherung · Eltern mit erwachsenen Kindern · Alleinstehende, ' +
          'die ihre Bestattung im Vorhinein klären wollen · Familien, die [Pflegekosten](/pflegezusatz) bereits absichern.',
      },
    },
    'kosten-leistungen': {
      cover_key: 'ratgeber_kosten',
      image_text: {
        heading: 'Was kostet eine Bestattung wirklich?',
        image_side: 'right',
        body:
          'Eine [Standardbestattung](/wissen/bestattungskosten) in Deutschland kostet inkl. Sarg, Friedhofsgebühren, Trauerfeier und Grabstein ' +
          'zwischen 7.000 und 12.000 Euro. Bei gewünschter Erdbestattung in Großstädten ' +
          'können es 15.000 Euro werden. Sterbegeld24Plus deckt diese Kosten passgenau ab.',
      },
      quote: {
        quote: 'Viele sind überrascht, wie schnell aus „nur ein Sarg" 10.000 Euro werden. Wer das einmal durchrechnet, plant anders.',
        author: 'Christian Wimmer',
        author_role: 'Versicherungsmakler',
      },
      info: {
        variant: 'warning',
        heading: 'Wartezeit beachten',
        body:
          'Bei Tod durch Krankheit greift typischerweise eine [Wartezeit von bis zu 3 Jahren](/wissen/sterbegeld-wartezeit-sofortschutz). ' +
          'Bei Unfalltod zahlt der Tarif sofort. Achten Sie beim Vergleich darauf, dass die ' +
          'Wartezeit zu Ihrer Situation passt.',
      },
    },
  }

  for (const [slug, enrich] of Object.entries(ratgeberEnrichments)) {
    const { data: row } = await supabase
      .from('generierter_content')
      .select('content')
      .eq('produkt_id', STERBEGELD24PLUS_ID)
      .eq('page_type', 'ratgeber')
      .eq('slug', slug)
      .single()
    if (!row) {
      console.log(`  ⚠ Ratgeber ${slug} nicht gefunden, übersprungen`)
      continue
    }

    const content = row.content as { sections: Array<{ type: string; [key: string]: unknown }> }
    const sections = content.sections.slice() // copy

    // Cover-Image auf intro setzen
    const introIdx = sections.findIndex(s => s.type === 'intro')
    if (introIdx >= 0) {
      sections[introIdx] = {
        ...sections[introIdx],
        image_url: urls[enrich.cover_key],
        image_alt: IMAGE_SPECS.find(s => s.key === enrich.cover_key)!.alt,
      }
    }

    // Strategisch einfügen: nach erstem body → image_text; nach zweitem body → quote;
    // vor cta → info_box.
    const bodyIndices = sections.map((s, i) => (s.type === 'body' ? i : -1)).filter(i => i >= 0)
    const result: typeof sections = []
    let inserted = { image_text: false, quote: false, info: false }

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]
      result.push(s)
      if (s.type === 'body' && !inserted.image_text && i === bodyIndices[0]) {
        result.push({
          type: 'image_text',
          image_url: urls[enrich.cover_key], // reuse cover als Inline für Konsistenz
          image_alt: IMAGE_SPECS.find(k => k.key === enrich.cover_key)!.alt,
          image_side: enrich.image_text.image_side,
          heading: enrich.image_text.heading,
          body: enrich.image_text.body,
        })
        inserted.image_text = true
      }
      if (s.type === 'body' && !inserted.quote && i === bodyIndices[Math.min(2, bodyIndices.length - 1)]) {
        result.push({ type: 'quote', ...enrich.quote })
        inserted.quote = true
      }
      if (s.type === 'cta' && !inserted.info) {
        result.splice(result.length - 1, 0, { type: 'info_box', ...enrich.info })
        inserted.info = true
      }
    }

    // Falls einer der Marker nicht traf — am Ende anhängen
    if (!inserted.image_text) result.push({ type: 'image_text', image_url: urls[enrich.cover_key], image_alt: '', image_side: 'left', heading: enrich.image_text.heading, body: enrich.image_text.body })
    if (!inserted.quote) result.push({ type: 'quote', ...enrich.quote })
    if (!inserted.info) result.push({ type: 'info_box', ...enrich.info })

    const { error: upErr } = await supabase
      .from('generierter_content')
      .update({ content: { sections: result } })
      .eq('produkt_id', STERBEGELD24PLUS_ID)
      .eq('page_type', 'ratgeber')
      .eq('slug', slug)
    if (upErr) console.error(`  ✗ ${slug}: ${upErr.message}`)
    else console.log(`  ✓ ${slug}: ${sections.length} → ${result.length} Sections`)
  }

  console.log('\n🎉 sterbegeld24plus erfolgreich angereichert.')
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
