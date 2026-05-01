# Spec: Redaktion, Trust-Blöcke, Author-System, Wissensfundus-Erweiterung

> **Stand: 2026-05-01**
> **Bezug:** [CLAUDE.md](../CLAUDE.md), [seo-aeo-strategie.md](./seo-aeo-strategie.md)
> **Status der DB-Änderungen:** ✅ Migration `20260501000000_redaktion_trust.sql` angelegt, Seed `scripts/seed-redaktion.ts` für Christian Wimmer angelegt
> **Zweck dieses Dokuments:** Vollständiger Implementierungs-Prompt für die nachfolgenden Code-Iterationen — Admin-UI, Template-Bindung, Trust-Bausteine, Linkbuilding, Wissensfundus-Re-Import. Direkt an einen Coding-Agent übergebbar.

---

## 1. Was bereits in dieser Iteration angelegt wurde

### 1.1 Migration `supabase/migrations/20260501000000_redaktion_trust.sql`

- **Tabelle `redaktion`** mit allen E-E-A-T-Pflichtfeldern: `slug`, `vorname/nachname`, `rolle`, `kurz_bio`, `lang_bio_md`, `expertise[]`, `qualifikationen[]`, `vermittlerregister_nr`, `ihk_kammer`, `paragraph_34d`, `jahre_erfahrung`, `foto_url`, `foto_alt`, `linkedin_url`, `xing_url`, `website_url`, `public`, `schema_person` (vorberechnetes JSON-LD), `artikel_anzahl`, `reviewed_anzahl`.
- **Tabelle `trust_baustein`** mit Typen `pressezitat | siegel | kunden_review | partner_logo | zahl | auszeichnung | verband`. Pro Eintrag: `titel`, `body`, `bild_url`, `quelle_url` (Pflicht-Beleg), `score`, `jahr`, optional `produkt_id` (NULL = global), `reihenfolge`, `aktiv`, `belegt_durch`.
- **Anbindung an Produkte/Content/Blog/Wissen:**
  - `produkte.standard_autor_id` (1 Standard-Autor pro Projekt)
  - `generierter_content.autor_id` + `reviewed_by` + `reviewed_at` + `next_review_at` + `freshness_score`
  - `blog_posts.autor_id` + `reviewed_by` + `reviewed_at` + `next_review_at` + `freshness_score`
  - `wissensfundus.autor_id` + `reviewed_by` + `reviewed_at` + `next_review_at` + `wortzahl` + `freshness_score`
- **Vollständige finanzteam26-Imprint-Daten** in `einstellungen` (HRA 14193 Memmingen, IHK München, § 34d/§ 34f, Vermittlerregister-Nrn `D-F-155-HL9G-55 · D-W-155-1Q56-86 · D-TBHQ-AMZAU-43`, ERGO-Berufshaftpflicht, Versicherungsombudsmann).
- **Auftragsverarbeiter-Liste** in `einstellungen.dsgvo_av_anbieter` (Anthropic, OpenAI, Convexa, Resend, Supabase) — direkt in die Datenschutzerklärung referenzierbar.
- **Default-Review-Cadence** `redaktion_review_intervall_tage = 180` für den Re-Review-Cron.
- RLS aktiv: Public Read auf `public=true` / `aktiv=true`, authenticated Full Access für Admin.

### 1.2 Seed `scripts/seed-redaktion.ts`

Legt Christian Wimmer mit folgenden Daten an (Quellen: sterbegeld24plus.de/ueber-uns, LinkedIn, finanzteam26-Impressum):

- **Rolle:** „Versicherungsmakler & Inhaber sterbegeld24plus.de"
- **Erfahrung:** 20+ Jahre, Praxis-Background im Handwerk
- **Schwerpunkte:** Sterbegeld, BKV, BU/Unfall für Handwerker, Pflege 50+
- **Berufsrechtlich:** § 34d Abs. 1 + § 34f Abs. 1 S. 1, IHK München/Oberbayern
- **Vermittlerregister-Nr:** `D-F-155-HL9G-55` (Default; Christians persönliche Nr bei Bedarf überschreiben)
- **Foto:** Platzhalter `/redaktion/christian-wimmer-placeholder.jpg` — nach Upload des echten Bildes in den Bucket `redaktion-fotos` ersetzen
- **Auto-Schema:** Vollständiges `schema.org/Person`-JSON-LD wird vorberechnet und gespeichert
- Setzt Christian automatisch als `standard_autor_id` für das Produkt `sterbegeld24plus`, falls vorhanden

