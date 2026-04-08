# LeadMonster — CLAUDE.md

Vollständige Systembeschreibung für KI-gestützten Aufbau des LeadMonster-Systems für Finanzteam 26.

---

## Vision & Kontext

**LeadMonster** ist ein skalierbares Vertriebs-Content-System für Versicherungsprodukte.

**Problem bisher:** Jedes Versicherungsprodukt = manuelles Einzelprojekt. Kein System, keine Skalierung.

**Ziel:** Ein Admin-System, bei dem der Vertrieb Produkt + Zielgruppe + Fokus eingibt — und automatisch eine vollständige, SEO- und AEO-optimierte Produktwebsite mit Landingpages, FAQs, Vergleichen und Leadformularen entsteht.

**Pilot-Produkt:** `sterbegeld24plus` — dessen Content in `/sterbegeld24plus-recreation/` als Referenz dient.

---

## Tech Stack

| Schicht | Technologie | Warum |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR/SSG zwingend für SEO |
| Styling | **Tailwind CSS** + Design Tokens | Tokens in `/design-tokens/tokens.json` |
| Datenbank | **Supabase (PostgreSQL)** | Produkt-Konfigurationen, Leads, Content |
| Auth | **Supabase Auth** | Admin-Bereich absichern |
| KI-Texte | **Anthropic Claude API** | Modell: `claude-opus-4-6` für Content-Qualität |
| E-Mail | **Resend** | Lead-Bestätigungen, Admin-Notifications |
| Lead-CRM | **Confluence API** | Leads aus Formularen als Confluence-Pages |
| Bilder | **Stock-Photos** (Unsplash API o.ä.) | Keine KI-Bildgenerierung |
| Deployment | **Vercel** | Next.js nativ, Edge-Funktionen |

---

## Umgebungsvariablen

Alle Secrets ausschliesslich in `.env.local` (nie in Git):

```
# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dwlopmxtiokdvjjowfke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# Confluence
CONFLUENCE_BASE_URL=
CONFLUENCE_EMAIL=
CONFLUENCE_API_TOKEN=
CONFLUENCE_SPACE_KEY=
CONFLUENCE_PARENT_PAGE_ID=

# Unsplash (Stock-Bilder)
UNSPLASH_ACCESS_KEY=
```

`.env.example` mit diesen leeren Keys ins Repo committen.

---

## System-Architektur (4 Ebenen)

```
1. WISSENSFUNDUS          →    2. PRODUKT-DNA
   Versicherungslogik,             z.B. Sterbegeld, Pflege,
   allg. Fach-Content              Lebensversicherung
        ↓                                ↓
3. VERTRIEBSSTEUERUNG     →    4. CONTENT ENGINE
   Zielgruppe + Fokus               Seiten + Texte generieren
   (Admin-Eingabe)                  SEO-Struktur + Formulare
```

---

## Datenbankschema (Supabase PostgreSQL)

### Tabelle: `produkte`
```sql
id            uuid primary key default gen_random_uuid()
slug          text unique not null          -- z.B. "sterbegeld24plus"
name          text not null                 -- z.B. "Sterbegeld24Plus"
typ           text not null                 -- sterbegeld | pflege | leben | unfall
status        text default 'entwurf'        -- entwurf | aktiv | archiviert
domain        text                          -- optional: eigene Domain später
created_at    timestamp default now()
updated_at    timestamp default now()
```

### Tabelle: `produkt_config`
```sql
id            uuid primary key default gen_random_uuid()
produkt_id    uuid references produkte(id) on delete cascade
zielgruppe    text[]                         -- ["senioren_50plus", "familien"]
fokus         text                           -- sicherheit | preis | sofortschutz
anbieter      text[]                         -- Liste der Versicherer
argumente     jsonb                          -- Key-Selling-Points als JSON
```

### Tabelle: `wissensfundus`
```sql
id            uuid primary key default gen_random_uuid()
kategorie     text not null                  -- produkt-typ als Kategorie
thema         text not null                  -- z.B. "was_ist_sterbegeld"
inhalt        text not null                  -- Fach-Content, Markdown
tags          text[]
```

### Tabelle: `generierter_content`
```sql
id            uuid primary key default gen_random_uuid()
produkt_id    uuid references produkte(id) on delete cascade
page_type     text not null                  -- hauptseite | faq | vergleich | ratgeber | tarif
slug          text                           -- URL-Segment
title         text
meta_title    text                           -- SEO max 60 Zeichen
meta_desc     text                           -- SEO max 160 Zeichen
content       jsonb                          -- strukturierter Content (Sektionen)
schema_markup jsonb                          -- Schema.org JSON-LD
status        text default 'entwurf'         -- entwurf | review | publiziert
generated_at  timestamp default now()
published_at  timestamp
```

