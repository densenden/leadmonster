# Content-Strategie: Nischen, Anbieter-Tiefe, Kundenbindung

> **Stand: 2026-05-01**
> **Bezug:** [seo-aeo-strategie.md](./seo-aeo-strategie.md), [redaktion-trust-spec.md](./redaktion-trust-spec.md)
> **Anlass:** Strategische Frage zur inhaltlichen Ausrichtung der Nischenseiten und zum Umgang mit Anbietern (Allianz, Barmenia, DELA, …) — Tiefe vs. Breite.

---

## 1. Zuerst: Multi-Brand-Konfiguration entwirren

Im aktuellen Admin-Panel sind aktiv: zwei Sterbegeld-Produkte (`sterbegeld24plus`, `sterbegeld25`) und drei Unfall-Produkte (`unfall-no-problem`, `unfall2000`, `uv`). Solange jedes Produkt eine eigene öffentliche Domain/URL bekommt und alle dasselbe Hauptkeyword („Sterbegeldversicherung", „Unfallversicherung") anzielen, ranken sie sich gegenseitig aus dem Index — Google indexiert in YMYL-Themen pro Domain meist nur eine Variante als Primary, der Rest fliegt in Position 30+ oder wird gar nicht erst gecrawlt.

Drei saubere Auflösungsvarianten — eine davon ist Pflicht:

**Variante A — Strikte Audience-Differenzierung.** Jedes Produkt bekommt eine **eindeutig andere Zielgruppe** plus passendes Long-Tail-Keyword als H1 statt des Hauptkeywords. Beispiel: `sterbegeld24plus` → „Sterbegeld 50+ ohne Gesundheitsprüfung", `sterbegeld25` → „Sterbegeld mit Sofortschutz für Vorerkrankte". Dann konkurrieren sie nicht mehr um identische SERPs. Implementierung: `produkt_config.zielgruppe[]` und `argumente jsonb` jeweils harte Audience-Locks bekommen, Generator validiert dass die H1 das Hauptkeyword **nicht** enthält. Cross-Linking zwischen den Brands weist Nutzer-Pfade aus.

**Variante B — Eines wird Primary, der Rest geht auf NoIndex.** Eines der Sterbegeld-Produkte wird die SEO-Hauptachse, die anderen leben **nur als Vertriebs-/Performance-Marketing-Seiten** (Google Ads, Meta Ads, Direct-Mail-Funnels) mit `<meta name="robots" content="noindex,follow">`. Die NoIndex-Brands behalten ihren eigenen Convexa-Token (Tracking sauber pro Kampagne), erscheinen aber nicht in der organischen Suche. Das ist der pragmatischste Weg, wenn die Multi-Brand-Existenz primär aus Vertriebs- oder Partner-Gründen geboten ist.

**Variante C — Konsolidieren.** Vertrieblich begründbar prüfen, ob wirklich zwei aktive Sterbegeld-Brands gleichzeitig nötig sind. Falls nein, Zweit-Brand archivieren oder per 301-Redirect auf den Primary umlenken — das vererbt Link-Equity sauber.

**Empfehlung (aktualisiert nach Klarstellung 2026-05-01):** Variante A für **alle** Brands. Sterbegeld bekommt klare Audience-Zuteilung (50+/Sofortschutz vs. Vorerkrankte). Bei Unfall ist die Differenzierung schon vorhanden: ein Brand für **Paare/Familie**, ein Brand für **Urlaub/Reise**, der dritte Brand muss noch eine eigene Audience-These bekommen (z. B. Sport/Risikohobby, Senioren 70+ oder Handwerker). Solange jeder Brand auf einem **eigenen Keyword-Cluster** sitzt — also „Unfallversicherung Paare/Ehe", „Reise-Unfallversicherung Auslandsschutz", „Unfallversicherung Sport/Hobby" — kannibalisieren sich die drei nicht. Sie konkurrieren in komplett verschiedenen SERPs. Pflicht: pro Brand H1, `meta_title`, `short_pitch` und `keyword_cluster` (siehe seo-aeo-strategie.md § 3.3) klar disjunkt halten und pro Brand nur **einen** Long-Tail-Rumpf besetzen.