Aufruf: `npx tsx scripts/seed-redaktion.ts`

---

## 2. Implementierungs-Prompt für die Folge-Iteration (Coding-Agent)

### 2.1 Admin-UI — Redaktion-Verwaltung

**Routen** (alle hinter dem `(protected)`-Layout in `app/admin/(protected)/`):

```
app/admin/(protected)/redaktion/
  page.tsx             → Liste aller Autoren, Filter nach public/expertise
  neu/page.tsx         → Neuanlage (Form)
  [id]/page.tsx        → Edit-Form für 1 Autor
```

**Form-Felder** (alles in Deutsch, Server-Actions für Submit):
- Stammdaten: `vorname`, `nachname`, `titel`, `slug` (auto-generiert aus Vor-/Nachname, manuell überschreibbar)
- Rolle (Dropdown + Freitext): „Versicherungsmakler", „Inhaber", „Senior Berater", „Schadenexperte"
- `kurz_bio` (Textarea, 200-300 Zeichen, Live-Counter)
- `lang_bio_md` (Markdown-Editor — gleicher wie für Wissensfundus, wiederverwenden aus `app/admin/(protected)/wissensfundus/[id]/page.tsx`)
- `expertise[]` (Multi-Select aus `['sterbegeld','pflege','leben','bu','unfall','bkv','handwerker','allgemein']`)
- `qualifikationen[]` (Tag-Input, Freitext)
- Berufsrechtlich-Block: `paragraph_34d`, `vermittlerregister_nr`, `ihk_kammer`, `jahre_erfahrung`
- **Foto-Upload** nach Supabase Storage Bucket `redaktion-fotos` (Drag-Drop, Pflicht: Crop auf 1:1, automatische WebP-Konvertierung + Resize auf 600×600 im Server-Action vor Upload). Setzt anschließend `foto_url` auf die Public-URL.
- Kontakt: `email`, `telefon`, `linkedin_url`, `xing_url`, `website_url`
- Toggle: `public` (Default true)
- Server-Action: nach jedem Save **`schema_person` neu berechnen** und in DB speichern (Funktion exakt wie im Seed-Script, ausgelagert nach `lib/redaktion/schema-person.ts`).

**Listen-Seite Features:**
- Spalten: Foto, Name, Rolle, Expertise-Badges, Anzahl Artikel, Public-Indikator
- Bulk-Action: „nicht-public schalten" (für Inaktive)
- Counter: „Christian betreut aktuell 3 Produkte und ist Author bei 47 Artikeln" — gezogen aus `produkte.standard_autor_id` + `generierter_content.autor_id` + `blog_posts.autor_id` + `wissensfundus.autor_id`

### 2.2 Produkt-Konfiguration: Autor-Auswahl

In `app/admin/(protected)/produkte/[id]/page.tsx` einen neuen Block „Standard-Autor" einfügen:
- Dropdown aus `redaktion` (nur `public=true`), zeigt Foto+Name+Rolle
- Speichert in `produkte.standard_autor_id`
- Hinweistext: „Dieser Autor erscheint als Verfasser auf allen Seiten dieses Produkts (Hauptseite, Ratgeber, Blog, Wissensfundus), sofern dort kein eigener Autor gesetzt ist."

**Pro Artikel-Override**: Im Content-Editor (`app/admin/(protected)/produkte/[id]/content/page.tsx`) zusätzliches Dropdown „Autor (überschreibt Standard)" — bei NULL wird `produkte.standard_autor_id` als Fallback genutzt.

### 2.3 Author-Bindung in den Templates

**Komponente** `components/sections/AuthorByline.tsx` (Server Component):

```tsx
// Holt Autor entweder aus content.autor_id oder fallback produkte.standard_autor_id
// Rendert Card: Foto + Name + Rolle + Qualifikations-Badges + Verfasst-am + Geprüft-am
// + Link auf /redaktion/<slug>
// Außerdem inject schema_person als JSON-LD via <script type="application/ld+json">
```

