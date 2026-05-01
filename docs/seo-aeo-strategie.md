# SEO/AEO/GEO-Strategieplan für LeadMonster

> Stand: 2026-05-01 · Bezug: [CLAUDE.md](../CLAUDE.md), Phasen 2/3/5/7
> Ziel: Auffindbarkeit der KI-generierten Versicherungs-Inhalte in klassischer Suche (SEO) **und** in LLM-Antworten (AEO/GEO) bei knallharter Wettbewerbslage (Check24, Verivox, Allianz, Finanztip).

---

## 1. Zusammenfassung in drei Sätzen

LeadMonster hat ein technisch starkes Fundament (Next.js SSR, JSON-LD, llms.txt, AI-Crawler explizit erlaubt) — die Findability-Lücke liegt nicht in der Technik, sondern in **Volumen, Tiefe und Vertrauenssignalen** der Inhalte. Versicherung ist ein **YMYL-Thema** (Your Money or Your Life), das Google überproportional streng nach E-E-A-T (Experience/Expertise/Authoritativeness/Trustworthiness) bewertet — bei rein KI-generiertem Content ohne menschliches Profil-Signal droht die „Helpful-Content"-Abwertung. Der Wissensfundus ist **strategisch korrekt öffentlich indexierbar** zu halten — er ist der einzige skalierbare Hebel, um Long-Tail-Traffic und topische Autorität gegen die Großen aufzubauen, vorausgesetzt jeder Eintrag hält Mindestqualität.

---

## 2. Was ist bereits gut gelöst (technisch)

Die Architektur erfüllt die meisten technischen SEO-Anforderungen schon out-of-the-box:

- **Server-Side-Rendering** über Next.js App-Router → Crawl-Bar in unter 200 ms.
- **Schema.org JSON-LD** pro `page_type` (Insurance, FAQ, Product, BreadcrumbList, HowTo, Article) → Rich-Results-fähig.
- **`generateMetadata()`** zieht `meta_title`/`meta_desc` aus der DB → kein verwaister `<title>`.
- **`short_pitch`** als 2-3-Satz-Definition direkt im Hero → AEO-relevant, weil LLMs den ersten kohärenten Absatz extrahieren.
- **`robots.ts`** erlaubt explizit GPTBot, ClaudeBot, PerplexityBot, Google-Extended → AEO-Pflicht ist gesetzt.
- **`llms.txt`** unter `/api/seo/llms` ausgeliefert.
- **Sitemap** umfasst Produkte, Blog, Wissen.
- **Auto-Cross-Linking** (geplant in `lib/linker/auto-link.ts`) erzeugt internes Link-Equity zwischen Wissensfundus und Produktseiten.
- **VergleichsRechner** mit echten Anbieterdaten + `besonderheiten` → einzigartiger, nicht-skalierbar-replizierbarer Mehrwert (das ist Gold für Google).
- **Eigene Tarif-/Vergleichs-Routen** (`/<produkt>/vergleichsrechner`) statt Drittanbieter-iframe → Lead- und Indexierungs-Hoheit.

Diese Basis ist solide. Der Wettbewerbsvorteil liegt aber **nicht** hier — den hat jede zweite moderne Versicherungsseite auch.

---

## 3. Wo der Plan kritisch ausgebaut werden muss

### 3.1 E-E-A-T und das YMYL-Problem (höchste Priorität)

Versicherung ist nach Google-Quality-Rater-Guidelines kategorisch YMYL. Das bedeutet:

- Reine KI-Texte ohne **identifizierbaren menschlichen Autor mit Qualifikationsnachweis** ranken seit dem März-2024-Core-Update messbar schlechter.
- Jeder Ratgeber-/Blog-/Wissens-Artikel braucht ein **Author-Schema** mit Name, Foto, Funktion, Qualifikation (z. B. „Versicherungsfachmann IHK / § 34d GewO Erlaubnis Nr. …").
- Auf Domain-Ebene braucht es ein vollständiges **Impressum nach § 5 TMG**, ein **Vermittlerregister-Eintrag** sowie **Erstinformation nach § 15 VersVermV** verlinkt im Footer.
- Sichtbar machen: „Geprüft am … von …" + „Letzte Aktualisierung …" als sichtbare Metadaten am Artikel-Anfang **und** im Schema (`dateModified`, `reviewedBy`).

**Empfehlung:** Tabelle `redaktion` mit Personen (Name, Bio, `image_url`, `qualifikation`, `vermittlerregister_nr`) + FK in `blog_posts` und `wissensfundus`. Der Generator schreibt automatisch `author_id` aus einem Pool, der Vertrieb prüft und fügt seine Bio-Bestandteile zu. Ohne dieses Signal landet selbst exzellenter Content in Position 30+.

### 3.2 KI-Content-Detektion und „Helpful Content"-Risiko

Google hat seit 2024 mehrere Updates explizit gegen „skalierte KI-Content-Farmen" gefahren. Die Parade dagegen ist nicht „weniger KI", sondern:

- **Originalität durch eigene Daten**: Die `besonderheiten`-jsonb-Spalte und die VergleichsRechner-Tabelle sind das wertvollste Asset — sie existieren so nirgendwo sonst im Web. Diese Daten müssen **zentral auf jeder relevanten Seite** referenziert werden, nicht nur auf einer Unterseite.
- **Eigene Sicht/Meinung pro Artikel**: KI-Default-Output ist Mittelwert-Sprache. Der Prompt-Builder sollte pro Ratgeber einen **„Erfahrungs-Snippet"** einfordern („In unserer Beratungspraxis sehen wir am häufigsten …") und eine echte Fall-/Beispiel-Section anhängen. Diese Snippets können vorab vom Vertrieb in einer Tabelle `praxis_snippets` gepflegt werden — der Generator zieht passende per Tag-Match.
- **Kein direkter LLM-Stil**: Der Prompt sollte explizit **Listicles und „In diesem Artikel erfährst du …"-Einleitungen verbieten** — beides triggert KI-Detektoren.
- **Mensch-im-Loop dokumentieren**: `generierter_content.status='review' → 'publiziert'` muss zwingend ein Kürzel der prüfenden Person speichern (`reviewed_by`, `reviewed_at`).

### 3.3 Cannibalization zwischen ähnlichen Produktseiten