### Tabelle: `leads`
```sql
id                  uuid primary key default gen_random_uuid()
produkt_id          uuid references produkte(id)
vorname             text
nachname            text
email               text not null
telefon             text
interesse           text                     -- Freitext oder Auswahl
zielgruppe_tag      text                     -- aus Produkt-Config
intent_tag          text                     -- sicherheit | preis | sofortschutz
confluence_page_id  text                     -- ID der erstellten Confluence-Page
confluence_synced   boolean default false
resend_sent         boolean default false
created_at          timestamp default now()
```

### Tabelle: `einstellungen`
```sql
id            uuid primary key default gen_random_uuid()
schluessel    text unique not null               -- z.B. "confluence_base_url"
wert          text                               -- verschlüsselt gespeichert (sensible Keys)
beschreibung  text
updated_at    timestamp default now()
updated_by    uuid references auth.users(id)
```

Confluence-Credentials werden hier gespeichert und überschreiben die `.env`-Fallbacks:
- `confluence_base_url`
- `confluence_email`
- `confluence_api_token` ← verschlüsselt (AES via Supabase Vault oder pgcrypto)
- `confluence_space_key`
- `confluence_parent_page_id`

**Lese-Logik in `lib/confluence/client.ts`:**
1. Erst DB-Tabelle `einstellungen` prüfen
2. Fallback: `process.env.CONFLUENCE_*`

### Tabelle: `email_sequenzen`
```sql
id            uuid primary key default gen_random_uuid()
produkt_id    uuid references produkte(id)
trigger       text                           -- form_submit | manual
betreff       text
html_body     text
delay_hours   integer default 0
aktiv         boolean default true
```

---

## Dateistruktur (Next.js App Router)

```
/
├── app/
│   ├── layout.tsx                    # Root Layout, Global SEO defaults
│   ├── page.tsx                      # Startseite (Produktübersicht)
│   │
│   ├── [produkt]/                    # Dynamische Produktrouten
│   │   ├── page.tsx                  # Haupt-Landingpage
│   │   ├── faq/page.tsx              # FAQ (FAQ-Schema)
│   │   ├── vergleich/page.tsx        # Vergleichslogik
│   │   ├── tarife/page.tsx           # Pseudo-Tarifrechner
│   │   └── ratgeber/
│   │       └── [thema]/page.tsx      # Entscheidungs-Guides
│   │
│   ├── admin/                        # Geschützter Admin-Bereich
│   │   ├── layout.tsx                # Auth-Guard
│   │   ├── page.tsx                  # Dashboard
│   │   ├── produkte/
│   │   │   ├── page.tsx              # Produktliste
│   │   │   ├── neu/page.tsx          # Neues Produkt anlegen
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Produkt bearbeiten
│   │   │       └── content/page.tsx  # Content generieren/reviewen
│   │   ├── leads/page.tsx            # Lead-Übersicht
│   │   ├── wissensfundus/page.tsx    # Wissensdatenbank pflegen
│   │   └── einstellungen/page.tsx    # Confluence-Account + API-Credentials ändern
│   │
│   └── api/
│       ├── generate/route.ts         # Claude Content-Generierung
│       ├── leads/route.ts            # Lead-Eingang + Confluence + Resend
│       ├── confluence/route.ts       # Confluence-Sync
│       └── admin/
│           ├── produkte/route.ts
│           └── content/route.ts
│
├── components/
│   ├── ui/                           # Atomare UI-Komponenten (Design Tokens)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── sections/                     # Seitenabschnitte (wiederverwendbar)
│   │   ├── Hero.tsx
│   │   ├── FeatureGrid.tsx
│   │   ├── TrustBar.tsx
│   │   ├── FAQ.tsx
│   │   ├── Vergleich.tsx
│   │   ├── TarifRechner.tsx          # Pseudo-Rechner für Conversion
│   │   └── LeadForm.tsx
│   └── admin/
│       ├── ProduktForm.tsx
│       ├── ContentPreview.tsx
│       └── LeadTable.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser-Client
│   │   └── server.ts                 # Server-Client (Service Role)
│   ├── anthropic/
│   │   └── generator.ts              # Content-Generierungs-Prompts
│   ├── confluence/
│   │   └── client.ts                 # Lead als Confluence-Page anlegen
│   ├── resend/
│   │   └── mailer.ts                 # E-Mail-Versand
│   └── seo/
│       ├── schema.ts                 # Schema.org JSON-LD Generator
│       └── metadata.ts               # Next.js Metadata Generator
│
├── design-tokens/                    # BESTEHEND — nicht löschen
│   ├── tokens.json
│   └── tailwind-config-snippet.js
│
├── sterbegeld24plus-recreation/      # BESTEHEND — Referenz-Content
│   ├── assets/hero-bg.jpg
│   └── styles.css
│
└── assets/
    └── logo.png                      # BESTEHEND
```

