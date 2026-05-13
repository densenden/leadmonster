# finanzteam26 · LeadMonster Status

**Kundenmeeting · 13. Mai 2026**

Stand der Sterbegeld24Plus-Plattform nach 14 Tagen Sprint.
Markdown-Quelle für Gamma — jeder `---`-Block ist eine Slide.

---

# Sterbegeld24Plus
## Die vollständige Marken-Hauptseite ist live

**Sprint-Stand 13. Mai 2026**

Was wir präsentieren:
- Eine **fertige** Sterbegeld-Seite unter `/` der Domain `sterbegeld24plus.de`
- **Universelles Content-System** für vier weitere Versicherungsarten
- **Vergleichsrechner-Editor** im Admin — Tarife wie Excel pflegen
- **Wartezeit-Filter** als erste konkrete Kundenidee live umgesetzt

---

# Live-Demo: Sterbegeld24Plus

**`sterbegeld24plus.de/` — komplette Hauptseite**

Reihenfolge der Sektionen:

1. **Hero** mit AEO-Definition, garantierte Aufnahme, ab 9,99 €
2. **Produktvorteile** — 6 Features mit Inline-Links zum Wissensfundus
3. **Anbieter-Vergleichsrechner** — 5 Anbieter (Allianz, DELA, Ideal, LV1871, November) in Echtzeit
4. **Vertrauenssignale** — Stats + finanzteam26-Markenanker
5. **Häufige Fragen** — FAQ mit Schema.org-JSON-LD
6. **Lead-Formular** → direkt zu Convexa

Plus Unterseiten: `/vergleich`, `/faq`, `/tarife`, `/vergleichsrechner`, 3× `/ratgeber/*`

---

# Was in den letzten 14 Tagen passiert ist

**33 Commits · 357 geänderte Dateien · vier Phasen**

| Datum | Phase | Was |
|---|---|---|
| 29.–30. 04. | LeadMonster v2 | CRM-Pivot zu Convexa, Wissensbasis, BU-Produkttyp, Brand-Alignment |
| 30. 04. | Pilot live | Sterbegeld24plus voll mit Content + Site-aware Cross-Links |
| 01. 05. | Phase 1 | Single-Domain-Migration auf sterbegeld24plus.de |
| 04. 05. | Phase 2–4 | Root-Routing · Redirects-Infrastruktur · Sub-Brand-Display · TrustStoryLine |
| 04.–05. 05. | Tarif-System | Versicherungsart-Editor · Vergleichsrechner-Editor · Wartezeit-Filter |
| 06.–13. 05. | Polish | Tests, Filter-Robustness, Vergleichsrechner-Section auf Hauptseite |

---

# Phase 1 — Single-Domain auf sterbegeld24plus.de

**Eine Marke, eine Domain — produktklare Adresse.**

- `finanzteam26.de` → `sterbegeld24plus.de` (301-Redirects geplant)
- Root `/` rendert das Sterbegeld24Plus-Produkt direkt — keine Sub-Path
- Sub-Routen `/faq`, `/vergleich`, `/tarife`, `/ratgeber/*` bleiben pfadkonsistent
- Sitemap.xml + robots.txt + llms.txt auf neuer Domain
- Redirects-Infrastruktur als Admin-Bereich gepflegt (DB-getrieben)

**Ausstehend: DNS-Cutover** (Apache-Host → Vercel)

---

# Phase 4 — Sub-Brand-System

**Ein Domain-Stack, mehrere Versicherungsmarken.**

Neue Felder auf jedem Produkt:
- `brand_display_name` — z. B. „Sterbegeld24Plus" oder später „pflege24direkt"
- `brand_subline` — Markenversprechen unter dem Logo
- `title_suffix_override` — eigenes Meta-Title-Suffix
- **TrustStoryLine** — verbindender Marken-Anker bei Sub-Brands

**Ergebnis:** sobald wir eine Pflege- oder BU-Marke aktivieren, läuft sie über dieselbe Plattform mit eigener Identität — kein Doppel-Entwicklungsaufwand.

---

# Versicherungsart-Editor

**Neue Versicherungsart anlegen — ohne Deployment.**

Heute war jeder Produkttyp im Code hardcoded (`sterbegeld | pflege | leben | bu | unfall`). Neuer Typ = Migration + Code-Änderung.

**Jetzt:** Admin-Bereich `/admin/produkt-typen`
- CRUD für `produkt_typen` (DB-Tabelle, FK von `produkte.typ`)
- Pro Typ konfigurierbar: Summen-Optionen, Default-Alter, Labels, Filter-Achsen, Brand-Look für KI-Bilder
- 5 Default-Typen sind geseedet, der Admin kann freie neue anlegen (z. B. Zahnzusatz, Hausrat)
- Bestehende Forms (Produkt-Anlage, Wissensfundus) lesen die Liste live aus DB

---

# Vergleichsrechner-Editor

**Tarife pflegen wie in Excel.**

Admin-Bereich `/admin/tarife/[produkt]` — Inline-Edit-Tabelle:
- Doppelklick auf Zelle → Editieren → Blur speichert
- Dynamische Spalten je nach Versicherungsart (Berufsklasse für BU, Wartezeit für Sterbegeld)
- Sortier-Header · Filter (Anbieter, Alter) · „+ Neue Zeile"-Footer · Löschen pro Zeile
- Validation per Zod, UNIQUE-Constraint pro `(Anbieter, Alter, Summe, Berufsklasse)`

