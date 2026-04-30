# LeadMonster — CLAUDE.md

Vollständige Systembeschreibung für die KI-gestützte Weiterentwicklung von LeadMonster für **finanzteam26**.

> **Stand: 2026-04-29** — Diese Version ersetzt das frühere Confluence/HubSpot-Setup. Lead-CRM ist jetzt **Convexa** (https://app.convexa.app), Bilder werden mit **OpenAI gpt-image-1** erzeugt, Tarife kommen aus der eigenen DB-Tabelle, das Covomo-iframe ist abgeschaltet.

---

## Vision & Kontext

**LeadMonster** ist ein skalierbares SEO/AEO-Vertriebs-Content-System für Versicherungsprodukte.

**Problem bisher:** Jedes Versicherungsprodukt = manuelles Einzelprojekt. Drittanbieter-Rechner (Covomo) lieferten Tarife, aber Leads liefen über deren Tracking — wir hatten keine eigene SEO-/GEO-/Lead-Hoheit.

**Ziel:** Ein Admin-System, in dem Vertrieb Produkt + Zielgruppe + Fokus eingibt — und automatisch eine vollständige, SEO/AEO-optimierte Produktwebsite mit Landingpages, Tarif-Kalkulator, FAQs, Vergleichen, Ratgeber-Artikeln, Hero-/Inhaltsbildern und Lead-Formular entsteht. Leads landen direkt in **Convexa**.

**Pilot-Produkt:** `sterbegeld24plus` — Referenz-Design liegt in `/sterbegeld24plus-recreation/`. Optisch orientiert sich das System grundsätzlich an `https://finanzteam26.de/`.

**Vier weitere Produkte stehen als nächstes an:**
1. Pflegezusatzversicherung (`pflege`)
2. Risikolebensversicherung (`leben`)
3. Berufsunfähigkeitsversicherung (`bu` — neu eingeführt 2026-04-29)
4. Unfallversicherung (`unfall`)

---

## Tech Stack

| Schicht | Technologie | Warum |
|---|---|---|
| Framework | **Next.js 14 App Router** | SSR/SSG zwingend für SEO |
| Styling | **Tailwind CSS** + Design-Tokens (`/design-tokens/tokens.json`) | Konsistenz mit finanzteam26-Brand |
| Datenbank | **Supabase (PostgreSQL)** | Produkte, Leads, Content, Tarife, Blog, Bilder |
| Auth | **Supabase Auth** | Admin-Bereich |
| KI-Texte | **Anthropic Claude API** (`claude-opus-4-6`) | Content-Qualität für SEO/AEO |
| KI-Bilder | **OpenAI Images API** (`gpt-image-1`) | Hero- + Inline-Bilder pro Seite |
| E-Mail | **Resend** | Lead-Bestätigungen + Vertriebs-Notifications |
| **Lead-CRM** | **Convexa** (https://app.convexa.app) | Ersetzt Confluence/HubSpot |
| Stock-Bilder (Fallback) | **Unsplash API** | nur wenn KI-Bild nicht greift |
| Deployment | **Vercel** | Next.js-nativ |

> ⚠️ **Confluence/HubSpot sind abgeschaltet.** Code-Reste (`lib/confluence/*`) bleiben im Repo, bis Convexa-Anbindung live ist; danach werden sie entfernt.

---

## Umgebungsvariablen

Alle Secrets ausschließlich in `.env.local` (nie in Git):

```
# Anthropic (Texte)
ANTHROPIC_API_KEY=

# OpenAI (Bilder)
OPENAI_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=

# Resend
RESEND_API_KEY=
RESEND_FROM_ADDRESS=
SALES_NOTIFICATION_EMAIL=

# Convexa CRM (API-Doku ausstehend → /docs/convexa-api-anfrage.md)
CONVEXA_BASE_URL=https://app.convexa.app
CONVEXA_API_TOKEN=
CONVEXA_WORKSPACE_ID=

# Public
NEXT_PUBLIC_BASE_URL=https://finanzteam26.de
INTERNAL_SECRET=

# Optional Stock-Fallback
UNSPLASH_ACCESS_KEY=
```

`.env.example` mit leeren Keys ist commit-sicher.

---

## System-Architektur (5 Ebenen)

```
1. WISSENSFUNDUS (DB + MD-Editor)
   Versicherungslogik, allg. Fach-Content, alte finanzteam26-Blog-Inhalte
        ↓
2. PRODUKT-DNA (produkte + produkt_config)
   z. B. sterbegeld, pflege, leben, bu, unfall
        ↓
3. VERTRIEBSSTEUERUNG (Admin-Eingabe)
   Zielgruppe + Fokus (Sicherheit / Preis / Sofortschutz)
        ↓
4. CONTENT ENGINE (Claude + OpenAI Image)
   Pro Seite: Texte (JSON-Sektionen) + Hero-Bild + Inline-Bilder
   Auto-Cross-Linking auf Wissensfundus-Slugs
   Auto-Vorschlag VergleichsRechner-Section (wenn ≥2 Anbietertarife in DB)
        ↓
5. LEAD-FLOW (Supabase + Convexa + Resend)
   Formular → Supabase → Convexa-Push → Bestätigungs-Mail
```

---

## Datenbankschema (Supabase / PostgreSQL)

Stand nach Migration `20260429000000_convexa_blog_tarife_bu.sql`.

### `produkte`
- `id` uuid PK
- `slug` text UNIQUE
- `name` text
- `typ` text — **`'sterbegeld' | 'pflege' | 'leben' | 'unfall' | 'bu'`**
- `status` text — `entwurf | aktiv | archiviert`
- `domain` text
- `hero_image_url` text — KI-generiert
- `hero_image_alt` text
- `og_image_url` text
- `short_pitch` text — 2-3-Satz-Definition für AEO

### `produkt_config`
- `produkt_id` uuid FK
- `zielgruppe` text[]
- `fokus` text — `sicherheit | preis | sofortschutz`
- `anbieter` text[]
- `argumente` jsonb

### `wissensfundus`
- `id` uuid PK
- `kategorie` text — Produkttyp oder `'allgemein'`
- `thema` text
- `inhalt` text — Markdown, vom Admin editierbar
- `slug` text UNIQUE — für Auto-Cross-Linking auf `/wissen/{slug}`
- `link_phrases` text[] — Trigger-Begriffe, die der Generator zu Cross-Links umbaut
- `tags` text[]
- `published` boolean

### `generierter_content`
- `produkt_id` uuid FK
- `page_type` — `hauptseite | faq | vergleich | tarif | ratgeber`
- `slug` (für Ratgeber)
- `title`, `meta_title`, `meta_desc`
- `content` jsonb — strukturierte Sektionen
- `schema_markup` jsonb — Schema.org JSON-LD
- `status` — `entwurf | review | publiziert`

### `tarife` (NEU – ersetzt statisches `lib/tarif-data.ts`)
- `produkt_id` uuid FK
- `alter_von`, `alter_bis` int
- `summe` int — Versicherungssumme oder BU-Monatsrente
- `beitrag_low`, `beitrag_high` numeric — monatlich
- `einheit` text — `eur_summe | eur_monat`
- **`anbieter_name` text NULL** — wenn NULL: Marktkorridor (für `TarifRechner`); wenn gesetzt: Einzeltarif eines Anbieters (für `VergleichsRechner`). `low = high = exakter Beitrag` ist erlaubt.
- **`tarif_name` text NULL** — z. B. `Bestattungsschutzbrief`, `sorgenfrei Leben`, `Comfort plus`
- **`besonderheiten` jsonb NULL** — strukturiert: `{ wartezeit, gesundheitspruefung, doppelte_summe_unfall, rueckholung_ausland, kindermitversicherung, zahlung_bis }` — wird im VergleichsRechner als Footer-Tabelle gerendert

### `blog_posts` (NEU)
- `id` uuid PK
- `slug` text UNIQUE
- `title`, `excerpt`, `content_md` (Markdown, editierbar)
- `cover_image_url`, `cover_image_alt`
- `meta_title`, `meta_desc`, `schema_markup` jsonb
- `kategorien` text[], `tags` text[]
- `produkt_id` FK (optional)
- `status` — `entwurf | review | publiziert`
- `source_url`, `source_origin` — z. B. `'finanzteam26'` für reimportierte Beiträge
- `author`, `reading_time`, `published_at`

### `bilder` (NEU)
- `produkt_id` / `blog_post_id` FK
- `page_type`, `slot` (`hero | feature | inline | og`)
- `url`, `alt_text`, `prompt_used`
- `provider` — `openai | replicate | unsplash | manual`
- `width`, `height`

### `leads` (erweitert)
- bestehende Felder
- **`convexa_lead_id`** text
- **`convexa_synced`** boolean
- `convexa_error` text
- `source_url`, `utm_source`, `utm_medium`, `utm_campaign`
- (Confluence-Felder bleiben bis zur finalen Convexa-Migration)

### `einstellungen`
Verschlüsselte Schlüssel werden hier gespeichert. Reihen für Convexa, OpenAI, Image-Provider sind via Migration registriert.

### `email_sequenzen`
unverändert.

---

## Dateistruktur

```
/
├── app/
│   ├── page.tsx                          # Startseite (alle aktiven Produkte)
│   ├── blog/                             # NEU
│   │   ├── page.tsx                      # Blog-Übersicht
│   │   └── [slug]/page.tsx               # Einzelartikel
│   ├── wissen/                           # NEU — öffentliche Wissensbasis
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   │
│   ├── [produkt]/
│   │   ├── page.tsx                      # Hauptseite
│   │   ├── faq/page.tsx
│   │   ├── vergleich/page.tsx
│   │   ├── tarife/page.tsx               # eigener Kalkulator (kein Covomo mehr)
│   │   └── ratgeber/[thema]/page.tsx
│   │
│   ├── admin/
│   │   ├── produkte/                     # Produkt-CRUD + Content-Generierung
│   │   ├── leads/                        # Lead-Übersicht + Convexa-Sync-Status
│   │   ├── wissensfundus/                # MD-Editor
│   │   ├── blog/                         # NEU — Blog-MD-CRUD
│   │   ├── tarife/                       # NEU — Tarif-Tabelle pflegen
│   │   ├── bilder/                       # NEU — Bilder-Bibliothek
│   │   └── einstellungen/                # Convexa-Credentials etc.
│   │
│   └── api/
│       ├── generate/                     # Texte (Claude)
│       ├── generate-image/               # NEU — Bilder (OpenAI gpt-image-1)
│       ├── leads/                        # Lead-Eingang → Supabase → Convexa
│       ├── convexa/                      # NEU — Adapter für Convexa-API
│       │   ├── push/route.ts             # Push einzelner Lead
│       │   └── webhook/route.ts          # Convexa-Inbound (falls so vereinbart)
│       └── seo/llms/route.ts             # llms.txt
│
├── components/
│   ├── ui/                               # Atoms
│   ├── sections/                         # Hero, FeatureGrid, FAQ, Vergleich, TarifRechner,
│   │                                     # VergleichsRechner (NEU — Daten-Eingabe → Anbieter-Tabelle → Lead),
│   │                                     # LeadForm (CovomoRechner wurde entfernt)
│   ├── blog/                             # NEU — BlogCard, MarkdownRenderer
│   └── admin/
│
├── lib/
│   ├── supabase/
│   ├── anthropic/
│   │   ├── generator.ts                  # Texte
│   │   ├── prompt-builder.ts
│   │   └── schemas.ts
│   ├── openai/                           # NEU
│   │   └── image-generator.ts            # gpt-image-1
│   ├── convexa/                          # NEU — ersetzt lib/confluence
│   │   ├── client.ts                     # Lead-Push, Auth, Mapping
│   │   └── types.ts
│   ├── confluence/                       # DEPRECATED — wird entfernt
│   ├── linker/                           # NEU — Auto-Cross-Linking
│   │   └── auto-link.ts
│   ├── markdown/                         # NEU
│   │   └── render.ts                     # MD → React (Server-Component-safe)
│   ├── seo/
│   ├── resend/
│   └── tarife/                           # NEU — DB-basierte Tarif-Lookups (löst lib/tarif-data.ts ab)
│       └── lookup.ts
│
├── scripts/
│   ├── seed-wissensfundus.ts             # NEU — seedt MD-Dateien aus /wissensfundus-seeds/
│   ├── seed-tarife.ts                    # NEU — seedt Marktkorridore (anbieter_name = NULL)
│   ├── seed-vergleich-tarife.ts          # NEU — seedt Anbieter-Einzeltarife aus /vergleich-tarife-seeds/*.csv
│   └── import-finanzteam26-blog.ts       # NEU — alte HTML → blog_posts (sobald Egress freigeschaltet)
│
├── wissensfundus-seeds/                  # NEU — editierbare MD-Files je Thema
│   ├── allgemein/
│   ├── sterbegeld/
│   ├── pflege/
│   ├── leben/
│   ├── bu/
│   └── unfall/
│
├── vergleich-tarife-seeds/               # NEU — CSV pro Produkt mit Anbieter × Alter × Summe → Beitrag
│   ├── sterbegeld.csv                    # bereits vorhanden: Allianz, DELA, Ideal, LV1871, November
│   ├── pflege.csv
│   ├── leben.csv
│   ├── bu.csv
│   └── unfall.csv
│
├── docs/
│   └── convexa-api-anfrage.md            # E-Mail-Vorlage an Convexa-Support
│
├── design-tokens/                        # bestehend
├── sterbegeld24plus-recreation/          # Referenz-Content für Pilot
└── supabase/migrations/
```

---

## SEO / AEO / GEO (höchste Priorität)

**SEO** = klassische Suche · **AEO** = KI-Antworten (ChatGPT, Perplexity, Gemini) · **GEO** = Generative Engine Optimization (Erwähnung in LLM-Outputs).

### Pflicht pro Produktseite
- `generateMetadata()` aus `generierter_content`
- Schema.org JSON-LD (Insurance / FAQ / Product / BreadcrumbList / HowTo / Article)
- Hero startet mit 2-3-Satz-Definition (`produkte.short_pitch`)
- FAQs im Frage-User-Wording, Antwort im 1. Satz
- Auto-Cross-Links zu Wissensfundus-Einträgen (`/wissen/<slug>`)
- Cover-/Hero-Bild mit echtem `alt`-Text (vom Generator gesetzt)

### Globale Pflicht
- `app/sitemap.ts` enthält alle Produkte + Blog + Wissen
- `app/robots.ts` erlaubt KI-Crawler explizit (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
- `app/api/seo/llms/route.ts` liefert `llms.txt`

---

## KI-Content-Generierung

### Texte (Anthropic Claude)
Pipeline und Prompt-Schichten siehe `lib/anthropic/prompt-builder.ts`. Der Generator wird erweitert um:
- Aufruf der Bild-Pipeline pro Sektion mit Slot-Bedarf
- Aufruf des Auto-Linkers vor dem DB-Write (injiziert `<a href="/wissen/...">` Anker in Body-Texte)
- Erzeugung von **Blog-Beiträgen** (separater Generator, schreibt in `blog_posts`)
- **Pflicht-Vorschlag `vergleichsrechner`-Section** in jedem `hauptseite`-Output, sobald für das Produkt mindestens 2 Anbietertarife in `tarife` (`anbieter_name IS NOT NULL`) existieren. Section-Schema:
  ```json
  {
    "type": "vergleichsrechner",
    "headline": "<Produkt> — Tarife im Direktvergleich",
    "intro": "<2–3 Sätze, AEO-Wording, nennt Produktnamen + Zielgruppe>",
    "input_hint": "Geben Sie Geburtsjahr und Wunschsumme ein.",
    "cta_label": "Persönliches Angebot anfordern",
    "anbieter_count_hint": <n>
  }
  ```
  Das Frontend rendert daraus automatisch `<VergleichsRechner produktId={…} />` — die eigentliche Tabelle kommt aus DB, der Generator liefert nur Wording + SEO-Kontext drumherum.
- Wenn keine Anbietertarife vorhanden: Generator schlägt **TODO-Eintrag** ins Admin-Dashboard (`Tarife für <produkt> fehlen — VergleichsRechner kann nicht aktiviert werden`).

### Bilder (OpenAI gpt-image-1)
- `lib/openai/image-generator.ts` → `generateImage({ prompt, size, slot })`
- Generierte Bilder werden in **Supabase Storage** abgelegt, URL + Prompt in `bilder` gespeichert
- Default-Größen: Hero 1792×1024, Inline 1024×1024, OG 1200×630
- Stil-Guard im Prompt: „professionell, deutsch, photorealistisch, ruhige Farben, keine Text-Einblendungen"

---

## Auto-Cross-Linking

Im Wissensfundus pflegt der Admin pro Eintrag `link_phrases` (z. B. `["Sterbegeld", "Bestattungsvorsorge"]`). Der Generator (und der Blog-Editor beim Save) ersetzt diese Phrasen in Body-Texten durch Markdown-Links auf `/wissen/{slug}`. Mehrfach-Vorkommen werden nur einmal pro Sektion verlinkt. Implementierung: `lib/linker/auto-link.ts`.

---

## Rechner-Konzept (zweistufig, Pflicht in jedem Produkt)

Covomo-iframe ist entfernt. Stattdessen gibt es **zwei klar getrennte Rechner**, beide auf derselben `tarife`-Tabelle:

### A) `TarifRechner` (grober Marktkorridor — bestehend)
- Liest `tarife`-Rows mit `anbieter_name IS NULL` → Marktkorridor `low/high`
- User-Eingabe: Alter + Wunschsumme → ein Korridor („ca. 18 € – 26 € / Monat")
- Komponente: `components/sections/TarifRechner.tsx`
- CTA → `LeadForm` mit `intent_tag='preis'`
- Position: Section auf der Hauptseite, oberhalb FAQ

### B) `VergleichsRechner` (Anbieter-Vergleich — NEU, Pflicht in jedem Produkt)
**Genau das, was finanzteam26 in der internen Excel-Tabelle nutzt** (Allianz / DELA / Ideal / LV1871 / November etc.).

- Liest `tarife`-Rows mit `anbieter_name IS NOT NULL` → konkrete Beiträge je Anbieter
- User-Eingabe: Geburtsdatum (oder Alter) + Wunschsumme
- Output: **sortierte Anbieter-Tabelle** (Anbieter, Tarifname, Beitrag/Monat, Besonderheiten aus `besonderheiten` jsonb), günstigster zuerst
- Einordnung: Badge „Günstigster", „Bester Schutz" (= meiste true-Flags in `besonderheiten`), „Schnellster Schutz" (= kürzeste Wartezeit)
- CTA pro Tabellen-Zeile **und** unten gesamt → `LeadForm` mit `intent_tag='preis'`, optional `gewuenschter_anbieter` als versteckter Hidden-Field
- Komponente: `components/sections/VergleichsRechner.tsx` (Client Component)
- Eigene URL: `app/[produkt]/vergleichsrechner/page.tsx` **plus** prominent eingebettet auf Hauptseite
- Pflichtdisclaimer: „Werte aus interner Marktbeobachtung, Stand `<datum>`. Verbindliches Angebot nach Anfrage. Tatsächlicher Beitrag kann je nach Gesundheitsprüfung abweichen."

**Daten-Pflege:** CSV pro Produkt unter `vergleich-tarife-seeds/<produkttyp>.csv`, eingespielt via `scripts/seed-vergleich-tarife.ts`. Admin-UI unter `app/admin/tarife/` muss beide Modi (Marktkorridor + Anbietertarif) editieren können.

Für BU ist die Logik leicht abweichend (`einheit = 'eur_monat'` statt `'eur_summe'`, Eingabefeld „gewünschte Monatsrente").

---

## Lead-Flow (Convexa)

```
Formular-Submit
  → POST /api/leads
  → Zod-Validation + Honeypot + Rate-Limit
  → Insert leads (Supabase)
  → Async parallel:
       a) sendLeadConfirmation (Resend)
       b) sendSalesNotification (Resend)
       c) convexa.push(lead) → setzt convexa_lead_id, convexa_synced=true
  → 201 Response
```

`lib/convexa/client.ts` ist initial Skeleton (POST `/v1/leads` als Annahme), wird scharfgeschaltet sobald Anbieter API-Doku liefert. Solange API fehlt: Leads bleiben mit `convexa_synced=false` in der DB; ein Cron/Manual-Sync-Button im Admin holt sie nach. **E-Mail-Vorlage für die API-Anfrage liegt unter `docs/convexa-api-anfrage.md`.**

---

## Bilder-Pipeline (OpenAI)

```
1. Generator entscheidet pro Sektion: "Bild nötig?"
2. Prompt-Builder erstellt Bild-Prompt aus
   Produktname + Zielgruppe + Section-Kontext + Stil-Guard
3. lib/openai/image-generator.ts → gpt-image-1 (Base64)
4. Upload nach Supabase Storage Bucket "produkt-bilder"
5. Insert bilder-Row mit URL, alt_text (= short headline), prompt_used
6. URL wird in der Section gespeichert
```

Re-Generation: Im Admin gibt es „Bild neu erzeugen"-Button pro Slot.

---

## Pilot + Produkt-Roll-out

1. **sterbegeld24plus** (Pilot, fertig): Content + Bilder + Convexa-Lead-Flow live
2. **pflegezusatz** — DNA + Wissensbasis (siehe `wissensfundus-seeds/pflege/`)
3. **risikoleben** — DNA + Wissensbasis (siehe `wissensfundus-seeds/leben/`)
4. **berufsunfaehigkeit** (BU) — neuer Produkttyp, größte Schnittmenge mit altem finanzteam26-Blog
5. **unfall** — DNA + Wissensbasis

---

## Entwicklungs-Phasen (aktualisiert 2026-04-29)

### Phase 1 — Fundament ✅
- [x] Next.js, Supabase-Schema, Auth, Design-Tokens

### Phase 2 — Content Engine (Texte ✅, Bilder/Auto-Link 🚧)
- [x] Claude-Generator für hauptseite/faq/vergleich/tarif/ratgeber
- [ ] **Auto-Cross-Linking** (`lib/linker/auto-link.ts`)
- [ ] **Bild-Pipeline** (OpenAI gpt-image-1)

### Phase 3 — Public Pages
- [x] Produktseiten + Sitemap + robots.txt + llms.txt
- [ ] **Blog-Routen** (`/blog`, `/blog/[slug]`)
- [ ] **Wissens-Routen** (`/wissen`, `/wissen/[slug]`)

### Phase 4 — Lead-Flow (Migration zu Convexa)
- [x] Lead-Form + Resend
- [ ] **Convexa-Adapter** (`lib/convexa/client.ts`)
- [ ] Confluence-Code entfernen, sobald Convexa stabil

### Phase 5 — Wissensfundus
- [ ] **Markdown-Seeds** für 5 Produkttypen
- [ ] **Blog-Import** alte finanzteam26-Inhalte
- [ ] Admin-MD-Editor

### Phase 6 — Tarife in DB + VergleichsRechner
- [ ] **Tarif-Migration** statisches `lib/tarif-data.ts` → DB (anbieter_name = NULL)
- [ ] **Schema-Erweiterung** `tarife`: `anbieter_name`, `tarif_name`, `besonderheiten` jsonb
- [ ] **CSV-Seed** `vergleich-tarife-seeds/sterbegeld.csv` (Allianz/DELA/Ideal/LV1871/November) → `scripts/seed-vergleich-tarife.ts`
- [ ] **`VergleichsRechner.tsx`** (Daten-Eingabe → Anbietertabelle mit Sortierung + Badges → Lead-Form)
- [ ] **Eigene Route** `app/[produkt]/vergleichsrechner/page.tsx` + Einbettung auf Hauptseite
- [ ] **Generator-Integration**: Auto-Vorschlag `vergleichsrechner`-Section
- [ ] Admin-UI zur Pflege beider Modi (Marktkorridor + Anbietertarif)

### Phase 7 — Roll-out 4 weitere Produkte
- [ ] Pflege, Leben, BU, Unfall mit jeweils vollem Content + Bildern

---

## Coding-Regeln

- **Sprache:** Deutsch in User-Texten + Commits, Englisch im Code
- **Server Components Default**, Client Components nur für Interaktivität
- **Tailwind**: Tokens aus `tokens.json`
- **TypeScript strict**; Supabase-Types aus Schema generieren
- **API-Routes**: Zod-Validation Pflicht
- **Secrets**: niemals in Code; `.env.local` + `einstellungen`-Tabelle (DB-Override)
- **Tests**: Vitest; jede neue API-Route + jedes neue Schema-Feld bekommt Test
- **Commits**: Deutsch, präzise (z. B. „Convexa-Adapter: Skeleton + DB-Felder")

---

## Wichtige Hinweise

1. `design-tokens/tokens.json` — Quelle der Wahrheit für Design
2. `assets/logo.png` + `components/MonsterLogo.tsx` — überall verwenden
3. `sterbegeld24plus-recreation/` — Referenz-Pilot
4. **Originalseite `https://finanzteam26.de/`** ist Brand-Referenz für Look & Feel
5. SEO/AEO/GEO immer Priorität vor Feature-Vollständigkeit
6. **Covomo iframe-Widget ist entfernt** — wir bauen Tarife selbst, behalten 100 % Lead- und Tracking-Hoheit
7. **Confluence-Code ist deprecated** — bleibt nur, bis Convexa stabil läuft
