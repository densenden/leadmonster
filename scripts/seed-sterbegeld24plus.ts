/**
 * Seed script — sterbegeld24plus pilot product
 *
 * Run with:  npx tsx scripts/seed-sterbegeld24plus.ts
 *
 * What it does:
 * 1. Seeds 5 Wissensfundus articles (sterbegeld category)
 * 2. Creates the sterbegeld24plus product + config
 * 3. Calls Claude to generate all 7 content pages
 * 4. Publishes all content + sets product to aktiv
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ─── 1. Wissensfundus ────────────────────────────────────────────────────────

const WISSEN = [
  {
    kategorie: 'sterbegeld',
    thema: 'was_ist_sterbegeld',
    tags: ['sterbegeld', 'definition', 'lebensversicherung'],
    inhalt: `Eine Sterbegeldversicherung ist eine spezielle Form der Lebensversicherung, die ausschließlich dazu dient, die Kosten einer Bestattung abzudecken. Im Gegensatz zu einer klassischen Lebensversicherung sind die Versicherungssummen bewusst niedrig gehalten — typischerweise zwischen 5.000 und 15.000 Euro — da sie genau die anfallenden Beerdigungskosten decken sollen.

Der wesentliche Unterschied zur Lebensversicherung liegt im Zweck: Während eine Lebensversicherung der finanziellen Absicherung der Hinterbliebenen dient, soll die Sterbegeldversicherung ausschließlich die Bestattungskosten finanzieren. Dazu gehören Sargkosten, Trauerfeier, Grabstein, Friedhofsgebühren und die Überführung des Verstorbenen.

In Deutschland belaufen sich die durchschnittlichen Bestattungskosten je nach Bundesland und Art der Bestattung auf 5.000 bis 12.000 Euro. Eine Erdbestattung ist in der Regel teurer als eine Feuerbestattung. Viele Familien unterschätzen diese Kosten — mit einer Sterbegeldversicherung stellen Sie sicher, dass Ihre Angehörigen nicht plötzlich vor einer finanziellen Belastung stehen.

Sterbegeldversicherungen werden häufig ohne Gesundheitsprüfung angeboten, was sie besonders für ältere Menschen oder Personen mit Vorerkrankungen attraktiv macht. Der Versicherungsschutz beginnt in der Regel sofort oder nach einer kurzen Wartezeit von 3 bis 24 Monaten.`,
  },
  {
    kategorie: 'sterbegeld',
    thema: 'fuer_wen_geeignet',
    tags: ['zielgruppe', 'senioren', 'familien'],
    inhalt: `Die Sterbegeldversicherung richtet sich in erster Linie an Menschen ab 50 Jahren, die ihre Angehörigen im Todesfall nicht mit Beerdigungskosten belasten möchten. Besonders Senioren, die keine ausreichenden Ersparnisse für eine Bestattung haben, profitieren von diesem Vorsorgeprodukt.

Typische Zielgruppen sind: Rentner und Pensionäre, die ein festes, kalkulierbares Budget haben und keine hohen Einmalzahlungen leisten können. Familienmenschen, die sicherstellen möchten, dass ihre Kinder und Enkel im Trauerfall nicht finanziell belastet werden. Alleinstehende, die keine Angehörigen haben, die die Bestattungskosten übernehmen könnten.

Die Gesundheitssituation spielt bei Senioren eine wichtige Rolle: Viele ältere Menschen haben chronische Erkrankungen wie Bluthochdruck, Diabetes oder Herzprobleme. Bei Sterbegeldversicherungen wird in der Regel keine aufwendige Gesundheitsprüfung verlangt — einige Anbieter gewähren sogar einen garantierten Aufnahme ohne jegliche Gesundheitsfragen.

Aus psychologischer Sicht gibt die Sterbegeldversicherung älteren Menschen ein Gefühl der Kontrolle und Würde: Sie regeln ihre eigene Beerdigung und entlasten damit die Familie in einem ohnehin schweren Moment. Viele Senioren beschreiben den Abschluss einer Sterbegeldversicherung als einen bewussten Akt der Fürsorge für ihre Liebsten.`,
  },
  {
    kategorie: 'sterbegeld',
    thema: 'kosten_und_leistungen',
    tags: ['kosten', 'leistungen', 'beitraege'],
    inhalt: `Die monatlichen Beiträge für eine Sterbegeldversicherung hängen vor allem vom Eintrittsalter und der gewählten Versicherungssumme ab. Als Faustregel gilt: Je älter der Versicherungsnehmer bei Abschluss, desto höher der monatliche Beitrag.

Typische Beitragsbeispiele (illustrativ): Ein 50-Jähriger zahlt für eine Versicherungssumme von 10.000 Euro zwischen 18 und 26 Euro monatlich. Ein 60-Jähriger zahlt für dieselbe Summe zwischen 33 und 45 Euro. Ein 70-Jähriger kommt auf 53 bis 71 Euro pro Monat.

Was ist abgedeckt: Die Sterbegeldversicherung leistet eine Einmalzahlung an die Begünstigten. Diese Summe kann für sämtliche Bestattungskosten verwendet werden — Sarg oder Urne, Trauerfeier, Blumenschmuck, Grabstein, Friedhofsgebühren, Todesanzeigen sowie die An- und Überführung des Verstorbenen. Einige Anbieter bieten auch Zusatzleistungen wie eine telefonische Beratung bei der Bestattungsplanung an.

Was ist nicht abgedeckt: Offene Schulden des Verstorbenen werden durch die Sterbegeldversicherung nicht gedeckt. Auch eventuelle Erbschaftskosten sind nicht Gegenstand dieser Versicherungsform. Der Versicherungsschutz erlischt mit der Auszahlung der Versicherungssumme.

Wichtig: Bei den meisten Tarifen gilt eine Wartezeit von 3 bis 24 Monaten nach Vertragsabschluss. Stirbt der Versicherte innerhalb der Wartezeit aus natürlichen Gründen, erhalten die Begünstigten nur die eingezahlten Beiträge zurück. Bei einem Unfalltod gilt die Wartezeit in der Regel nicht.`,
  },
  {
    kategorie: 'sterbegeld',
    thema: 'anbieter_unterschiede',
    tags: ['anbieter', 'vergleich', 'wartezeit'],
    inhalt: `Auf dem deutschen Markt bieten zahlreiche Versicherer Sterbegeldversicherungen an. Die wichtigsten Unterschiede zwischen den Anbietern betreffen Wartezeiten, Gesundheitsfragen, garantierte Aufnahme und Auszahlungsgeschwindigkeit.

Wartezeiten: Die Wartezeit variiert erheblich zwischen den Anbietern. Zurich und Allianz bieten teilweise Tarife ohne Wartezeit an, während andere Anbieter wie Concordia oder Gothaer Wartezeiten von bis zu 24 Monaten vorsehen. Kürzere Wartezeiten bedeuten jedoch meist höhere Beiträge.

Gesundheitsfragen: Volkswohl Bund und Barmenia sind bekannt für vereinfachte Gesundheitsprüfungen mit nur wenigen Fragen. Alte Leipziger und AXA verlangen teilweise ausführlichere Gesundheitsangaben, bieten dafür günstigere Konditionen für gesunde Antragsteller. Einige Tarife bei Concordia und Gothaer ermöglichen eine garantierte Aufnahme ohne Gesundheitsfragen.

Auszahlungsgeschwindigkeit: Die meisten Anbieter zahlen die Versicherungssumme innerhalb von 5 bis 14 Werktagen nach Einreichung aller Unterlagen aus. Allianz und Zurich gelten als besonders schnell bei der Schadenregulierung.

Beitragsstabilität: Ein wichtiges Kriterium ist, ob die Beiträge über die Laufzeit stabil bleiben. Bei Volkswohl Bund und Alte Leipziger sind die Beiträge garantiert konstant. Bei anderen Anbietern können Anpassungen möglich sein — dies sollte vor Vertragsabschluss genau geprüft werden.`,
  },
  {
    kategorie: 'sterbegeld',
    thema: 'antragsprozess',
    tags: ['antrag', 'dokumente', 'online'],
    inhalt: `Der Antragsprozess für eine Sterbegeldversicherung ist in der Regel unkompliziert und kann häufig vollständig online abgewickelt werden. Folgende Schritte sind typisch:

Schritt 1 — Angebot einholen: Über Vergleichsportale oder direkt beim Anbieter können Sie unverbindliche Beitragsangebote anfordern. Hierfür werden Ihr Alter, die gewünschte Versicherungssumme und ggf. grundlegende Gesundheitsinformationen benötigt.

Schritt 2 — Antrag ausfüllen: Der eigentliche Antrag enthält neben persönlichen Daten (Name, Adresse, Geburtsdatum) die Benennung der Begünstigten sowie bei gesundheitsgeprüften Tarifen einige Gesundheitsfragen. Diese sind in der Regel als einfache Ja/Nein-Fragen formuliert.

Schritt 3 — Unterlagen einreichen: In der Regel sind keine umfangreichen Dokumente erforderlich. Für den Antrag reicht meist ein gültiger Personalausweis. Ärztliche Atteste oder Befundberichte werden bei vereinfachten Tarifen nicht verlangt.

Schritt 4 — Annahmeentscheidung: Anbieter wie Volkswohl Bund oder Barmenia entscheiden häufig innerhalb weniger Tage. Bei Online-Anträgen ist eine sofortige Rückmeldung üblich.

Schritt 5 — Vertragsabschluss und Beginn: Nach Annahme erhalten Sie die Versicherungspolice per Post oder digital. Der Versicherungsschutz beginnt mit dem im Vertrag angegebenen Datum — beachten Sie dabei die vereinbarte Wartezeit.

Tipp: Vergleichen Sie mindestens drei Angebote, bevor Sie sich entscheiden. Achten Sie besonders auf Wartezeit, Beitragsstabilität und die Bedingungen bei Vorerkrankungen.`,
  },
]

// ─── 2. Produkt + Config ─────────────────────────────────────────────────────

const PRODUKT = {
  slug: 'sterbegeld24plus',
  name: 'Sterbegeld24Plus',
  typ: 'sterbegeld',
  status: 'entwurf',
}

const PRODUKT_CONFIG = {
  zielgruppe: ['senioren_50plus', 'familien'],
  fokus: 'sicherheit',
  anbieter: ['Zurich', 'Volkswohl Bund', 'Barmenia', 'Alte Leipziger', 'Allianz', 'AXA', 'Concordia', 'Gothaer'],
  argumente: {
    sofortschutz: 'Sofortiger Versicherungsschutz ab Vertragsabschluss bei Unfalltod',
    garantierte_leistung: 'Garantierte Auszahlung der vollen Versicherungssumme ohne Abzüge',
    entlastung: 'Entlasten Sie Ihre Familie in einem schweren Moment von finanziellen Sorgen',
    flexibel: 'Flexible Versicherungssummen von 5.000 bis 15.000 Euro frei wählbar',
    transparent: 'Transparente Beiträge ohne versteckte Kosten — lebenslang garantiert',
  },
}

// ─── 3. Claude content generation ────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  let attempt = 0
  while (attempt < 3) {
    try {
      const resp = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        temperature: 0 as unknown as undefined,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = resp.content[0]
      if (block.type !== 'text') throw new Error('No text block')
      // Strip markdown code fences if Claude wraps the JSON
      return block.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    } catch (err: unknown) {
      const e = err as { status?: number }
      if (e?.status === 429 && attempt < 2) {
        const wait = Math.pow(2, attempt) * 2000
        console.log(`  Rate limited — retrying in ${wait}ms…`)
        await new Promise(r => setTimeout(r, wait))
        attempt++
      } else {
        throw err
      }
    }
  }
  throw new Error('Claude call failed after retries')
}

function buildSystemPrompt(wissensfundus: string): string {
  return `Du bist ein professioneller SEO-Texter für deutsche Versicherungsprodukte.
Schreibe immer auf Deutsch. Halte dich streng an das geforderte JSON-Format.
Verwende keine Markdown-Formatierung außerhalb von JSON-Strings.
Antworte ausschließlich mit gültigem JSON — kein erklärender Text davor oder danach.

${wissensfundus}`
}

function buildAnbieterContext(): string {
  return PRODUKT_CONFIG.anbieter.join(', ')
}

async function generateHauptseite(wissensfundus: string, produktId: string) {
  console.log('  Generating hauptseite…')
  const prompt = `${buildSystemPrompt(wissensfundus)}

Erstelle eine vollständige Hauptseite für das Versicherungsprodukt "Sterbegeld24Plus".
Zielgruppe: Senioren 50+, Familien. Fokus: Sicherheit und Fürsorge.
Anbieter: ${buildAnbieterContext()}.

Antworte mit GENAU diesem JSON (kein Text davor oder danach):
{
  "meta_title": "...",
  "meta_desc": "...",
  "title": "...",
  "content": {
    "sections": [
      {
        "type": "hero",
        "headline": "...",
        "subline": "...",
        "cta_text": "Jetzt unverbindlich anfragen",
        "cta_anchor": "#formular"
      },
      {
        "type": "features",
        "items": [
          {"icon": "shield", "title": "...", "text": "..."},
          {"icon": "heart", "title": "...", "text": "..."},
          {"icon": "star", "title": "...", "text": "..."},
          {"icon": "check", "title": "...", "text": "..."}
        ]
      },
      {
        "type": "trust",
        "stat_items": [
          {"value": "8+", "label": "Versicherungspartner"},
          {"value": "5.000 €", "label": "ab Versicherungssumme"},
          {"value": "100%", "label": "Garantierte Auszahlung"},
          {"value": "50+", "label": "Jahre Erfahrung im Markt"}
        ]
      },
      {
        "type": "faq",
        "items": [
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."}
        ]
      },
      {
        "type": "lead_form",
        "headline": "Jetzt unverbindlich Ihr persönliches Angebot anfordern",
        "subline": "Kostenlos und ohne Verpflichtung — Antwort innerhalb von 24 Stunden"
      }
    ]
  }
}

Regeln:
- meta_title: max 60 Zeichen
- meta_desc: max 160 Zeichen
- Alle Texte auf Deutsch, direkt und informativ
- FAQ-Antworten beginnen jeweils mit einem direkten Faktensatz`

  const raw = await callClaude(prompt)
  const json = JSON.parse(raw.trim())
  return {
    page_type: 'hauptseite',
    slug: 'sterbegeld24plus',
    produkt_id: produktId,
    title: json.title,
    meta_title: json.meta_title,
    meta_desc: json.meta_desc,
    content: json.content,
    status: 'publiziert',
    published_at: new Date().toISOString(),
  }
}

async function generateFaq(wissensfundus: string, produktId: string) {
  console.log('  Generating faq…')
  const prompt = `${buildSystemPrompt(wissensfundus)}

Erstelle 12 häufige Fragen und Antworten zur Sterbegeldversicherung für das Produkt Sterbegeld24Plus.
Zielgruppe: Senioren 50+. Jede Antwort beginnt mit einem direkten Faktensatz (AEO-optimiert).

Antworte mit GENAU diesem JSON:
{
  "meta_title": "Häufige Fragen zur Sterbegeldversicherung | Sterbegeld24Plus",
  "meta_desc": "...",
  "title": "Häufige Fragen zu Sterbegeld24Plus",
  "content": {
    "sections": [
      {
        "type": "faq",
        "items": [
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."},
          {"frage": "...", "antwort": "..."}
        ]
      }
    ]
  }
}`

  const raw = await callClaude(prompt)
  const json = JSON.parse(raw.trim())
  return {
    page_type: 'faq',
    slug: 'faq',
    produkt_id: produktId,
    title: json.title,
    meta_title: json.meta_title,
    meta_desc: json.meta_desc,
    content: json.content,
    status: 'publiziert',
    published_at: new Date().toISOString(),
  }
}

async function generateVergleich(wissensfundus: string, produktId: string) {
  console.log('  Generating vergleich…')
  const anbieter = PRODUKT_CONFIG.anbieter
  const prompt = `${buildSystemPrompt(wissensfundus)}

Erstelle eine Vergleichsseite für Sterbegeldversicherungen mit diesen 8 Anbietern: ${anbieter.join(', ')}.

Antworte mit GENAU diesem JSON:
{
  "meta_title": "Sterbegeldversicherung Vergleich 2026 | Sterbegeld24Plus",
  "meta_desc": "...",
  "title": "Sterbegeldversicherung Vergleich",
  "content": {
    "sections": [
      {
        "type": "vergleich",
        "intro": "...",
        "anbieter": [
          ${anbieter.map(a => `{
            "name": "${a}",
            "wartezeit": "...",
            "gesundheitsfragen": "Ja/Nein/Vereinfacht",
            "garantierte_aufnahme": true,
            "beitrag_beispiel": "ab XX €/Monat",
            "besonderheit": "..."
          }`).join(',\n          ')}
        ]
      }
    ]
  }
}`

  const raw = await callClaude(prompt)
  const json = JSON.parse(raw.trim())
  return {
    page_type: 'vergleich',
    slug: 'vergleich',
    produkt_id: produktId,
    title: json.title,
    meta_title: json.meta_title,
    meta_desc: json.meta_desc,
    content: json.content,
    status: 'publiziert',
    published_at: new Date().toISOString(),
  }
}

async function generateTarif(produktId: string) {
  console.log('  Generating tarif…')
  return {
    page_type: 'tarif',
    slug: 'tarife',
    produkt_id: produktId,
    title: 'Sterbegeld24Plus Tarifrechner — Beitragsbeispiele',
    meta_title: 'Sterbegeldversicherung Beitrag berechnen | Sterbegeld24Plus',
    meta_desc: 'Berechnen Sie Ihren unverbindlichen Monatsbeitrag für eine Sterbegeldversicherung. Sofort online — kostenlos und ohne Verpflichtung.',
    content: {
      sections: [
        {
          type: 'tarif',
          disclaimer: 'Hinweis: Diese Berechnung dient ausschließlich zur Orientierung und stellt kein verbindliches Angebot dar. Die tatsächlichen Beiträge können je nach Gesundheitszustand, Anbieter und individuellen Faktoren abweichen.',
          altersgruppen: [
            { min: 40, max: 49, label: '40–49 Jahre' },
            { min: 50, max: 59, label: '50–59 Jahre' },
            { min: 60, max: 69, label: '60–69 Jahre' },
            { min: 70, max: 79, label: '70–79 Jahre' },
            { min: 80, max: 85, label: '80–85 Jahre' },
          ],
        },
      ],
    },
    status: 'publiziert',
    published_at: new Date().toISOString(),
  }
}

async function generateRatgeber(wissensfundus: string, produktId: string, thema: string, titel: string) {
  console.log(`  Generating ratgeber: ${thema}…`)
  const prompt = `${buildSystemPrompt(wissensfundus)}

Schreibe einen ausführlichen Ratgeber-Artikel zum Thema "${titel}" für das Produkt Sterbegeld24Plus.
Der Artikel soll mindestens 500 Wörter lang sein und AEO-optimiert (direkte Antworten im ersten Satz jedes Abschnitts).

Antworte mit GENAU diesem JSON:
{
  "meta_title": "...",
  "meta_desc": "...",
  "title": "${titel}",
  "content": {
    "sections": [
      {
        "type": "intro",
        "text": "..."
      },
      {
        "type": "body",
        "heading": "...",
        "paragraphs": ["...", "...", "..."]
      },
      {
        "type": "body",
        "heading": "...",
        "paragraphs": ["...", "...", "..."]
      },
      {
        "type": "steps",
        "heading": "So gehen Sie vor",
        "items": [
          {"number": 1, "title": "...", "description": "..."},
          {"number": 2, "title": "...", "description": "..."},
          {"number": 3, "title": "...", "description": "..."}
        ]
      },
      {
        "type": "cta",
        "headline": "Jetzt persönliches Angebot anfordern",
        "cta_text": "Kostenlos anfragen",
        "cta_anchor": "#formular"
      }
    ]
  }
}`

  const raw = await callClaude(prompt)
  const json = JSON.parse(raw.trim())
  return {
    page_type: 'ratgeber',
    slug: thema,
    produkt_id: produktId,
    title: json.title,
    meta_title: json.meta_title,
    meta_desc: json.meta_desc,
    content: json.content,
    status: 'publiziert',
    published_at: new Date().toISOString(),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding sterbegeld24plus…\n')

  // 1. Wissensfundus
  console.log('📚 Step 1: Wissensfundus…')
  // Delete existing sterbegeld articles and re-insert fresh
  await supabase.from('wissensfundus').delete().eq('kategorie', 'sterbegeld')
  const { error: wErr } = await supabase.from('wissensfundus').insert(WISSEN)
  if (wErr) { console.error('Wissensfundus error:', wErr); process.exit(1) }
  console.log(`  ✓ ${WISSEN.length} articles inserted\n`)

  // 2. Produkt
  console.log('📦 Step 2: Produkt…')
  const { data: existing } = await supabase.from('produkte').select('id').eq('slug', PRODUKT.slug).single()

  let produktId: string
  if (existing) {
    produktId = existing.id
    console.log(`  ✓ Already exists: ${produktId}`)
  } else {
    const { data: newProdukt, error: pErr } = await supabase.from('produkte').insert(PRODUKT).select('id').single()
    if (pErr || !newProdukt) { console.error('Produkt error:', pErr); process.exit(1) }
    produktId = newProdukt.id
    console.log(`  ✓ Created: ${produktId}`)
  }

  // 3. Produkt config
  console.log('⚙️  Step 3: Produkt-Config…')
  const { data: existingConfig } = await supabase.from('produkt_config').select('id').eq('produkt_id', produktId).single()
  if (!existingConfig) {
    const { error: cErr } = await supabase.from('produkt_config').insert({ ...PRODUKT_CONFIG, produkt_id: produktId })
    if (cErr) { console.error('Config error:', cErr); process.exit(1) }
  }
  console.log('  ✓ Config ready\n')

  // 4. Build wissensfundus context for Claude
  const wissensfundus = WISSEN.map(w => `### ${w.thema}\n${w.inhalt}`).join('\n\n')
  const wissensfundusBlock = `## Wissensfundus-Kontext\n\n${wissensfundus}`

  // 5. Generate content
  console.log('🤖 Step 4: Generating content with Claude (this takes a few minutes)…\n')

  const pages = await Promise.allSettled([
    generateHauptseite(wissensfundusBlock, produktId),
    generateFaq(wissensfundusBlock, produktId),
    generateVergleich(wissensfundusBlock, produktId),
    generateTarif(produktId),
    generateRatgeber(wissensfundusBlock, produktId, 'was-ist-sterbegeld', 'Was ist eine Sterbegeldversicherung?'),
    generateRatgeber(wissensfundusBlock, produktId, 'fuer-wen', 'Für wen ist eine Sterbegeldversicherung sinnvoll?'),
    generateRatgeber(wissensfundusBlock, produktId, 'kosten-leistungen', 'Kosten und Leistungen der Sterbegeldversicherung'),
  ])

  const content = pages
    .filter((p): p is PromiseFulfilledResult<Awaited<ReturnType<typeof generateHauptseite>>> => p.status === 'fulfilled')
    .map(p => p.value)

  pages.forEach((p, i) => {
    if (p.status === 'rejected') console.warn(`  ⚠️  Page ${i} failed:`, p.reason?.message)
  })

  // 6. Insert content (upsert by produkt_id + page_type for hauptseite/faq/vergleich/tarif; insert for ratgeber)
  console.log(`\n💾 Step 5: Saving ${content.length} pages…`)
  for (const page of content) {
    if (page.page_type === 'ratgeber') {
      const { error } = await supabase.from('generierter_content').insert({ ...page, generated_at: new Date().toISOString() })
      if (error) console.warn(`  ⚠️  Could not save ${page.page_type} (${page.slug}):`, error.message)
      else console.log(`  ✓ ${page.page_type} — ${page.slug}`)
    } else {
      // Delete existing then insert fresh
      await supabase.from('generierter_content').delete().eq('produkt_id', produktId).eq('page_type', page.page_type)
      const { error } = await supabase.from('generierter_content').insert({ ...page, generated_at: new Date().toISOString() })
      if (error) console.warn(`  ⚠️  Could not save ${page.page_type}:`, error.message)
      else console.log(`  ✓ ${page.page_type}`)
    }
  }

  // 7. Set product to aktiv
  console.log('\n🚀 Step 6: Publishing product…')
  const { error: statusErr } = await supabase.from('produkte').update({ status: 'aktiv' }).eq('id', produktId)
  if (statusErr) console.warn('  ⚠️  Could not set product aktiv:', statusErr.message)
  else console.log('  ✓ Product status → aktiv')

  console.log('\n✅ Done! Visit http://localhost:3001/sterbegeld24plus')
}

main().catch(e => { console.error(e); process.exit(1) })