---

## SEO & AEO Strategie (höchste Priorität)

**SEO = klassische Suchmaschinen, AEO = KI-Suche (ChatGPT, Perplexity, Gemini)**

### Technisches SEO
- Next.js `generateMetadata()` für jede Route, dynamisch aus DB
- `sitemap.xml` auto-generiert via `app/sitemap.ts`
- `robots.txt` via `app/robots.ts` — AI-Crawler explizit erlauben
- `llms.txt` im Root — strukturierte Beschreibung für LLM-Crawler
- Canonical URLs immer gesetzt
- Strukturierte Daten (Schema.org) für jede Seite als JSON-LD

### Schema.org pro Seitentyp
```
Hauptseite    →  InsuranceAgency + Product + BreadcrumbList
FAQ           →  FAQPage (jede Frage als Question + Answer)
Vergleich     →  ItemList + Product
Ratgeber      →  Article + BreadcrumbList + HowTo
```

### AEO — Optimierung für KI-Antworten
- Jede Seite beginnt mit einer klaren 2-3 Satz Definition ("Was ist X?")
- FAQs im Format: Frage exakt wie User sie stellen würde + direkte Antwort im 1. Satz
- Klare Entitäten: Produktname, Anbieter, Zielgruppe immer explizit benannt
- `llms.txt` Datei beschreibt das gesamte System für LLM-Crawler
- Kein Marketing-Jargon in Headings — direkte, informative H-Tags

### URL-Struktur
```
/sterbegeld24plus                          Hauptseite
/sterbegeld24plus/faq                      FAQ
/sterbegeld24plus/vergleich                Vergleich Anbieter
/sterbegeld24plus/tarife                   Tarifrechner
/sterbegeld24plus/ratgeber/was-ist-das     Ratgeber-Artikel
/sterbegeld24plus/ratgeber/fuer-wen        Zielgruppen-Guide
```

---

## KI-Content-Generierung (Anthropic Claude)

### Pipeline

```
Admin gibt ein:                    Claude generiert:
  Produkt-Typ                  →    Wissensfundus-Content
  + Zielgruppe                 →    Zielgruppen-spezifischer Ton
  + Fokus (Sicherheit/Preis)   →    Passende Argumente + CTAs
  + Anbieter                   →    Vergleichstabelle
                               →    10 FAQs
                               →    3 Ratgeber-Artikel
                               →    Meta-Titles + Descriptions
                               →    Schema.org Markup
```

### Prompt-Architektur (`lib/anthropic/generator.ts`)

Jede Generierungsfunktion erhält:
1. **System-Prompt:** Rolle (dt. SEO-Texter für Versicherungen), Ton, AEO-Regeln
2. **Wissensfundus-Kontext:** Relevante Einträge aus DB per Kategorie
3. **Produkt-DNA:** Typ, Anbieter, USPs
4. **Vertriebssteuerung:** Zielgruppe, Fokus
5. **Output-Format:** Strukturiertes JSON (nie Markdown direkt)

### Content-Output-Format (JSON in DB)
```json
{
  "sections": [
    {
      "type": "hero",
      "headline": "...",
      "subline": "...",
      "cta_text": "Jetzt Angebot anfordern",
      "cta_anchor": "#formular"
    },
    {
      "type": "features",
      "items": [{ "icon": "shield", "title": "...", "text": "..." }]
    },
    {
      "type": "faq",
      "items": [{ "frage": "...", "antwort": "..." }]
    }
  ]
}
```

---

## Admin-Bereich

### Produkt anlegen — Workflow
1. Name + Slug eingeben
2. Produkttyp wählen (Sterbegeld / Pflege / Lebensversicherung / Unfall)
3. Zielgruppe definieren (Multi-Select: Senioren 50+, Familien, Alleinstehende...)
4. Fokus setzen: Sicherheit | Preis | Sofortschutz
5. Anbieter eintragen (Liste)
6. **"Content generieren"** — Claude API wird aufgerufen
7. Preview + manuelle Nachbearbeitung möglich
8. Status: Entwurf → Review → Publiziert

### Admin-Routen absichern
- Supabase Auth Session prüfen in `app/admin/layout.tsx`
- Kein öffentlicher Zugang ohne Login
- Redirect zu `/admin/login` wenn keine Session

---

## Lead-Flow (Confluence als CRM)

### Wenn ein Lead-Formular abgesendet wird:

```
1. Formular-Submit → /api/leads POST
2. Lead in Supabase speichern (leads-Tabelle)
3. Confluence-Page anlegen:
   - Space: CONFLUENCE_SPACE_KEY
   - Parent: CONFLUENCE_PARENT_PAGE_ID (z.B. "Leads 2026")
   - Titel: "Lead: {Vorname} {Nachname} — {Produkt} — {Datum}"
   - Inhalt: Alle Felder als Confluence-Tabelle
   - Labels: produkt-slug, zielgruppe-tag, intent-tag
4. Resend: Bestätigungs-E-Mail an Lead
5. Resend: Notification an Vertrieb (konfigurierbar)
6. confluence_synced = true in Supabase setzen
```

### Confluence-Page-Format
```
Neuer Lead: Max Mustermann
Produkt: Sterbegeld24Plus
Interesse: Sofortschutz für Eltern
Zielgruppe: Senioren 50+
Intent: sofortschutz

| Feld       | Wert              |
|------------|-------------------|
| Vorname    | Max               |
| Nachname   | Mustermann        |
| E-Mail     | max@example.de    |
| Telefon    | 0151 1234567      |
| Nachricht  | ...               |
| Zeitstempel| 2026-04-02 10:30  |
```

---

## Tarifrechner (Pseudo-Rechner für Conversion)

Kein echter Tarifrechner mit Live-API. Stattdessen Conversion-optimierter Pseudo-Rechner:

1. User gibt ein: Alter, gewünschte Summe (z.B. 5.000–15.000 €)
2. System zeigt: Beispielbeitrag-Spanne (aus hinterlegten Muster-Daten)
3. CTA: "Ihren genauen Beitrag jetzt anfragen" → Lead-Formular
4. Intent-Tag wird automatisch gesetzt: "preis" wenn Rechner genutzt

**Wichtig:** Klar als Beispielrechnung kennzeichnen (Disclaimer).

---

## Pilot-Produkt: sterbegeld24plus

Der Content in `/sterbegeld24plus-recreation/` ist die Referenz:
- `styles.css` zeigt das Design-System (Navy + Gold, Premium-Look)
- `assets/hero-bg.jpg` ist das Hero-Bild

Dieses Produkt soll als erstes vollständig gebaut werden:
- Alle Seiten generiert
- Echter Lead-Flow aktiv
- Als Template für alle weiteren Produkte

---

## Entwicklungs-Phasen

### Phase 1 — Fundament
- [ ] Next.js Projekt aufsetzen (Design Tokens integrieren)
- [ ] Supabase-Schema anlegen (alle Tabellen)
- [ ] Auth-System (Supabase Auth, Admin-Login)
- [ ] `.env.local` Setup-Doku

### Phase 2 — Content Engine
- [ ] Anthropic-Integration (`lib/anthropic/generator.ts`)
- [ ] Admin-UI: Produkt anlegen + Config
- [ ] Content-Generierung via Claude
- [ ] Content-Preview + manuelle Bearbeitung

### Phase 3 — Public Pages (SEO/AEO)
- [ ] `[produkt]/page.tsx` mit SSG
- [ ] FAQ-Seite mit FAQ-Schema
- [ ] Vergleichsseite
- [ ] Tarifrechner (Pseudo)
- [ ] Ratgeber-Seiten
- [ ] `sitemap.xml` + `robots.txt` + `llms.txt`

### Phase 4 — Lead-Flow
- [ ] Lead-Formular-Komponente
- [ ] `/api/leads` Route
- [ ] Confluence-Integration
- [ ] Resend-E-Mails (Lead-Bestätigung + Vertrieb-Notification)

### Phase 5 — Pilot-Produkt live
- [ ] sterbegeld24plus vollständig befüllt
- [ ] Content reviewed + publiziert
- [ ] Lead-Flow getestet (Ende-zu-Ende)

---

## Coding-Regeln

- **Sprache:** Deutsch in allen User-facing Texten, Englisch im Code
- **Komponenten:** Server Components wo möglich (SEO), Client Components nur für Interaktivität
- **Tailwind:** Design Tokens aus `tokens.json` als Tailwind-Config-Extension einbinden
- **Types:** TypeScript strict mode, Supabase-Types aus Schema generieren
- **API-Routes:** Immer Input validieren (zod), nie rohe Requests weiterleiten
- **Secrets:** Niemals in Code oder CLAUDE.md — immer via `process.env`
- **Commits:** Deutsch, präzise (z.B. "Admin: Produkt-Anlegen-Flow implementiert")

---

## Wichtige Hinweise

1. `design-tokens/tokens.json` — bestehend, als Quelle der Wahrheit für alle Design-Entscheidungen
2. `assets/logo.png` — bestehend, überall verwenden
3. `sterbegeld24plus-recreation/` — Referenz-Content, darf verändert und in Next.js überführt werden
4. Aktuelle `src/` (Vite-Boilerplate) + `index.html` + `eslint.config.js` + `vite.config.js` — können gelöscht werden wenn Next.js aufgesetzt ist
5. SEO und AEO haben immer Priorität vor Feature-Vollständigkeit