**Einbau-Stellen:**
- `app/[produkt]/page.tsx` — Hero-Sektion, „Verfasst von …"
- `app/[produkt]/ratgeber/[thema]/page.tsx` — direkt unter H1
- `app/blog/[slug]/page.tsx` — über Excerpt
- `app/wissen/[slug]/page.tsx` — direkt unter H1
- Footer-Variante auf jeder Seite mit kurzem „Geprüft von …, Stand <reviewed_at>" + Link

**Schema.org-Article**-Erweiterung in jedem `generateMetadata()`/JSON-LD-Block:
```json
{ "author": { "@id": "<baseUrl>/redaktion/<slug>#person" },
  "reviewedBy": { "@id": "<baseUrl>/redaktion/<reviewer_slug>#person" },
  "dateModified": "<reviewed_at>" }
```

### 2.4 Public Author-Profil-Seite

`app/redaktion/[slug]/page.tsx`:
- H1 = Name, darunter Rolle, Foto links, `lang_bio_md` rechts
- Qualifikations-Liste, § 34d-Box, Vermittlerregister-Link, IHK-Aufsicht, LinkedIn
- „Artikel von Christian Wimmer" — letzte 12 Einträge aus `generierter_content + blog_posts + wissensfundus` mit `autor_id = …`
- Volles `schema.org/Person`-JSON-LD aus `redaktion.schema_person`
- Sitemap-Eintrag: `/redaktion/<slug>` für jeden `public=true`-Autor

### 2.5 Re-Review-Cron

Skill `anthropic-skills:schedule` nutzen. Daily 06:00:
1. SELECT alle `generierter_content/blog_posts/wissensfundus` mit `next_review_at < now()`
2. Erzeuge Admin-Dashboard-Badge „N Artikel zur Re-Review fällig"
3. `freshness_score` aus `(now() - reviewed_at) / review_intervall * 100` neu berechnen
4. Bei `freshness_score > 100`: Slack/Mail an Redaktion (Template über Resend)

---

## 3. Trust-Blöcke — was kann an Content angeliefert werden?

Pro Trust-Typ konkrete Anforderungen an den Vertrieb. Pro Eintrag: **Beleg-PDF in Drive, Quelle verlinkt, Jahr Pflicht**, sonst nicht freigeben.

### 3.1 `pressezitat` — Pressestimmen
**Was anliefern:**
- 1-Satz-Zitat mit konkretem Zahl/Wert („Bestnote 1,3", „Testsieger 2025")
- Quelle (Magazin, Heft-Nr, Datum)
- Link zur Online-Veröffentlichung oder Foto/Scan der Print-Ausgabe in Drive
- Verfasser-Name optional
**Beispiele/Quellen, die das Vertriebs-Team beschaffen kann:**
- FOCUS Money / FOCUS / Finanztest
- Procontra · Pfefferminzia · Versicherungsbote · AssCompact · CASH
- Süddeutsche Zeitung · Welt · Handelsblatt für Allgemein-Pressezitate
- IVW-Presse-Service
- LokalPresse Schwäbische Zeitung / Augsburger Allgemeine (für Neu-Ulmer Bezug)

### 3.2 `siegel` — Tarif- und Maklersiegel
**Was anliefern:**
- Logo (PNG mit transparentem Hintergrund, mind. 400×400)
- Name des Siegels, Jahr, Score
- Link zur Verifikations-Seite des Vergebers
**Mögliche Quellen:**
- Franke und Bornberg (FB**+++** für BU-Tarife)
- IVFP (Institut für Vorsorge und Finanzplanung) — Sterbegeld, BU, Pflege
- Stiftung Warentest (Finanztest) — Note für getestete Tarife
- DISQ (Deutsches Institut für Service-Qualität) — Maklerservice
- ServiceValue / DtGV — Kundenfreundlichkeit
- TÜV Saarland / TÜV Süd — Service-Audit (Maklerseite zertifizierbar)
- BVK / AfW Mitgliedschaft (zählt als `verband` aber visuell als Siegel)