---

## 2. Tiefe schlägt Breite — die Faustregel

Auf die Kernfrage „eigene Unterseite pro Anbieter?" — ja, **aber nicht für alle**. Die richtige Antwort lautet: weniger Anbieter, **dafür dramatisch mehr Tiefe pro Anbieter**.

Begründung: Eine Seite „Sterbegeldversicherung Allianz Erfahrungen" mit 1.800 Wörtern Christian-Wimmer-Praxiswissen rankt im deutschen Markt fast immer auf Seite 1 für ihren Long-Tail — weil die Konkurrenz dort entweder Affiliate-Schrott ist oder die Allianz selbst (die rankt mit Marketing-Sprache, nicht mit ehrlichen Stärken/Schwächen-Analysen). Eine Seite „Allianz Sterbegeld" mit 400 Wörtern Marketing-Lyrik rankt nirgendwo, kannibalisiert dafür aber die Hauptseite.

Die Volumen-Sanity-Rechnung: Top 5-7 Anbieter pro Produkt × 1.500-2.500 Wörter = 7.500-17.500 Wörter pro Produkt. Bei fünf Produkten sind das 35-85 Anbieterseiten **insgesamt**, nicht pro Produkt. Das ist machbar mit dem KI-Generator + Christians Review in 8-12 Wochen, und es ist exakt der Hebel, der die Domain in topische Autorität bringt.

**Welche Anbieter pro Produkt**: die fünf bis sieben, für die in der Tarif-DB bereits Daten existieren (`anbieter_name IS NOT NULL`) **und** die in der Vermittlungspraxis tatsächlich Lead-Volumen generieren. Nicht jeder Anbieter, den es am Markt gibt — das wäre Affiliate-Verhalten und Google erkennt das.

Für Sterbegeld konkret aus dem CSV-Bestand: Allianz, DELA, Ideal, LV1871, NÜRNBERGER, Münchener Begräbnisverein, HDI = 7 Seiten. Für Unfall analog 5-7 Top-Anbieter.

---

## 3. Anatomie einer guten Anbieter-Seite

Eine Anbieter-Seite, die sowohl rankt als auch konvertiert, hat **immer** dieselben sieben Elemente. Jede Sektion ist ein eigenes Schema.org-Element und ein potenzielles AEO-Snippet:

Erstens, der „1-Satz-Marktstandard": eine Frage als H1 („Wie gut ist die Allianz Sterbegeldversicherung wirklich?") und direkt darunter eine 40-60-Wörter-Antwort, die den Kern beantwortet — das ist der Snippet, den Perplexity und ChatGPT extrahieren. Dann der Anbieter-Steckbrief: Marktposition, Gründungsjahr, Bilanzkennzahlen aus öffentlichen Quellen (BaFin, GDV-Statistiken). Dann die Tarif-Faktenbox aus der eigenen `tarife`-Tabelle mit allen `besonderheiten`-Flags als Tabelle — das ist der Inhalt, den niemand anders so strukturiert hat. Dann der **Praxisbericht** in Christians Stimme: „Wir vermitteln die Allianz seit … besonders an … typische Stärke ist … schwierig wird es bei …". Dann der Vergleichs-Block (Allianz vs. DELA vs. LV1871 als Mini-Tabelle, jede Zelle ein Link auf die jeweilige Anbieter-Detailseite — Hub-and-Spoke-Internal-Linking). Dann die produktspezifische FAQ (5-8 Q&A-Pairs aus echten Beratungsfragen). Dann der CTA-Block mit dem VergleichsRechner vorausgefüllt auf diesen Anbieter und einem zweiten CTA „Persönliche Einschätzung von Christian Wimmer anfordern".

Schema-Markup pro Anbieter-Seite: `Product`, `Offer` mit `priceSpecification` (Preisspanne aus Tarif-DB), `Review` (Christians Praxiseinschätzung als Editorial-Review), `FAQPage`, `BreadcrumbList`. Alle fünf zusammen ergeben Rich Snippets in der SERP, was den CTR verdoppelt bis verdreifacht.