Mit fünf Produkten und je 3-4 Subseiten + Ratgebern entstehen schnell semantisch überlappende Seiten („Was kostet eine Sterbegeldversicherung" vs. „Sterbegeldversicherung Beitrag Rechner" vs. „Tarife Sterbegeld"). Ohne klare Keyword-Map kannibalisieren sie sich gegenseitig.

**Empfehlung:** Vor Content-Generierung **Keyword-Cluster pro Produkt** als Pflichtfeld in `produkt_config` ablegen. Pro Cluster genau **eine** Hauptseite, alle weiteren Seiten verlinken mit `rel="canonical"`-Logik darauf bzw. behandeln nur klar abgegrenzte Subaspekte. Ratgeber dürfen nie das Hauptkeyword als H1 tragen — nur Long-Tail-Varianten.

### 3.4 Lokale Suchintention fehlt komplett

„Sterbegeldversicherung Berlin", „Berufsunfähigkeitsversicherung Hamburg" — das sind hochkonvertierende Long-Tail-Queries, die der aktuelle Generator nicht abdeckt. Für ein Vermittler-Geschäft, das in Wirklichkeit in einer geographischen Region operiert, ist das fahrlässig.

**Empfehlung:** Pro Produkt ein optionales Feld `regionale_landingpages: text[]` in `produkt_config`. Generator erzeugt pro Stadt eine `[produkt]/standort/[stadt]`-Seite mit Local-Business-Schema, lokalen Sterblichkeits-/Pflegestatistiken (öffentliche Destatis-Daten), Bezug zur Filiale finanzteam26. Start mit den zehn DACH-Top-Städten reicht für 50 zusätzliche Landingpages mit fast keinem Cannibalization-Risiko.

### 3.5 Frische und Pflegeintervall

Versicherungs-Tarife ändern sich, Gesetzeslagen ändern sich (BU-Reform, GKV-Beitragssatz, Pflegegrade). Statische KI-Texte veralten — und Google sieht das.

**Empfehlung:** Felder `next_review_at` + `freshness_score` in `generierter_content` und `wissensfundus`. Cronjob (siehe `anthropic-skills:schedule`) checkt alle 90 Tage; Admin-Dashboard zeigt „Inhalte mit Re-Review fällig". Nur veröffentlichte Inhalte mit `dateModified` < 12 Monate ranken in YMYL-Bereichen zuverlässig.

### 3.6 Backlinks — der einzige Faktor, den die DB nicht löst

Topische Autorität entsteht nicht aus interner Verlinkung allein. Ohne Backlinks von themenrelevanten Domains (Fachverband, Versicherungsforen, Test-/Vergleichsseiten, Lokalpresse, IHK) bleibt LeadMonster eine Insel.

**Empfehlung:** Parallel zur Content-Produktion ein Outreach-Programm: Gast-Beiträge bei Fachblogs (Procontra, Versicherungsbote, Pfefferminzia), Branchenverzeichnis-Einträge (BVK, AfW), HARO-/PR-Anfragen mit Statement-Angeboten. Ein dedizierter `/presse`-Bereich mit zitierfähigen Marktstatistiken (gespeist aus der eigenen Tarif-DB → echte Daten, die Journalisten gerne übernehmen) ist ein 10x-Hebel und sollte **vor** Phase 7 starten.

### 3.7 Schema-Markup-Lücken

Das System hat bereits Insurance-, FAQ-, Product-, Article-Schema. Was fehlt, lohnt aber ungemein:

- `Offer` mit `priceSpecification` aus Tarif-DB → Preise direkt in der SERP (CTR-Hebel).
- `Review`/`AggregateRating` — sobald echte Kundenstimmen aus Convexa zurückfließen.
- `SpeakableSpecification` für Voice-Search (Alexa, Siri).
- `BreadcrumbList` ist gesetzt — bitte auch **sichtbar im DOM** rendern.

### 3.8 Page-Experience und Core Web Vitals

Bei VergleichsRechner-Seiten besteht Gefahr für hohen LCP, weil Tabelle erst nach Client-Eingabe rendert. Mindestens das Skelett (alle Anbieter, Default-Werte) sollte server-seitig vorgerendert sein. **Lighthouse-CI in den Vercel-Build-Schritt** einhängen, Schwellwerte: LCP < 2.5 s, CLS < 0.1, INP < 200 ms.

---

## 4. Wissensfundus: indexierbar oder nicht?

Klare Empfehlung: **Indexierbar lassen — er ist das wichtigste Findability-Asset des gesamten Systems.** Begründung im Detail:

**Warum öffentlich:** Google bewertet topische Autorität als „wieviele eng verzahnte Inhalte deckt eine Domain zu Thema X ab". Ein versteckter Wissensfundus liefert null externe Signale. Die Long-Tail-Queries (z. B. „Wartezeit Sterbegeldversicherung umgehen", „Pflegegrad 3 Beitragsbefreiung BU") sind genau dort zu Hause — Produktseiten können sie aus Konversionsgründen nicht abdecken, ohne ihre Hauptbotschaft zu verwässern. Außerdem: Auto-Cross-Linking bringt nur dann Link-Equity zur Produktseite, wenn die Quellseite indexiert ist.

**Bedingungen für die Sichtbarkeit:** Jeder `wissensfundus`-Eintrag muss vor `published=true` mindestens 800 Wörter haben, eine eigene Frage als H1 tragen, eine 40-60-Wörter-Antwort direkt nach H1 (AEO-Snippet-Format) führen und mindestens drei interne Links setzen — zwei zu anderen Wissens-Einträgen, einen zur passenden Produktseite. Einträge unter 800 Wörtern bleiben `published=false` und werden gemerged oder ergänzt.

**Was nicht indexiert sein soll:** `entwurf`- und `review`-Stadien (`<meta name="robots" content="noindex">`), Tag- und Kategorie-Übersichten ohne kuratorische Beschreibung (klassische Thin-Content-Falle), interne Such-Ergebnisseiten. `app/sitemap.ts` zieht **nur** Einträge mit `published=true AND wortzahl>=800`.

**Die `link_phrases`-Mechanik ist exzellent — aber gefährlich, wenn überdosiert.** Mehr als drei interne Links pro 500 Wörter wirkt spammy. Der Auto-Linker sollte hart auf max. 1 Link pro Phrase und max. 5 Links pro Sektion limitieren.

---

## 5. Wieviel Content braucht die Seite, um relevant zu werden?

Realistische Größenordnungen für den deutschen Versicherungsmarkt mit etablierter Konkurrenz:

| Etappe | Indexierte Seiten | Erwartung | Zeitrahmen |
|---|---|---|---|
| **Mindestbasis** | 50-80 | erste Long-Tail-Rankings (Pos. 50-100), kaum Traffic | 0-3 Monate |
| **Sichtbarkeitsschwelle** | 150-200 | erste Rankings auf S. 2-3, AEO-Treffer in Perplexity/Claude | 3-6 Monate |
| **Topische Autorität** | 300-400 | konstante S.-1-Rankings auf Long-Tail, Mid-Tail beginnt | 6-12 Monate |
| **Wettbewerbsfähig** | 500-800 | Mid-Tail auf S. 1, Money-Keywords auf S. 2 erreichbar | 12-24 Monate |
| **Marktteilnehmer-Niveau** | 1.000+ | konkurriert mit Verivox/Check24 auf einzelnen Themen | 24-36 Monate |

**Konkrete Verteilung für die fünf Produkte (Zielwert „topische Autorität"):**

- 5 Produkt-Pillar-Seiten (`/[produkt]`)
- 5 × 4 Subseiten (faq, vergleich, tarife, vergleichsrechner) = 20
- 5 × 25 Ratgeber-Artikel (`/[produkt]/ratgeber/[thema]`) = 125
- 80-120 produktübergreifende Wissensfundus-Einträge (Versicherungsbegriffe, Steuer, Erbrecht, Gesundheitsfragen, Auszahlungsfragen)
- 60-100 Blog-Posts (50 davon aus dem Reimport alter finanzteam26-Inhalte, Rest neu)
- 50 regionale Landingpages (10 Städte × 5 Produkte) als Booster

**Summe: 340-420 Seiten, davon 90-150 in den ersten 3 Monaten.** Das ist mit dem KI-Generator in 4-6 Wochen Erst-Bestückung machbar — Bottleneck ist nicht die Erstellung, sondern das menschliche **Review** (vergleiche 3.1 und 3.2). Plant man 15 Min menschliches Review pro Artikel, sind das 80-100 Stunden für die 340er-Marke.

**Pro Ratgeber-Artikel realistisches Mindestziel:** 1.200-1.800 Wörter, 1 KI-generiertes Hero-Bild + 1-2 Inline-Bilder, 1 eingebetteter Block aus eigener Daten (z. B. Mini-Korridor-Tabelle), Author-Schema, 5+ interne Links, 1-2 externe Quellen (Destatis, BaFin, GDV, BMG). Unter 800 Wörtern macht es keinen Sinn zu publizieren, das wirkt sofort wie Thin-Content.

---

## 6. Stolpersteine, die das Konzept zum Kippen bringen können

In Reihenfolge der Wahrscheinlichkeit:

**Risiko 1 — KI-Erkennung durch Google.** Massengenerierte Texte ohne menschlichen Footprint werden seit den Helpful-Content-Updates aktiv abgewertet. Mitigation siehe 3.1 + 3.2. Ohne diese Maßnahmen ist das gesamte System ein No-Index-Risiko-Vehikel.

**Risiko 2 — Rechtliche Compliance (§ 34d GewO, VVG, DSGVO).** Sobald LeadMonster Versicherungen vermittelt (auch nur via Lead-Weitergabe an finanzteam26), gelten Erstinformations-, Beratungs- und Dokumentationspflichten. Fehlen Impressum, Vermittlerregister, Erstinformation, Datenschutzerklärung mit Auftragsverarbeitung Convexa/Resend/OpenAI/Anthropic explizit gelistet → Abmahn-Risiko (Wettbewerbszentrale, Verbraucherschutz) **und** Google-Trust-Signal-Verlust.

**Risiko 3 — Ranking-Sandbox neuer Domains.** Google traut neuen Domains in YMYL-Themen 6-9 Monate lang grundsätzlich nicht. Erwartungsmanagement: in den ersten 4-5 Monaten kommt der Traffic primär aus AEO (Perplexity, ChatGPT mit Web), Long-Tail-Direktsuchen und Branding — nicht aus Money-Keywords.

**Risiko 4 — Cannibalization unterschätzen.** Fünf Produkte × 4 Seitentypen × 25 Ratgeber = bei naivem Generator-Output schnell 50-100 Seiten, die sich gegenseitig die Ranking-Positionen stehlen. Keyword-Map vor Generierung ist Pflicht.

**Risiko 5 — Bilder von OpenAI sind nicht wahrnehmungs-original.** gpt-image-1 produziert visuell stilistisch ähnliche Outputs für ähnliche Prompts. Risiko: Google-Lens-/Reverse-Image-Search erkennt KI-Stil → Trust-Abwertung. Mitigation: bei den Top-20-Seiten echte Fotos einkaufen oder professionelles Stock (nicht Unsplash für Money-Pages).

**Risiko 6 — Convexa-Lead-Loss bei Convexa-Downtime.** Lead → Supabase → Convexa-Push synchron. Bei Convexa-Ausfall fallen Mails durch (außer der Resync-Mechanismus läuft als Cronjob). Empfehlung: Resync-Job über `anthropic-skills:schedule` automatisieren, alle 15 Min `convexa_synced=false` rebatchen.

**Risiko 7 — DSGVO/Tracking.** UTM-Felder + IP-Logging in Supabase ohne sauberes Cookie-Banner und Auftragsverarbeitungsverträge → Bußgeldrisiko. Außerdem: jede KI-API (Anthropic, OpenAI) muss in der Datenschutzerklärung als Drittland-Verarbeiter genannt sein.

**Risiko 8 — Zu wenig Differenzierung gegen Check24/Verivox.** Diese Plattformen haben Backlink- und Brand-Vorsprung von >10 Jahren. LeadMonster gewinnt nicht über breitere Tarif-Vergleiche, sondern über **Beratungs-Kontext und Nische** (z. B. „Sterbegeld bei Vorerkrankung", „BU für Selbständige Handwerker"). Generator-Prompts sollten diesen Nische-Spin pro Ratgeber zwingend einfordern.

**Risiko 9 — Skalierungs-Penalty.** Wenn pro Tag mehr als 10-20 neue Seiten live gehen, sieht Google das Pattern und drosselt das Crawling. Veröffentlichungs-Schedule auf 5-10 Seiten/Tag in der Aufbauphase begrenzen.

**Risiko 10 — Bilder-Storage-Kosten.** Bei 400 Seiten × 3 Bildern × ~1 MB → 1,2 GB Supabase Storage. Unkritisch, aber: alle Bilder müssen vor Upload als WebP konvertiert und auf max. 250 KB komprimiert werden, sonst killt der LCP die Rankings.

---

## 7. Konkrete Maßnahmen-Priorisierung (nächste 90 Tage)

**Priorität A (vor jedem weiteren Content-Push):**
1. Tabelle `redaktion` + Author-Schema in jeder Page-Type-Komponente verdrahten.
2. Impressum, Vermittlerregister-Verweis, Erstinformation, vollständige Datenschutzerklärung (inkl. Anthropic, OpenAI, Convexa, Resend als Drittland-AV) live.
3. Keyword-Map pro Produkt in `produkt_config.keyword_cluster jsonb` ablegen, Generator validiert dagegen.
4. `next_review_at` + `freshness_score` Migration + Admin-Widget.
5. Lighthouse-CI im Vercel-Pipeline.

**Priorität B (parallel zur Content-Produktion):**
6. Auto-Cross-Linking-Limits implementieren (max. 1 Link pro Phrase, max. 5 pro Sektion).
7. Praxis-Snippets-Tabelle + Generator-Integration.
8. Bilder-Optimierung-Pipeline (WebP + Kompression vor Storage-Upload).
9. Convexa-Resync als geplanter Task (Skill `schedule`).
10. Regionale Landingpages für Top-10-Städte als zusätzlicher Generator-Modus.

**Priorität C (parallel, hoher Hebel auf Mittelfrist):**
11. Backlink-/PR-Programm ankicken (Fachblogs, BVK, IHK, HARO).
12. Echte Kundenstimmen aus Convexa zurück in `Review`-Schema.
13. `Offer`-Schema mit Preis-Spannen aus Tarif-DB.
14. Ein- bis zwei tatsächliche Experten-Reviewer-Profile aufbauen (mit Foto, LinkedIn, IHK-Nachweis), an die Author-Bylines vergeben werden.

---

## 8. Was Erfolg messbar macht

Nicht nur Rankings — folgende Metriken in einem wöchentlichen Dashboard:

- **Indexierungsrate** Google Search Console (Soll: >85 % der Sitemap)
- **Impressions/Klicks** pro `page_type` (zeigt, ob Wissensfundus oder Produktseiten den Long-Tail tragen)
- **Average Position** für definierte Keyword-Cluster
- **AEO-Erwähnungen** (manuelle Stichproben in ChatGPT/Perplexity/Claude.ai mit den 20 Top-Queries — jeden Monat)
- **Lead-CR** pro Einstiegsseiten-Cluster (Wissen → Produktseite → Lead-Form)
- **Convexa-Sync-Rate** (sollte >99 % liegen)
- **Content-Frische**: % Seiten mit `dateModified` < 12 Monate

---

## 9. Antwort auf die Kernfragen kurz

**Wie viel Content?** 150 Seiten für erste Sichtbarkeit, 350-400 Seiten für topische Autorität, 1.000+ um mit den Großen zu konkurrieren. Initial-Roll-out in 4-6 Wochen machbar, das menschliche Review ist der Engpass.

**Wissensfundus indexierbar?** Ja, unbedingt — aber nur Einträge ≥800 Wörter, mit AEO-Snippet-Struktur und ≥3 internen Links. Entwürfe und Tag-Übersichten via `noindex` ausschließen.

**Größtes Risiko?** Nicht die Technik, nicht die Datenbank — sondern fehlende E-E-A-T-Signale (Autoren-Profile, Vermittlerregister, Review-Stempel). Ohne die schlägt Google den ganzen KI-Content systematisch tief.

**Größter ungenutzter Hebel?** Die `besonderheiten`-jsonb-Spalte. Dort liegen Daten, die niemand sonst hat — die müssen in jeder Ratgeber-Section, in jedem AEO-Snippet, in einem `/marktdaten`-Pressbereich präsent sein.
