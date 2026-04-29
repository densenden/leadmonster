/**
 * Expanded Wissensfundus Seed Script
 *
 * Idempotent — upserts factual German insurance reference articles.
 * Safe to run multiple times (conflict key: kategorie + thema).
 *
 * Categories:
 *   sterbegeld (3 additional articles)
 *   pflege     (3 articles)
 *   allgemein  (3 articles)
 *
 * Run with:
 *   npx tsx scripts/seed-wissensfundus-expanded.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

// ─── Articles ─────────────────────────────────────────────────────────────────

const articles = [

  // ── Sterbegeld (additional 3) ─────────────────────────────────────────────

  {
    kategorie: 'sterbegeld',
    thema: 'bestattungskosten_regional',
    inhalt: `# Bestattungskosten in Deutschland — regionale Unterschiede

Die Kosten einer Bestattung variieren in Deutschland je nach Bundesland und Region erheblich.

## Durchschnittliche Kosten nach Art

Eine Erdbestattung kostet im bundesweiten Durchschnitt zwischen 6.000 und 10.000 Euro. Eine Feuerbestattung ist mit 3.500 bis 6.000 Euro günstiger, da Sarggebühren entfallen und günstigere Urnengräber genutzt werden können.

## Regionale Unterschiede

In Großstädten wie München oder Hamburg können Bestattungskosten deutlich über dem Bundesdurchschnitt liegen — vor allem durch höhere Friedhofsgebühren und Grundstückskosten. In ländlichen Regionen Sachsens oder Mecklenburg-Vorpommerns liegen die Kosten häufig unter dem Durchschnitt.

## Was ist im Betrag enthalten?

- **Überführung:** 300–800 Euro
- **Sarg oder Urne:** 500–3.500 Euro
- **Bestattungsunternehmen (Dienstleistungen):** 1.500–3.000 Euro
- **Friedhofsgebühren (Grab, Nutzungsrecht):** 1.000–5.000 Euro
- **Trauerfeier und Blumen:** 500–2.000 Euro
- **Grabstein:** 800–3.000 Euro

## Sterbegeldversicherung als Puffer

Eine Sterbegeldversicherung zwischen 5.000 und 15.000 Euro deckt in den meisten Fällen die direkten Bestattungskosten ab und entlastet Hinterbliebene in einer emotional schwierigen Situation.`,
    tags: ['sterbegeld', 'bestattung', 'kosten', 'regional'],
  },

  {
    kategorie: 'sterbegeld',
    thema: 'wartezeiten_erklaert',
    inhalt: `# Wartezeiten bei der Sterbegeldversicherung

## Was ist eine Wartezeit?

Als Wartezeit bezeichnet man den Zeitraum nach Vertragsabschluss, in dem noch keine volle Leistung ausgezahlt wird. Stirbt die versicherte Person während der Wartezeit, erhalten Hinterbliebene in der Regel nur die bis dahin gezahlten Beiträge zurück.

## Übliche Wartezeiten im Markt

- **0 Monate:** Kein Warten — Leistung ab Tag 1. Typisch für Angebote mit Gesundheitsfragen oder vereinfachter Gesundheitsprüfung.
- **3 Jahre:** Klassische Wartezeit bei Tarifen ohne jede Gesundheitsfrage (garantierte Aufnahme für alle).
- **2 Jahre:** Häufiger Kompromiss bei vereinfachten Gesundheitsfragen.

## Ausnahme: Unfalltod

Fast alle Tarife zahlen bei Unfalltod ohne Wartezeit — unabhängig davon, ob der natürliche Tod noch der Wartezeit unterliegt.

## Praktische Bedeutung für die Produktwahl

Wer jung und gesund ist, sollte einen Tarif mit kurzer oder keiner Wartezeit und Gesundheitsfragen bevorzugen — die Beiträge sind deutlich günstiger. Wer Vorerkrankungen hat oder älter ist, akzeptiert oft eine 3-jährige Wartezeit gegen garantierte Aufnahme.

## Empfehlung

Immer das Kleingedruckte lesen: Manche Anbieter unterscheiden zwischen einer Wartezeit für den Todesfall allgemein und einer separaten Regelung für bestimmte Vorerkrankungen (z.B. Herzerkrankungen im ersten Jahr).`,
    tags: ['sterbegeld', 'wartezeit', 'garantie', 'aufnahme'],
  },

  {
    kategorie: 'sterbegeld',
    thema: 'sterbegeld_vs_risikoleben',
    inhalt: `# Sterbegeldversicherung vs. Risikolebensversicherung

## Zwei verschiedene Produkte für verschiedene Ziele

Sterbegeldversicherung und Risikolebensversicherung werden oft verwechselt, dienen aber unterschiedlichen Zwecken.

## Sterbegeldversicherung

- **Zweck:** Deckung der Bestattungskosten und Entlastung der Hinterbliebenen
- **Versicherungssumme:** 3.000–25.000 Euro
- **Laufzeit:** Lebenslang — kein Ablaufdatum
- **Zielgruppe:** Menschen ab 50, häufig mit dem Wunsch, niemandem zur Last zu fallen
- **Aufnahme:** Oft ohne oder mit vereinfachten Gesundheitsfragen möglich
- **Beitrag:** Höher im Verhältnis zur Leistung, dafür sicheres Lebenslang-Prinzip

## Risikolebensversicherung

- **Zweck:** Absicherung von Angehörigen bei Hauptverdienerausfall (Kredit, Unterhalt)
- **Versicherungssumme:** 100.000–500.000 Euro und mehr
- **Laufzeit:** Befristet (z.B. 20 oder 30 Jahre)
- **Zielgruppe:** Familien mit Kindern, Immobilienkäufer
- **Aufnahme:** Umfangreiche Gesundheitsprüfung erforderlich
- **Beitrag:** Günstiger pro Euro Versicherungssumme, aber endet mit Laufzeit

## Fazit: Welches Produkt wann?

| Situation | Empfehlung |
|---|---|
| 55 Jahre, keine Familie, möchte Bestattung regeln | Sterbegeld |
| 35 Jahre, Kinder, Immobilienkredit | Risiko-Leben |
| 60 Jahre, möchte Erben entlasten | Sterbegeld |
| 40 Jahre, Unternehmer mit Teilhaber | Risiko-Leben |

Beide Produkte können sich ergänzen — ein Kombischutz ist für viele Familien sinnvoll.`,
    tags: ['sterbegeld', 'risikoleben', 'vergleich', 'absicherung'],
  },

  // ── Pflege (3 articles) ───────────────────────────────────────────────────

  {
    kategorie: 'pflege',
    thema: 'pflegeversicherung_grundlagen',
    inhalt: `# Pflegeversicherung in Deutschland — Grundlagen

## Gesetzliche vs. private Pflegeversicherung

In Deutschland ist die gesetzliche Pflegeversicherung (SPV) für alle Kassenpatienten Pflicht. Sie deckt jedoch nur einen Teil der tatsächlich entstehenden Pflegekosten — die sogenannte „Pflegelücke" müssen Betroffene selbst schließen.

## Was leistet die gesetzliche Pflegeversicherung?

Die SPV zahlt je nach Pflegegrad monatliche Sachleistungsbeträge oder Pflegegeld. Diese Beträge wurden zuletzt 2024 angehoben, decken aber bei stationärer Pflege oft nur 40–60 % der tatsächlichen Heimkosten.

## Die Pflegelücke

Ein Pflegeheimplatz kostet in Deutschland im Durchschnitt 2.500–4.500 Euro pro Monat (2025). Der Eigenanteil für Bewohner (nach SPV-Leistung) liegt meist zwischen 1.500 und 2.500 Euro monatlich. Über mehrere Jahre summieren sich diese Kosten auf 50.000–200.000 Euro.

## Private Pflegezusatzversicherung

Private Pflegezusatzversicherungen schließen die Lücke. Gängige Formen:
- **Pflegetagegeld:** Täglicher Geldbetrag ab einem bestimmten Pflegegrad
- **Pflegerente:** Monatliche Rente im Pflegefall
- **Pflegekostenversicherung:** Erstattet tatsächliche Mehrkosten

## Wichtig: Je früher, desto günstiger

Wer jung und gesund eine Pflegezusatzversicherung abschließt, zahlt deutlich niedrigere Beiträge. Im Pflegefall selbst ist ein Neuabschluss meist nicht mehr möglich.`,
    tags: ['pflege', 'pflegeversicherung', 'grundlagen', 'gesetzlich'],
  },

  {
    kategorie: 'pflege',
    thema: 'pflegegrade_erklaert',
    inhalt: `# Pflegegrade 1–5 — Was bedeuten sie?

## Das Pflegegradmodell seit 2017

Seit dem 1. Januar 2017 gibt es in Deutschland fünf Pflegegrade statt der früheren drei Pflegestufen. Maßgeblich ist nicht mehr die Zeit, die für Pflege benötigt wird, sondern der Grad der Selbstständigkeit der betroffenen Person.

## Pflegegrad 1 — Geringe Beeinträchtigung

Punktwert: 12,5 bis unter 27 Punkte. Die Person ist weitgehend selbstständig, benötigt aber vereinzelte Unterstützung. Kein Anspruch auf Pflegegeld, jedoch auf Entlastungsbetrag (125 €/Monat).

## Pflegegrad 2 — Erhebliche Beeinträchtigung

Punktwert: 27 bis unter 47,5 Punkte. Regelmäßige Alltagsunterstützung nötig. Pflegegeld: 332 €/Monat (2025), Sachleistung: 761 €/Monat.

## Pflegegrad 3 — Schwere Beeinträchtigung

Punktwert: 47,5 bis unter 70 Punkte. Umfangreichere Unterstützung erforderlich. Pflegegeld: 572 €/Monat, Sachleistung: 1.432 €/Monat.

## Pflegegrad 4 — Schwerste Beeinträchtigung

Punktwert: 70 bis unter 90 Punkte. Starke Einschränkung fast aller Alltagsaktivitäten. Pflegegeld: 764 €/Monat, Sachleistung: 1.778 €/Monat.

## Pflegegrad 5 — Schwerste Beeinträchtigung mit besonderem Bedarf

Punktwert: 90 bis 100 Punkte. Vollständige Abhängigkeit von Pflege. Pflegegeld: 946 €/Monat, Sachleistung: 2.200 €/Monat.

## Wie wird der Pflegegrad festgestellt?

Der Medizinische Dienst (MD) besucht die Person zu Hause und erstellt ein Gutachten anhand von sechs Lebensbereichen: Mobilität, kognitive Fähigkeiten, Verhaltensweisen, Selbstversorgung, Umgang mit Erkrankungen, Alltagsleben.`,
    tags: ['pflege', 'pflegegrad', 'leistung', 'begutachtung'],
  },

  {
    kategorie: 'pflege',
    thema: 'pflegekosten_deutschland',
    inhalt: `# Pflegekosten in Deutschland — aktuelle Zahlen

## Stationäre Pflege (Pflegeheim)

Die Gesamtkosten für einen Pflegeheimplatz setzen sich zusammen aus:
- Pflegekosten (eigentliche Pflegeleistung)
- Unterkunft und Verpflegung
- Investitionskosten des Heims
- Ausbildungsumlage

**Bundesdurchschnitt 2025:** ca. 2.800–4.200 Euro/Monat gesamt
**Abzüglich SPV-Leistung (Pflegegrad 4):** ca. 1.775 €
**Durchschnittlicher Eigenanteil:** ca. 1.100–2.500 €/Monat

Der Eigenanteil ist seit 2022 für alle Pflegegrade in einem Heim gleich (sogenannter einheitlicher Eigenanteil).

## Ambulante Pflege (zu Hause)

Ambulante Pflege zu Hause ist häufig günstiger, aber nur wenn Angehörige mithelfen. Kosten für professionelle Pflegedienste:
- Grundpflege: 20–40 €/Einsatz
- Behandlungspflege: 15–25 €/Einsatz
- Monatliche Gesamtkosten: 800–2.500 €

## Regionale Unterschiede

Bayern und Baden-Württemberg sind am teuersten (Heimkosten bis 5.000 €/Monat). Sachsen und Thüringen liegen oft 30–40 % darunter.

## Empfehlung: Frühzeitig planen

Wer mit 45 Jahren eine Pflegetagegeldversicherung über 50 €/Tag abschließt, zahlt monatlich ca. 30–50 Euro Beitrag und sichert sich im Pflegefall eine substanzielle Ergänzung zur gesetzlichen Leistung.`,
    tags: ['pflege', 'kosten', 'heimkosten', 'eigenanteil'],
  },

  // ── Allgemein (3 articles) ────────────────────────────────────────────────

  {
    kategorie: 'allgemein',
    thema: 'versicherung_vergleichen_tipps',
    inhalt: `# Versicherungen vergleichen — worauf es wirklich ankommt

## Der günstigste Beitrag ist nicht immer das beste Angebot

Beim Versicherungsvergleich ist der monatliche Beitrag oft das erste, was Verbraucher sehen. Doch entscheidend sind Leistungsumfang, Bedingungen und der Umgang des Versicherers mit Schäden.

## 5 wichtige Vergleichskriterien

### 1. Leistungsumfang
Was genau ist versichert? Welche Ausschlüsse gelten? Ein günstiger Tarif mit vielen Ausschlüssen ist oft wertlos im Leistungsfall.

### 2. Wartezeiten und Karenzzeiten
Wie lange dauert es, bis Leistungen beginnen? Besonders bei Berufsunfähigkeits-, Pflege- und Krankenzusatzversicherungen relevant.

### 3. Gesundheitsfragen und Aufnahmebedingungen
Welche Vorerkrankungen müssen angegeben werden? Wer hier unvollständig antwortet, riskiert die Leistungsfreiheit des Versicherers.

### 4. Finanzstärke des Versicherers
Versicherungen sind Langzeitverträge. Ratings von Agenturen wie Assekurata, Morgen & Morgen oder S&P geben Auskunft über die finanzielle Stabilität.

### 5. Kundenbewertungen und Schadenregulierung
Erfahrungsberichte anderer Kunden — insbesondere zur Schadenbearbeitung — sind aussagekräftiger als Werbeversprechen.

## Online-Vergleich: Chancen und Grenzen

Vergleichsportale zeigen viele Tarife auf einen Blick. Sie sind ein guter Startpunkt, ersetzen aber keine individuelle Beratung — besonders bei komplexen Produkten wie Berufsunfähigkeitsversicherungen.

## Tipp: Beratungsprotokoll anfordern

Beim Abschluss über einen Makler hat der Kunde Anspruch auf ein schriftliches Beratungsprotokoll. Dieses dokumentiert, welche Produkte empfohlen wurden und warum.`,
    tags: ['allgemein', 'vergleich', 'tipps', 'beratung'],
  },

  {
    kategorie: 'allgemein',
    thema: 'online_abschluss_sicherheit',
    inhalt: `# Versicherung online abschließen — so geht es sicher

## Online-Abschluss: Normal und sicher

Der Abschluss von Versicherungen im Internet ist heute Standard. Technisch gesehen gilt dasselbe wie für Online-Banking: Sicherer Datenübertragung und geprüfte Anbieter sind entscheidend.

## Worauf bei der Webseite achten?

- **HTTPS:** Prüfen Sie das Schloss-Symbol in der Browser-Adressleiste — HTTPS ist Pflicht
- **Impressum:** Seriöse Anbieter haben ein vollständiges Impressum mit Anschrift und Kontaktdaten
- **Aufsicht:** Versicherungsvermittler benötigen eine Zulassung der IHK (§ 34d GewO) oder der BaFin
- **Datenschutzerklärung:** Muss vorhanden und verständlich sein

## Typischer Ablauf beim Online-Abschluss

1. Tarifrechner oder Angebotsformular ausfüllen
2. Angebot prüfen und Tarif wählen
3. Persönliche Daten und Gesundheitsfragen beantworten (bei manchen Produkten)
4. Antrag digital unterschreiben (DocuSign, qualifizierte elektronische Signatur)
5. Policendokumente per E-Mail oder im Kundenportal erhalten

## Widerrufsrecht

Bei online abgeschlossenen Verträgen gilt in Deutschland ein **14-tägiges Widerrufsrecht** ohne Angabe von Gründen. Die Frist beginnt mit Erhalt der Police.

## Gesundheitsfragen: Vollständigkeit ist Pflicht

Auch online müssen Gesundheitsfragen vollständig und wahrheitsgemäß beantwortet werden. Falschangaben berechtigen den Versicherer, die Leistung zu verweigern oder den Vertrag anzufechten.`,
    tags: ['allgemein', 'online', 'sicherheit', 'abschluss', 'digital'],
  },

  {
    kategorie: 'allgemein',
    thema: 'makler_vs_direktversicherer',
    inhalt: `# Versicherungsmakler vs. Direktversicherer — Vor- und Nachteile

## Zwei Wege zum Versicherungsschutz

In Deutschland können Versicherungen direkt beim Versicherer oder über einen unabhängigen Vermittler (Makler) abgeschlossen werden. Beide Wege haben ihre Berechtigung.

## Direktversicherer

Direktversicherer wie HUK24, Cosmos Direkt oder Getsafe verzichten auf ein Filialnetz und verkaufen ausschließlich online oder telefonisch. Dies spart Kosten, die als niedrigere Beiträge weitergegeben werden können.

**Vorteile:**
- Oft günstigere Beiträge
- Transparente Online-Abwicklung
- Schneller Abschluss ohne Termine

**Nachteile:**
- Nur eigene Produkte im Angebot (kein Marktüberblick)
- Beratungsqualität variiert
- Bei komplexen Fragen weniger individuelle Unterstützung

## Versicherungsmakler

Ein unabhängiger Makler ist gesetzlich der Interessenvertreter des Kunden (§ 60 VVG). Er muss den Markt analysieren und das für den Kunden passendste Angebot empfehlen.

**Vorteile:**
- Marktübergreifender Vergleich (Zugang zu vielen Anbietern)
- Individuelle Beratung und Dokumentation
- Unterstützung im Schadenfall
- Haftung für Falschberatung

**Nachteile:**
- Courtage (Provision) ist in der Prämie eingepreist — Tarife daher manchmal etwas teurer
- Qualität stark maklerabhängig

## Fazit: Wann was?

Für standardisierte Produkte (Kfz, Haftpflicht) reicht oft ein Direktversicherer. Bei komplexen Produkten (BU, Kranken, Lebensversicherung) ist ein unabhängiger Makler empfehlenswert.`,
    tags: ['allgemein', 'makler', 'direktversicherer', 'beratung', 'vergleich'],
  },
]

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding ${articles.length} wissensfundus articles…\n`)

  for (const article of articles) {
    const { error } = await supabase
      .from('wissensfundus')
      .upsert(article, { onConflict: 'kategorie,thema' })

    if (error) {
      console.error(`  ✗ [${article.kategorie}] ${article.thema}:`, error.message)
    } else {
      console.log(`  ✓ [${article.kategorie}] ${article.thema}`)
    }
  }

  console.log('\n✅ Done.')
}

main().catch(err => {
  console.error('Seed error:', err)
  process.exit(1)
})