Pflicht-Disclaimer am Seitenende: „Christian Wimmer und finanzteam26 vermitteln den genannten Tarif als unabhängiger Versicherungsmakler. Es besteht keine ausschließliche Bindung an die Allianz" — das schützt rechtlich und stärkt gleichzeitig das E-E-A-T-Signal „unabhängige Beratung".

---

## 4. Die Nischen-Matrix: wo Long-Tail wirklich liegt

Reine Anbieter-Seiten sind eine Achse. Die zweite — und aus Lead-Sicht oft profitablere — ist die **Persona-/Lebenssituations-Nische**. Diese Seiten ranken auf Queries, die Hauptseiten nie abdecken können, weil sie zu spezifisch sind.

Vier Nischen-Achsen lohnen sich systematisch:

**Persona-Nische** — Zielgruppen mit klarer Versicherungs-Pain. Für Sterbegeld: Diabetiker, Krebsüberlebende, alleinstehende Frauen 60+, türkischstämmige Familien (wegen Bestattungs-Repatriierung), Witwen/Witwer. Für BU: Handwerker (Christians Spezialgebiet — größter Long-Tail-Hebel im ganzen System), Erzieher, Pflegekräfte, Selbständige unter 30. Für Unfall: Senioren 70+, Kinder, Sportler/Reiter, Motorradfahrer.

**Lebenssituations-Nische** — typische Auslöser-Momente. „Sterbegeld nach Krebs-Diagnose", „BU nach abgelehnter Erstprüfung", „Unfallversicherung nach erstem Reha-Aufenthalt", „Sterbegeld bei laufender Krankschreibung". Diese Queries haben extrem hohe Lead-Konversion, weil der Suchende akut betroffen ist.

**Regional-Nische** — Stadt + Produkt. „Sterbegeldversicherung München", „Versicherungsmakler Neu-Ulm Sterbegeld" (Heimstadt finanzteam26 — Pflicht-Seite), „BU für Handwerker Berchtesgaden" (Christians Standort). Top 10 DACH-Städte × 5 Produkte = 50 Seiten mit fast null Cannibalization.

**Anbieter-Nische** — siehe § 3 oben.

Aus Volumen-Sicht: die Persona- und Lebenssituations-Nischen sind die ergiebigsten — pro Persona 1 Pillar-Page (1.500 Wörter) plus 3-5 unterstützende Ratgeber-Artikel je 1.000 Wörter. Bei 5-7 Personas pro Produkt landet man bei 30-50 Long-Tail-Seiten **pro Produkt**, die jeweils auf 5-15 verwandte Long-Tail-Queries abzielen.

Konkrete Empfehlung für die nächsten 90 Tage: pro aktivem Produkt mindestens drei Persona-Nischen vollständig ausbauen, bevor weitere Anbieter-Seiten dazukommen. Das vermeidet, dass 50 dünne Anbieter-Seiten existieren bevor die Hauptachse-Personas stehen.

---

## 5. Kundenbindung — vom Lead zum Berater-Termin

Die zentrale These: Bei Versicherung gewinnt nicht der mit dem niedrigsten Preis (das ist Verivox), sondern der mit der **glaubwürdigsten Beratung**. Christian Wimmer ist als Person der zentrale Asset — der gesamte Content muss diese persönliche Beratungs-Qualität bewerben, nicht nur Tarife. Sechs Bausteine binden Leads über die Erstanfrage hinaus:

Der erste — und am häufigsten unterschätzte — Hebel ist ein **Beratungs-Termin-Tool** direkt in jeder Produktseite und jedem Vergleichsrechner. Nicht „Angebot anfordern" als Mail-Formular, sondern „15-Minuten-Erstgespräch mit Christian buchen" als Calendly-Embed. Conversion-Ratio ist erfahrungsgemäß doppelt so hoch wie reine Lead-Mail. Und es bringt von Anfang an einen menschlichen Touchpoint statt eines anonymen CRM-Eintrags.