**Daten-Stand heute:**
- **1.521 Anbietertarife** aus CSVs geseedet
- sterbegeld: 348 Rows (5 Anbieter × 26 Jahrgänge × 5 Summen — echte Marktdaten)
- 4 Unfall-Produkte: je 275 Rows (Templates, müssen real ausgefüllt werden)

---

# Wartezeit-Filter — die Kundenidee

**Was du angefragt hattest, ist live.**

> „Wartezeit als zusätzliches Filter — damit ich dem Lead auch ohne telefonische Erreichbarkeit ein passendes Angebot zusenden kann."

Auf `/sterbegeld24plus/vergleichsrechner`:
- 3. Filterfeld neben Geburtsjahr + Summe: **„Akzeptable Wartezeit"**
- Optionen: Egal · Keine Wartezeit · bis 12 Monate · bis 36 Monate
- Tabelle blendet Anbieter aus, die nicht passen (Allianz 12 / Ideal 36 / DELA 0 / LV1871 12 / November 12)
- Gewählte Wartezeit landet als Hidden-Field bei Convexa: `AkzeptierteWartezeitMonate=12`

**Systemisch:** Jede neue Versicherungsart kann eigene Filter-Achsen definieren — BU bekommt Berufsklasse A/B/C/D, Pflege bekommt Pflegegrad usw.

---

# Convexa-Integration

**Leads landen vollständig im richtigen System.**

- POST-Adapter `lib/convexa/client.ts` — Token pro Produkt überschreibbar
- Felder: `Email`, `FirstName`, `LastName`, `Phone`, `Interest`, `Product`, `ProductSlug`, `ProductType`, `Zielgruppe`, `Intent`, `GewuenschterAnbieter`, **`AkzeptierteWartezeitMonate`** (neu), **`Berufsklasse`** (neu), `FilterKontext`, `SourceUrl`, `UtmSource`, `UtmMedium`, `UtmCampaign`
- Bei Fehler bleibt der Lead in Supabase mit `convexa_synced=false` → Re-Sync via Admin-Button möglich
- Confluence vollständig entfernt (Code, DB-Spalten, Settings)

---

# Was ist offen?

**Vor Live-Cutover noch zu erledigen:**

| Item | Wer | Wann |
|---|---|---|
| **DNS-Cutover** `sterbegeld24plus.de` Apache → Vercel | finanzteam26 | vor Cutover |
| **GSC** Google Search Console Property neu verifizieren | finanzteam26 | nach Cutover |
| **Screaming-Frog-Crawl** zur Final-QA | finanzteam26 | nach Cutover |
| **Convexa-Form-Token** in Produkt-Stammdaten eintragen | finanzteam26 | jetzt |

**Operativ in den nächsten Iterationen:**

- Real-Anbieterdaten für Pflege / Leben / BU / Unfall (CSVs sind Markt-Schätzungen)
- Mehr Ratgeber-Artikel pro Produkt (heute 3, Ziel 5–7)
- Section-Bilder auf Hauptseite (KI-generiert via gpt-image-1)
- OG-Bilder für Social Sharing

---

# Bewusst nicht enthalten

**Aus dem ursprünglichen § 1 / § 3 / § 4 / § 5 — nach Abstimmung verschoben:**

- § 1 Audience-Locks — kommt nach Marktbeobachtung
- § 3 Anbieter-Detailseiten (`/anbieter/[slug]`) — Routen vorbereitet, Content steht
- § 4 Persona-Pillars — separate Iteration nach Pflege-/BU-Launch
- § 5 Conversion-Bausteine (Trust-Block-Variationen, Sticky-CTA-Erweiterung) — nach DNS-Cutover

---

# Risiken

**Was wir im Blick haben:**

- **DNS-Cutover-Window** — kurze Downtime möglich, alte Apache-Inhalte müssen abgelöst werden ohne SEO-Verlust
- **Convexa-Form-Token-Pflege** — pro Produkt korrekt eingetragen, sonst Lead-Verlust
- **Anbieter-Daten-Aktualität** — Marktbeobachtung muss in CSV-Pflege münden (heute manuell)
- **Wartezeit-Filter-UX** — der Filter funktioniert, aber wir lernen erst mit echten Leads, ob die Optionen die richtigen sind

---

# Decision-Items für heute

**Drei Fragen an dich:**

1. **DNS-Cutover-Termin** festlegen — wir sind technisch ready
2. **Real-Daten Pflege/Leben/BU/Unfall** — wer liefert die CSVs, bis wann?
3. **Mehr Filter-Achsen** — sollen wir z. B. „mit/ohne Gesundheitsfragen" als 2. Achse für Sterbegeld einbauen?

---

# Bonus: was alles auch ging

**Unterhalb der Wasserlinie:**

- 484/493 Tests grün · Vitest-Suite läuft sauber durch
- 1.521 Anbietertarife in DB, alle inline-editierbar
- Migration `20260504000000_produkt_typen_und_filter.sql` produktiv angewandt
- 5 Versicherungsarten in DB, beliebig viele weitere durch den Admin anlegbar
- Auto-Cross-Linking site-aware: Wissensbasis-Links bleiben im Produkt-Kontext
- KI-Provider-Abstraktion (Anthropic + OpenAI) mit Modell-Switch in Settings
- Auto-Tests fixiert + Convexa-Lead-Fixtures erweitert

---

# Fragen?

**Live unter `https://leadmonster-8sxf2uv4w-studiosen.vercel.app/`** (vor DNS-Cutover)

Nach Cutover: `https://sterbegeld24plus.de`

Backstage: `/admin` — Produkte · Versicherungsarten · Tarife · Wissensfundus · Redaktion · Leads · Convexa-Einstellungen