### 3.3 `kunden_review` — echte Kundenstimmen
**Was anliefern:**
- 2-4-Satz-Zitat (DSGVO: nur mit unterschriebenem Einwilligungs-Formular)
- Vorname + Initial Nachname + Stadt („Maria B., Köln") oder „Kunde aus Köln, 63 Jahre"
- Sterne-Wertung
- Datum
- **Beleg:** Original-Mail/Brief/Erfa-Frageboge in Drive
**Operative Quelle:** Convexa-Lead-Workflow um „Nach 30 Tagen Feedback-Mail mit Review-Bitte" erweitern. Die zurücklaufenden Reviews fließen direkt nach `trust_baustein` (siehe 6.2).

### 3.4 `partner_logo` — Anbieter-Vertrauen
**Was anliefern:**
- Logos der Vermittlungspartner (Allianz, DELA, Ideal, LV1871, Münchener Begräbnisverein, NÜRNBERGER, ...)
- Pro Logo: Markenrechts-Status („Maklerverbund", „direkt vermittelt", ...)
- Reihenfolge nach Bekanntheit
**Wichtig:** Logos nur einbetten, wenn entweder formelle Kooperation besteht oder als Hinweis „Wir vergleichen u. a. folgende Anbieter:" — sonst Markenrechts-Risiko.

### 3.5 `zahl` — Trust-Zahlen
**Beispiele:**
- „Seit 2008 am Markt" (Gründungsjahr finanzteam26)
- „Über 5.000 abgeschlossene Sterbegeldverträge"
- „125 Mio. EUR vermittelte Versicherungssumme"
- „98 % unserer Kunden würden uns weiterempfehlen"
- „Unter 24 h Antwortzeit auf Anfragen"
**Was anliefern:** Stand-Datum + interne Quelle (Buchhaltung, CRM-Export). Aktualisierung jährlich.

### 3.6 `auszeichnung` — Brancheninterne Awards
**Was anliefern:**
- Award-Name, Vergeber, Jahr
- Logo
- Kurzbeschreibung der Kategorie
**Mögliche Auszeichnungen, für die LeadMonster sich qualifizieren könnte:**
- ProContra Maklerwahl
- AssCompact Award
- Finanzbuch Top-Versicherungsmakler
- Capital „Beste Versicherungsmakler" (Statista-Studie)

### 3.7 `verband` — Verbandszugehörigkeiten
**Was anliefern:**
- BVK (Bundesverband Deutscher Versicherungskaufleute)
- AfW (Bundesverband Finanzdienstleistung)
- Votum Verband
- IHK-Mitgliedschaft (bereits via Aufsicht referenziert)

### 3.8 Frontend-Einbau

Komponente `components/sections/TrustBar.tsx`:
- **Position 1:** Sticky-Bar unter Hero (4-6 Logos: Pressezitate-Kacheln + Partner-Logos)
- **Position 2:** Eigene Section vor `LeadForm`: „Was über uns gesagt wird" — 3 Pressezitate + 2 Kundenstimmen
- **Position 3:** Footer-Strip: „Mitglied im BVK · Eingetragen IHK München · ERGO-Berufshaftpflicht" + Schema.org/Organization-Trust-Marker

---

## 4. `besonderheiten` jsonb — wie heben wir das Asset?

Die Spalte `tarife.besonderheiten` enthält Strukturen wie:
```json
{
  "wartezeit": 6,
  "gesundheitspruefung": false,
  "doppelte_summe_unfall": true,
  "rueckholung_ausland": true,
  "kindermitversicherung": true,
  "zahlung_bis": 95
}
```

Diese Daten existieren so **nirgendwo sonst öffentlich aggregiert** — Check24/Verivox haben sie nicht maschinenlesbar. Drei sich verstärkende Hebel:

### 4.1 SERP-Hebel: Strukturierte Vergleichstabellen mit Schema.org

Pro Anbieter eine eigene Detail-Seite `app/[produkt]/anbieter/[slug]/page.tsx` mit:
- Schema.org `Product` + `Offer` + `priceSpecification` (aus Tarif-DB) + Zusatzeigenschaften aus `besonderheiten` als `additionalProperty`
- Tabelle „Was leistet die Allianz Sterbegeldversicherung — Komplett-Übersicht" mit allen Flags
- Ranking-Hooks: Diese Seiten ranken auf Long-Tail wie „Allianz Sterbegeld Wartezeit", „DELA Sterbegeld doppelte Summe Unfall"

Das schafft pro Produkt zusätzliche **5-10 Anbieter-Landingpages mit nahezu null Cannibalization** zur Hauptseite — und sie sind extrem AEO-fit, weil sie strukturierte Faktenfragen beantworten.

### 4.2 AEO/GEO-Hebel: Atomare Q&A-Snippets

Aus jeder `besonderheiten`-Property lassen sich automatisch FAQ-Items generieren:
- „Hat die DELA Sterbegeldversicherung eine Wartezeit?" → „Ja, 6 Monate. Danach voller Versicherungsschutz."
- „Bietet die LV1871 doppelte Auszahlung bei Unfalltod?" → „Ja, der Tarif sorgenfrei Leben verdoppelt die Versicherungssumme bei Unfalltod."

Generator-Erweiterung: Nach jedem `vergleichsrechner`-Block automatisch eine `besonderheiten_faq`-Section mit 6-12 atomaren Q&A-Pairs erzeugen, jedes als FAQPage-Schema-Item registriert. Das sind die Snippets, die Perplexity/ChatGPT direkt zitieren.

### 4.3 PR-Hebel: Marktdaten-Hub `/marktdaten`

Eine eigene Sektion mit aggregierten Auswertungen aus der Tarif-DB:
- „Welche Sterbegeldversicherer bieten Schutz bis 95 Jahre?" (Tabelle mit `zahlung_bis`-Werten)
- „Sterbegeld ohne Wartezeit — diese 4 Anbieter machen es möglich" (Filter `wartezeit = 0`)
- „BU-Tarife mit Nachversicherungsgarantie für Handwerker" (Filter besonderheit)

Diese Seiten sind **Backlink-Magnete**: Fachjournalisten und Verbraucherportale (Finanztip, Stiftung Warentest, Verivox-Blog) zitieren gerne aggregierte Markttabellen mit Quellangabe. Pro Marktdaten-Seite ein einbettbarer Iframe-Widget („Embed this comparison" → externe Domain backlinkt automatisch auf LeadMonster). Das sollte spätestens in Phase 7 stehen.

### 4.4 Implementierungsschritte (für die nächste Iteration)

1. Neue View `tarife_besonderheiten_aggregiert` (Postgres VIEW) mit pivotierten Flags pro Anbieter.
2. Generator-Modus `anbieter_landingpage` in `lib/anthropic/prompt-builder.ts` mit Pflicht-Sections `besonderheiten_table` + `besonderheiten_faq`.
3. Route `app/[produkt]/anbieter/[slug]/page.tsx`.
4. Route `app/marktdaten/[thema]/page.tsx` mit Embed-Widget.
5. Sitemap-Erweiterung um beides.

---

## 5. Linkerstellungs-Tools — konkrete Empfehlungen

Internal Linking ist im Code gelöst (`lib/linker/auto-link.ts` geplant). Externe Linkbuilding-Tools für Backlink-Akquise + Monitoring:

### 5.1 Pflicht (auch in der Budget-Variante)

- **Google Search Console** (kostenlos) — Index-Status, Klicks/Impressions, manuelle Aktionen, internal-link-Reports.
- **Bing Webmaster Tools** (kostenlos) — wichtig für AEO, weil Bing-Index die Grundlage für ChatGPT-Web ist.
- **Ahrefs Webmaster Tools** (kostenlos für eigene Domain) — Backlink-Profil, Disavow, Domain-Rating.
- **Sistrix Smart** (kostenlos in DE-Variante) — Sichtbarkeitsindex DE, Keyword-Tracking.

### 5.2 Empfohlen für die Aufbauphase (kostenpflichtig, ROI-positiv)

- **Sistrix Toolbox** (~150 €/Mon) — DE-Marktstandard, exzellent für Versicherung-Wettbewerbsanalyse (Check24, Verivox, Finanztip side-by-side tracken).
- **Ahrefs Standard** (~199 $/Mon) — Backlink-Outreach + Content-Gap-Analyse zu Wettbewerbern + „Site Explorer" für Competitor-Backlinks.
- **Screaming Frog SEO Spider** (Lifetime ~209 €) — Technisches Audit-Tool, Crawl der eigenen Domain, Schema-Validation, internal-link-Mapping. Pflicht für die Index-Hygiene.
- **Surfer SEO** (~49-89 $/Mon) — On-Page-Optimierung, NLP-basierte Content-Score-Bewertung. Wertvoll für Ratgeber-Optimierung der bestehenden Inhalte.

### 5.3 Outreach + PR-Linkbuilding

- **Pitchbox** oder **BuzzStream** — Mass-Outreach an Fachblogs, Versicherungsmagazine, Lokalpresse. Für Gast-Beiträge, HARO-Antworten, „Markt-Studien-Veröffentlichung".
- **HARO / Help A Reporter Out** (kostenlos, von Cision) — Journalisten suchen Experten. Christian Wimmer (Handwerker-Spezialist!) ist dort eine Goldgrube für Versicherungs-Themen mit Handwerker-Bezug.
- **Connectively** (HARO-Nachfolger seit 2024) — wichtigerer Kanal heute.

### 5.4 Für die Datenstrategie aus § 4 (`besonderheiten`)

- **Looker Studio** oder **Metabase** auf Supabase angebunden → öffentlich teilbare „Marktdaten-Dashboards", die Journalisten direkt verlinken können. Erzeugt verifizierbare Marktstudien-Artikel.

### 5.5 Recommended Workflow

1. Jede Woche 1 PR-Pitch mit aktueller Marktdaten-Auswertung → 1-2 Backlinks/Woche
2. Jede Woche 2-3 HARO-Antworten von Christian → Experten-Zitate in Fachpresse
3. Quartalsweise „Versicherungsmarkt Studie 2026 Q1" als PDF + Pressemitteilung → 5-10 Backlinks pro Quartal
4. Monatlich Sistrix-Sichtbarkeit messen, Wettbewerbs-Lücken in `besonderheiten`-Auswertungen identifizieren.

Realistisches Ziel: nach 12 Monaten 80-150 verweisende Domains, davon 20+ aus dem Insurance-/Finance-Vertical.

---

## 6. Wissensfundus & Re-Import finanzteam26

### 6.1 Bestehende Inhaltsstruktur auf finanzteam26.de (extrahiert)

```
/berufsunfaehigkeit.html                          → BU-Pillar
/berufsunfaehigkeitsversicherung-junge-leute.html
/berufsunfaehigkeitsversicherung-fuer-kinder.html
/berufsunfaehigkeitsversicherung-fuer-schueler.html
/berufsunfaehigkeitsversicherung-fuer-studenten.html
/berufsunfaehigkeitsversicherung-fuer-azubis.html
/berufsunfaehigkeit/lehrer-und-beamte.html
/berufsunfaehigkeit/selbststaendige.html
/berufsunfaehigkeit/angestellte.html
/berufsunfaehigkeit/besondere-aktionen.html
/ganzheitliche-beratung.html
/ueber-uns.html
/blog.html
```

Plus bereits gefundene Sterbegeld-Unterseiten unter `sterbegeld24plus.de`:
```
/sterbegeldversicherung-testsieger
/muenchener-begraebnisverein
/hdi
/vergleichsrechner
/ueber-uns
```

### 6.2 Wissensfundus-Kandidaten aus der Inhaltsstruktur

Folgende Themen aus dem Bestand übernehmen (jeweils als MD-Datei in `wissensfundus-seeds/<kategorie>/`, dann via `scripts/seed-wissensfundus.ts` einseeden — **eine Datei pro Slug**):

**Kategorie `bu` (Berufsunfähigkeit) — höchste Priorität, weil größter Bestand:**
1. `bu-fuer-junge-leute` — Eintrittsalter, Beitragsvorteile, Nachversicherungsgarantie
2. `bu-fuer-kinder` — Schulunfähigkeit vs. BU, Versicherbarkeit
3. `bu-fuer-schueler` — Anwartschaften, Grundfähigkeitspolicen
4. `bu-fuer-studenten` — Übergang Studium → Beruf, Umstellungsoption
5. `bu-fuer-azubis` — Berufsgruppen, Ausbildungsberufe-Liste
6. `bu-fuer-lehrer-und-beamte` — Dienstunfähigkeitsklausel
7. `bu-fuer-selbststaendige` — Verzicht auf abstrakte Verweisung, Umorganisation
8. `bu-fuer-angestellte` — Standard-BU, Tarif-Auswahl
9. `bu-handwerker` — **Christians Spezialgebiet — Premium-Long-Form-Content mit Praxisfällen**

**Kategorie `sterbegeld`:**
10. `sterbegeld-muenchener-begraebnisverein` — Spezialität ohne Gesundheitsprüfung, 6-Monats-Wartezeit
11. `sterbegeld-hdi` — Einzelner Anbieter-Deep-Dive
12. `sterbegeldversicherung-testsieger` — Vergleichs-Hub mit Backlinks zu allen Anbieter-Detail-Seiten
13. `sterbegeld-ohne-gesundheitspruefung` — Keyword-Magnet
14. `sterbegeld-mit-vorerkrankung` — Christians Fachthema

**Kategorie `allgemein`:**
15. `was-ist-ein-versicherungsmakler` — Statt-Vertreter-Argument, Provisions-Transparenz
16. `paragraph-34d-erklaert` — eigenes Trust-Asset
17. `versicherungsombudsmann-streitschlichtung` — Compliance-Pflicht und Trust-Element
18. `ganzheitliche-finanzberatung` — finanzteam26-Kernbotschaft

### 6.3 Re-Import-Vorgehen (in der nächsten Iteration)

Da `finanzteam26.de` in der Egress-Allowlist steht, kann das Re-Import-Skript direkt fetchen:

`scripts/import-finanzteam26-blog.ts` (in CLAUDE.md schon als Phase 5 erwähnt) wird so erweitert:
1. URL-Liste aus 6.1 abarbeiten (HTML fetchen)
2. Per `cheerio` Hauptinhalt extrahieren (Selektor: `<article>` oder `.entry-content`)
3. HTML → Markdown (`turndown`-Library)
4. Author = Christian Wimmer (`autor_id` aus DB), `reviewed_by` = Christian, `reviewed_at = now()`
5. Insert in `blog_posts` mit `source_origin = 'finanzteam26'` + `source_url`
6. **Wichtig:** alle internen Links auf finanzteam26.de → entweder auf neuen LeadMonster-Slug umschreiben (wenn Pendant existiert) oder rel="nofollow" + 410-Redirect auf Original-Site einrichten.
7. Cover-Image = OpenAI gpt-image-1 frisch generiert (keine fremden Bilder ohne Lizenzprüfung übernehmen).
8. Status `entwurf` → manuelles Review durch Christian → `publiziert`.

### 6.4 Foto Christian Wimmer

Da `sterbegeld24plus.de` aktuell **nicht** in der Egress-Allowlist steht (`finanzteam26.de` ist drin, `sterbegeld24plus.de` nicht), kann das Foto nicht automatisch gezogen werden. Drei Optionen:

1. **Empfohlen:** Christian liefert ein hochauflösendes Pressefoto (mind. 1500×1500 px) per Mail, du lädst es manuell in Bucket `redaktion-fotos` hoch und ersetzt `redaktion.foto_url` für ihn.
2. **Allowlist erweitern:** in den Cowork-Settings → Capabilities `sterbegeld24plus.de` ergänzen, dann Bild via Skript `scripts/import-redaktion-foto.ts` automatisch ziehen lassen.
3. **Übergangsweise:** Generisches KI-Avatar via gpt-image-1 mit Prompt „Professionelles Portraitfoto eines Versicherungsmaklers, freundlich, vertrauenswürdig, vor neutralem Hintergrund" — **nicht empfohlen**, weil Such-Reverse-Image-Tools KI-Fotos identifizieren und das genau das E-E-A-T-Signal zerstört, das wir aufbauen wollen.

---

## 7. Definition of Done

Eine Iteration gilt als abgeschlossen, wenn:

- ✅ Migration läuft auf Staging fehlerfrei durch (Test: `supabase db reset` lokal).
- ✅ `npx tsx scripts/seed-redaktion.ts` legt Christian an, idempotent.
- ⬜ Admin-Liste/Edit-/Neuanlage-Routen für Redaktion existieren und Foto-Upload funktioniert.
- ⬜ `produkte`-Edit zeigt Standard-Autor-Dropdown.
- ⬜ `AuthorByline`-Komponente rendert auf allen 4 Page-Types (Produkt, Ratgeber, Blog, Wissen).
- ⬜ Schema.org/Article enthält `author` + `reviewedBy` + `dateModified` korrekt.
- ⬜ `app/redaktion/[slug]/page.tsx` öffentlich erreichbar, Sitemap-Eintrag vorhanden.
- ⬜ Mindestens 5 Trust-Bausteine angelegt (1× Pressezitat, 2× Kunden-Review, 1× Siegel, 1× Verband).
- ⬜ Impressum-Seite zeigt alle finanzteam26-Pflichtangaben + Vermittlerregister + IHK + Berufshaftpflicht.
- ⬜ Datenschutzerklärung referenziert alle 5 Auftragsverarbeiter aus `dsgvo_av_anbieter`.
- ⬜ Re-Review-Cron läuft und schreibt `freshness_score`.
- ⬜ Mindestens 9 Wissensfundus-Einträge aus 6.2 als MD-Seeds vorbereitet.

---

## 8. Reihenfolge der Umsetzung (90-Tage-Plan)

**Woche 1-2** — Foundation
- Migration + Seed deployen; Foto-Upload-Bucket einrichten; Christian-Foto manuell uploaden
- Admin-UI für Redaktion (List/New/Edit + Foto-Upload mit WebP-Konvertierung)
- `AuthorByline`-Komponente

**Woche 3-4** — Author-Bindung + Trust
- Einbau `AuthorByline` in alle 4 Page-Types
- Schema.org-Erweiterung
- `/redaktion/[slug]`-Public-Page
- Erste 5-10 Trust-Bausteine erfassen + `TrustBar`-Komponente

**Woche 5-6** — Imprint/Datenschutz/E-E-A-T-Aussen-Signale live
- Impressum-Seiten aus `einstellungen` befüllen
- Datenschutzerklärung mit AV-Liste
- Public-Site live → Indexierung über GSC anstoßen

**Woche 7-8** — Wissensfundus-Re-Import
- `scripts/import-finanzteam26-blog.ts` schreiben
- 18 Themen aus 6.2 importieren, von Christian reviewed → publish
- Internal-Linking-Reorganisation

**Woche 9-10** — Anbieter-Landingpages aus `besonderheiten`
- View `tarife_besonderheiten_aggregiert`
- Generator-Modus `anbieter_landingpage`
- Routen `/[produkt]/anbieter/[slug]`

**Woche 11-12** — Marktdaten-Hub + erstes PR-Pitch
- `/marktdaten`-Sektion, erste 3-4 datengetriebene Auswertungen
- HARO-Account, Connectively, Pitchbox initial setup
- Erstes Press-Release mit Tarif-Auswertung „Sterbegeldmarkt 2026 Q2"
- Ahrefs WMT verbinden, Sistrix Smart Account

---

## 9. Antworten auf die Kernfragen kurz

**Trust-Blöcke — was anliefern?** Pressezitate (1-Satz + Quelle + Beleg), Tarif- und Maklersiegel mit Logo+Score+Jahr, echte Kundenstimmen mit DSGVO-Einwilligung (operativer Kanal: Convexa-Feedback-Mail nach 30 Tagen), Partner-Logos der Versicherer, Trust-Zahlen mit Stand-Datum, brancheninterne Awards, Verbandszugehörigkeiten. Pro Eintrag muss Beleg-PDF in Drive liegen und Quelle verlinkt sein, sonst nicht freigeben.

**`besonderheiten` jsonb — wie nutzen?** Drei Hebel: (1) eigene Anbieter-Landingpages mit `Product`+`Offer`-Schema (Long-Tail-SERP-Magneten), (2) atomare FAQ-Snippets pro `besonderheiten`-Property (AEO-Goldader für Perplexity/ChatGPT), (3) `/marktdaten`-Hub mit aggregierten Auswertungen als Backlink-Magnet für Fachpresse. Niemand sonst hat diese Daten maschinenlesbar — das ist der differenzierendste Asset im ganzen System.

**Linkbuilding-Tools?** Pflicht: GSC, Bing WMT, Ahrefs WMT (kostenlos für eigene Domain), Sistrix Smart. In der Wachstumsphase: Sistrix Toolbox, Ahrefs Standard, Screaming Frog, Surfer SEO. Outreach: Connectively (HARO-Nachfolger), Pitchbox/BuzzStream. Christian Wimmer als HARO-Experte für Handwerker-Versicherungs-Themen platzieren — größter ungenutzter PR-Hebel.

**finanzteam26-Inhalte für Wissensfundus?** Ja, alle 18 in 6.2 aufgelisteten Slugs. Vorgehen via `scripts/import-finanzteam26-blog.ts` (HTML-Fetch + cheerio + turndown), mit Christian als Author/Reviewer, neuen KI-Bildern, Status `entwurf` → Review → `publiziert`.

**Foto Christian Wimmer?** `sterbegeld24plus.de` steht aktuell nicht in der Egress-Allowlist. Empfehlung: Christian liefert hochaufgelöstes Pressefoto, manueller Upload in Bucket `redaktion-fotos`. Alternativ Allowlist um `sterbegeld24plus.de` erweitern lassen.