Der zweite Baustein: **personalisierte Vergleichs-PDFs** aus dem VergleichsRechner. Sobald ein Nutzer Geburtsjahr und Wunschsumme eingibt, wird die generierte Tabelle nicht nur als HTML angezeigt, sondern auf Wunsch als ihm zugeschicktes PDF generiert (mit seinem Namen, seiner Eingabe, Christians Empfehlung im Briefkopf). Dazu Mail-Capture, dann läuft die `email_sequenzen`-Tabelle automatisch aus. Das ist auch DSGVO-sauber, weil der Nutzer aktiv das PDF anfordert.

Der dritte Baustein: **Wissens-Downloads als Lead-Magneten**. Ein „Bestattungsvorsorge-Checkliste 2026" als 4-Seiten-PDF, kostenlos gegen Mail. Eine „BU-Antrag-Vorbereitungs-Guide für Handwerker" — Christians Expertise in PDF-Form. Diese Assets binden, weil sie Nutzern einen Mehrwert geben, bevor irgendein Verkaufsdruck entsteht. Pro Produkt 2-3 solcher Downloads.

Der vierte Baustein: **echte Email-Sequenzen mit Mehrwert**. Die `email_sequenzen`-Tabelle ist im Schema vorhanden, sie sollte pro Produkt mit 5-7 Mails über 30-60 Tage befüllt werden. **Nicht** „Hast du schon abgeschlossen?" — sondern „Was passiert eigentlich, wenn die Sterbegeldversicherung nach 6 Monaten Wartezeit greift?", „Drei Fehler bei der Bestattungsvorsorge, die ich in 20 Jahren gesehen habe (Christian Wimmer)", echte redaktionelle Inhalte mit Christian als Absender. Lead-zu-Abschluss-Quoten verdoppeln sich erfahrungsgemäß bei dieser Art Content-Sequenz.

Der fünfte Baustein: **Persona-spezifische WhatsApp-Beratung**, gerade für die Sterbegeld-Zielgruppe (50+, oft mit Bedienungs-Hürden bei Online-Formularen). WhatsApp-Business-Account, „Frag Christian per WhatsApp" als CTA-Button auf jeder Seite. Aufwand minimal, Conversion bei Senioren signifikant höher als bei klassischen Web-Formularen.

Der sechste Baustein: **Feedback-Loop nach 30 Tagen**. Jeder vermittelte Vertrag bekommt nach 30 Tagen automatisch eine Mail „Wie zufrieden waren Sie mit dem Beratungsgespräch? Hätten Sie uns weiterempfohlen?". Die Antworten landen direkt als `kunden_review` in `trust_baustein` (mit DSGVO-Einwilligungs-Checkbox in der Mail). Das speist die Trust-Bausteine, die wiederum die SEO-Glaubwürdigkeit aller anderen Seiten erhöhen — geschlossener Loop.

---

## 6. Konkrete Reihenfolge — was jetzt, was später

Der Effizienzhebel ist nicht „mehr Anbieterseiten". Der Effizienzhebel ist **die richtige Reihenfolge**:

In den nächsten vier Wochen Multi-Brand-Konfiguration auflösen — Audience-Locks für die Sterbegeld-Brands, NoIndex auf zwei der drei Unfall-Brands. Erst danach macht weitere Content-Produktion überhaupt Sinn, weil sonst alles Aufgewendete in der Cannibalization verpufft.

Wochen 5-8: pro Hauptachse-Produkt drei Persona-Pillar-Pages (also etwa „Sterbegeld für Diabetiker", „Sterbegeld 50+ ohne Wartezeit", „Sterbegeld nach Krebs-Diagnose") mit jeweils 1.500 Wörtern, Christians Author-Byline, AuthorReview-Schema, Mini-Vergleich. Das sind 9-15 Seiten, die ab Tag 1 ausschließlich Long-Tail-Traffic anziehen, ohne mit der Hauptseite zu konkurrieren.

Wochen 9-14: Top 5 Anbieter-Seiten pro Produkt — also 25 Anbieter-Detail-Seiten insgesamt — nach dem Schema in § 3. Begleitend pro Anbieter-Seite ein PDF-Lead-Magnet („Allianz Sterbegeld — Checkliste vor Antrag").

Wochen 15-18: Beratungs-Termin-Tool, WhatsApp-Beratung, automatisierte Vergleichs-PDFs, vollständige Email-Sequenzen pro Produkt. Das sind die Conversion-Booster, die die in den Wochen 1-14 generierten Traffic-Mengen monetarisieren.

Wochen 19-26: regionale Landingpages für Top-10-Städte, Marktdaten-Hub aus `besonderheiten`-Aggregation (siehe [redaktion-trust-spec.md § 4](./redaktion-trust-spec.md#4-besonderheiten-jsonb)), erste PR-Pitches für Backlinks.

Realistische Ziel-Metriken nach diesem Plan: nach 6 Monaten ca. 50-80 indexierte Seiten mit Schema, 15-25 Long-Tail-Rankings auf S. 1, 200-400 monatliche organische Sitzungen pro Produkt, Lead-zu-Termin-Conversion bei 8-15 % (statt branchenüblich 2-3 % beim reinen Mail-Lead).

---

## 7. Antworten auf die drei Kernfragen kurz

**Eigene Seite pro Anbieter — ja oder nein?** Ja, aber nur für die 5-7 Top-Anbieter pro Produkt mit jeweils 1.500-2.500 Wörtern in Christians Stimme. Nicht 20 dünne Anbieter-Seiten — das wirkt wie Affiliate-Müll. Allianz und Barmenia bekommen ihre eigenen Deep-Dive-Seiten, ein zwölfter Nischen-Anbieter, den keiner sucht, nicht.

**Weniger Anbieter, mehr Inhalt?** Genau das. Tiefe schlägt Breite in YMYL-Themen immer. Die 1.500-Wörter-Allianz-Seite mit Praxiseinschätzung rankt, die 400-Wörter-Allianz-Marketing-Seite nicht.

**Wie binden wir Kunden über Beratung?** Sechs ineinandergreifende Bausteine: Beratungs-Termin-Tool statt Mail-Formular, personalisierte Vergleichs-PDFs aus dem VergleichsRechner, Wissens-Downloads als Lead-Magneten, redaktionelle Email-Sequenzen mit Christian als Absender, WhatsApp-Beratung für Senioren-Zielgruppen, automatisierter Feedback-Loop nach 30 Tagen, der direkt Trust-Bausteine für die nächsten Seiten füttert. Conversion-Hebel: jedes dieser Elemente einzeln verdoppelt typischerweise eine Subkennzahl, in Summe bewegt sich die Lead-zu-Abschluss-Quote von 2-3 % auf 8-15 %.

**Wichtigste sofortige Maßnahme**, die alles andere blockiert: die Multi-Brand-SEO-Hygiene aus § 1. Wenn das nicht zuerst passiert, verbrennen alle weiteren Investitionen in Content unnötig viel Aufwand.

---

## 8. Domain-Architektur — Entscheidung 2026-05-01 (Single-Domain auf sterbegeld24plus.de)

**Endgültige Entscheidung:** Es gibt **eine** öffentliche Domain für die gesamte LeadMonster-Produktpalette: `sterbegeld24plus.de`. Jedes Produkt — egal ob Sterbegeld, Unfall, BU, Pflege oder Leben — lebt als Subpfad unter dieser Domain. Die Root (`sterbegeld24plus.de/`) ist gleichzeitig die Standard-Produktseite für „Sterbegeld24Plus" (Christians Hauptmarke, Audience 50+). Das ist eine bewusste Single-Domain-Strategie zugunsten maximaler Domain-Authority-Konzentration.

**URL-Struktur:**

```
sterbegeld24plus.de/                              → Sterbegeld24Plus (Default-Produkt, 50+)
sterbegeld24plus.de/sofortschutz                  → Sterbegeld25-Brand (Vorerkrankte/Sofortschutz)
sterbegeld24plus.de/unfall-paare                  → Unfall für Paare/Familie
sterbegeld24plus.de/unfall-reise                  → Reise-/Auslands-Unfallversicherung
sterbegeld24plus.de/unfall-[dritte-audience]      → dritte Unfall-Audience (Sport/Senioren/Handwerker)
sterbegeld24plus.de/bu                            → Berufsunfähigkeit
sterbegeld24plus.de/pflege                        → Pflegezusatzversicherung
sterbegeld24plus.de/leben                         → Risikoleben

sterbegeld24plus.de/wissen/[slug]                 → Wissensfundus (alle Themenbereiche)
sterbegeld24plus.de/blog/[slug]                   → Blog
sterbegeld24plus.de/redaktion/christian-wimmer    → Author-Profil
sterbegeld24plus.de/anbieter/[slug]               → Anbieter-Detail-Seiten (siehe § 3)
sterbegeld24plus.de/marktdaten/[thema]            → Backlink-Hub aus besonderheiten-Aggregation
sterbegeld24plus.de/impressum                     → Impressum (verweist auf finanzteam26 GmbH & Co. KG)
sterbegeld24plus.de/datenschutz                   → Datenschutzerklärung mit AV-Liste
```

**Was passiert mit `finanzteam26.de`?**

Die Domain bleibt für die GmbH bestehen — sie ist als Unternehmens-Website der `finanzteam26 GmbH & Co. KG` ohnehin eigenständig nötig (Hauptauftritt der Gesellschaft, Karriere-Seite, Geschäftskunden-Beratung) und wird im Impressum von `sterbegeld24plus.de` als verantwortliche Gesellschaft genannt. Drei pragmatische Optionen für `finanzteam26.de`:

1. **Bevorzugt:** `finanzteam26.de` bleibt eigenständige Corporate-/Karriere-Website der GmbH ohne Produktinhalte. Im Footer ein Hinweis-Link „Endkundenangebote → sterbegeld24plus.de". So entsteht kein Cross-Domain-Cannibalization, weil die thematischen SERPs disjunkt sind (B2B-/Corporate-Suche vs. Endkunden-Versicherungs-Suche).
2. **Falls bisher Endkunden-Inhalte auf finanzteam26.de liegen** (BU-Unterseiten etc.): die werden als 301-Redirects auf die jeweiligen Subpfade unter `sterbegeld24plus.de/bu/...` geschaltet. Die Backlinks fließen damit auf die neue Hauptdomain.
3. **Maximal aggressiv:** komplette finanzteam26.de-Site wird auf sterbegeld24plus.de 301-Redirected, die GmbH behält die Domain nur für Mail-Adressen. Nur empfohlen, wenn finanzteam26.de wenig eigene Backlinks hat — sonst zerstört es die Gruppen-Wahrnehmung.

**Was sterbegeld24plus.de heute schon hat, das übernommen wird:**
- `/vergleichsrechner` → URL-Kompatibilität halten
- `/muenchener-begraebnisverein/` → 301 auf `/anbieter/muenchener-begraebnisverein`
- `/hdi/` → 301 auf `/anbieter/hdi`
- `/ueber-uns/` → 301 auf `/redaktion/christian-wimmer`
- alle `.html`-Altpfade → siehe initiale Mapping-Tabelle unten

**Technische Konsequenzen für die Codebase:**

1. **`NEXT_PUBLIC_BASE_URL`** in `.env.local` auf `https://www.sterbegeld24plus.de` setzen (aktuell laut CLAUDE.md auf `finanzteam26.de`).
2. **`produkte.domain`** kann für alle Produkte auf `sterbegeld24plus.de` gesetzt oder NULL gelassen werden (NULL = `NEXT_PUBLIC_BASE_URL`-Default). Das Multi-Domain-Routing wird **nicht aktiv** genutzt, vereinfacht aber später, falls je ein zweiter Domain-Kanal dazukommt.
3. **`buildSchemaPerson`** in `lib/redaktion/schema-person.ts` braucht `baseUrl` als Argument, damit Christians `schema_person`-JSON-LD `https://www.sterbegeld24plus.de/redaktion/christian-wimmer` als kanonischen `url`-Knoten erhält. Die jüngste Refaktorierung des Seed-Scripts (Funktion bereits ausgelagert + foto_url-Preservation) macht das sauber: nach Update von `NEXT_PUBLIC_BASE_URL` einmal `npx tsx scripts/seed-redaktion.ts` neu laufen lassen, dann ist `schema_person` korrekt.
4. **Sitemap, robots.txt, llms.txt** — alle drei generieren bereits aus `NEXT_PUBLIC_BASE_URL`, automatisch konsistent nach Env-Update.
5. **Convexa-Form-Tokens** bleiben pro Produkt unverändert (Tracking pro Audience/Kampagne intakt).
6. **Schema.org/Organization** auf jeder Seite verweist auf `finanzteam26 GmbH & Co. KG` als juristische Trägerin, mit `url: https://www.sterbegeld24plus.de` als primärer Brand-URL und `legalName: finanzteam26 GmbH & Co. KG`. So sind Marken-/Gesellschafts-Beziehung sauber strukturiert.

**301-Redirect-Plan auf sterbegeld24plus.de:**

Eine `redirects`-Tabelle in der DB (`legacy_path text PRIMARY KEY, target_path text, status int DEFAULT 301`) plus Middleware-Hook in `middleware.ts`, der bei jedem Request prüft. Vertrieb pflegt Redirect-Regeln im Admin (`app/admin/(protected)/redirects/`) ohne Re-Deployment. Vor dem Cutover Pflicht: Screaming-Frog-Crawl der aktuellen `sterbegeld24plus.de`, **alle** Altpfade in die Tabelle, Test mit Linkcheck-Tool — sonst 404er → GSC-Crawl-Fehler → Ranking-Verlust.

**Trade-Off, den die Single-Domain-Strategie eingeht:**

Der Domainname `sterbegeld24plus.de` ist semantisch auf Sterbegeld zugespitzt. Wer „Berufsunfähigkeitsversicherung Handwerker" sucht und auf einer URL `sterbegeld24plus.de/bu` landet, könnte irritiert sein, weil das Branding nach Sterbegeld-Spezialist klingt. Drei Mitigationen:
1. **Sub-Brand pro Produktlinie** im Header: oben links Logo „Sterbegeld24Plus", aber bei `/bu`-Pfad zusätzlich ein zweites Sub-Brand-Logo „BU24Plus" oder „handwerker.bu" — visuell klar, dass die Domain ein Hub für mehrere spezialisierte Produktlinien ist. Christians Geschichte als Maklergruppen-Kopf auf jeder Seite framt das.
2. **Title-Tag-Strategie**: bei Nicht-Sterbegeld-Produkten den Domainnamen **nicht** im Title führen. Statt `BU für Handwerker | sterbegeld24plus.de` lieber `BU für Handwerker | Christian Wimmer Versicherungsmakler` — das gibt Brand-Klarheit, ohne das Sterbegeld-Branding als verwirrenden Kontext mitzuschleppen.
3. **Trust-Story sichtbar:** „Christian Wimmer berät seit 20 Jahren in allen Personen-Versicherungen. Sterbegeld24Plus.de ist sein Hauptauftritt — von hier aus auch Berufsunfähigkeit, Pflege, Unfall." als wiederkehrende H2-Linie auf jeder Subseite. Das macht aus dem scheinbaren Branding-Konflikt eine kohärente Story.

Realistische SEO-Prognose unter dieser Architektur: höhere Domain-Authority als bei Multi-Domain-Splits (alle Backlinks zahlen auf einen Knoten), dafür leichte Reibung beim Brand-Fit für Nicht-Sterbegeld-Keywords. Per Saldo deutlich besser als drei oder mehr separate Domains, weil im YMYL-Versicherungsmarkt die Authority-Konzentration den Brand-Fit-Nachteil überwiegt — Google rankt YMYL-Themen primär nach Trust-Signalen, nicht nach exakter Domain-Keyword-Übereinstimmung.
