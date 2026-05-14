# Claude-Code-Prompt · Follow-ups Besprechung 13.05.2026

> **Quelle:** Transkript `Leadmonster Besprechung.docx` (Denis, Kai, Christian) + Nachjustierung durch Denis 14.05.2026.
> **Zweck:** Dieses Dokument ist als Prompt für Claude Code (CLI/Agent) vorbereitet. Es enthält die konkreten TODOs aus dem Meeting, priorisiert nach Dringlichkeit, mit Dateipfaden, Akzeptanzkriterien und O-Tönen als Kontext.
> **Nächster Kundentermin:** Donnerstag, ca. 21.05.2026 · 11:00 — diese Items sollten bis dahin lauffähig sein.

---

## Wie dieses Dokument mit Claude Code verwendet wird

```bash
cd /Users/densen/Dropbox/sen_dev/leadmonster
claude
```

Dann im Prompt:

> Lies `CLAUDE.md` und anschließend `BESPRECHUNG-2026-05-13-CLAUDE-CODE-PROMPT.md`. Arbeite den Block **„P0 — Sprint bis Donnerstag"** Punkt für Punkt ab. Für jeden Punkt: zuerst die betroffenen Dateien identifizieren, dann implementieren, dann Vitest-Test ergänzen, am Ende einen deutschen Commit-Message-Entwurf vorschlagen. Halte dich strikt an die Coding-Regeln aus `CLAUDE.md` (Deutsch in User-Texten, Server Components Default, Zod-Validation, keine Confluence-Reste). Frage nach, wenn ein Akzeptanzkriterium unklar ist.

---

## Globaler Kontext (für Claude Code)

LeadMonster (Next.js 14 App Router · Supabase · Tailwind · Claude API für Texte · OpenAI gpt-image-1 für Bilder · Convexa als einziges CRM · Resend für Mail) ist ein SEO/AEO-Vertriebs-Content-System für finanzteam26. Pilotprodukt **Sterbegeld24Plus** soll **kurzfristig live**. Vier weitere Versicherungsarten (Pflege, Leben, BU, Unfall) sollen über dieselbe Plattform laufen.

Im Meeting hat Denis Stand und Demo gezeigt, Kai (Geschäftsleitung) und Christian (Vertrieb, Lead-Empfänger) haben konkrete Anforderungen genannt. Christian ist der wichtigste interne User des Lead-Outputs — was er sagt, hat hohe Priorität, weil er ohne diese Felder „blind Angebote schicken" muss.

> **O-Ton Denis zum Go-Live:** *„Ich möchte, dass die Sterbegeldseite online gehen kann. Was wir im Hintergrund basteln und Tolles machen können, interessiert ja die User nicht. Aber das sollte bald geschehen."*

> **O-Ton Kai zur Qualitätsschwelle:** *„Das, was halt erst mal dann zu sehen ist, das sollte halt dann aus einem Guss sein und ja, ansprechend und funktionieren."*

---

## P0 — Sprint bis Donnerstag (Go-Live + Design-Hub)

> **Hinweis Reihenfolge:** 1–5 sind funktionale Go-Live-Blocker, 6–10 sind durch Denis am 14.05. priorisiert worden („vorziehen in Plan"). Wenn Zeit knapp wird, in dieser Reihenfolge arbeiten. Items 6 und 7 (Design + Bildstil) wirken visuell am stärksten und sollten **vor** dem Donnerstag-Termin sichtbar sein.

### 1. Lead-Felder vervollständigen: Geburtsdatum, Adresse, Wartezeit

**Warum:** Christian braucht für „blinde" Angebotsversendung exakt diese Felder. Aktuell wird im `TarifRechner` / `VergleichsRechner` die Wartezeit ausgewählt, aber **nicht in den Lead übernommen**. Geburtsjahr (statt vollständiges Geburtsdatum) und fehlende Adresse blockieren ihn ebenfalls.

> *„Ich brauch Geburtsdatum, Adresse, Sterbegeldsumme und Wartezeit." — Christian*
> *„die Wartezeit, die ihr oben ausgewählt habt, das wäre cool, wenn die da drin steht, weil … wenn ich ihn nicht erreiche, dass ich ihm quasi blind ein Angebot schicke und das soll halt so gut wie möglich passen." — Christian*

**Was zu tun ist:**
- `components/sections/LeadForm.tsx`: Pflichtfelder ergänzen
  - `geburtsdatum` (date, statt nur Jahr) — Zod-Validation: volljährig + plausibler Bereich (z. B. 1925–2010)
  - `strasse`, `plz`, `ort` (3 separate Felder, plz: 5-stellig DE)
  - `wartezeit_monate` (versteckt; Prefill aus Rechner-State)
  - `sterbegeld_summe` (versteckt; Prefill aus Rechner-State)
- `components/sections/TarifRechner.tsx` + `components/sections/VergleichsRechner.tsx`: Auswahl von Wartezeit und Summe als URL-Param oder via Context an `LeadForm` weitergeben (Hidden Fields).
- Supabase: Migration `supabase/migrations/2026051X000000_lead_fields.sql` — Spalten `geburtsdatum date`, `strasse text`, `plz text`, `ort text`, `wartezeit_monate int`, `sterbegeld_summe int` zu `leads` hinzufügen.
- `lib/convexa/client.ts`: Mapping ergänzen — PascalCase-Felder `Birthdate`, `Street`, `Zip`, `City`, `WaitingPeriodMonths`, `InsuredAmount` in den Payload. Mit Christians Convexa-Tokens testen.
- `app/api/leads/route.ts`: Zod-Schema erweitern, Tests in `__tests__/leads.test.ts`.

**Akzeptanzkriterium:** Lead-Formular ausfüllen → Supabase-Lead enthält alle sechs neuen Felder → Convexa-Lead enthält sie ebenfalls → Vitest grün.

---

### 2. Markdown-Renderer reparieren (Fett + Sidebar-Links)

**Warum:** Sternchen `**fett**` werden im Frontend roh angezeigt. Links im Seitenbereich (Sidebar des Ratgebers / Wissensfundus) werden nicht korrekt gerendert.

> *„Für Fett gibt es halt keinen Style, das ist der ganze einfache Grund." — Denis*

**Was zu tun ist:**
- `lib/markdown/render.ts`: `<strong>`-Mapping prüfen + Tailwind-Klasse `font-semibold text-navy-900` (oder Brand-Token) anwenden.
- Sidebar-Komponenten (`app/wissen/`, `app/blog/[slug]/`): MarkdownRenderer auch dort einsetzen statt rohem Substring.
- Visual-Regression: ein Ratgeber-Artikel mit `**fettem**` Text + Inline-Link rendert sauber in Hauptbereich UND Sidebar.

**Akzeptanzkriterium:** Auf `/ratgeber/<beliebiger-slug>` und in jeder Sidebar zeigen `**…**` als fett, `[Linktext](url)` als klickbarer Link mit Brand-Farbe.

---

### 3. Profilbild Christian Wimmer korrigieren (kreisförmiges Avatar)

**Korrektur 14.05.:** *Nicht* das Hero-Bild „Maja" ist gemeint — es ist Christians **Profilbild im Kreis** auf der Sterbegeld-Seite (vermutlich Trust-Bereich/Berater-Section), bei dem das Gesicht verrutscht ist bzw. der Crop falsch sitzt.

**Was zu tun ist:**
- Bild-Asset lokalisieren: grep nach Christian/Berater/Avatar in `app/_components/`, `components/sections/`, `bilder`-Tabelle (`slot='avatar'` o. ä.).
- Crop/Position korrigieren — bei reinem CSS-Problem reicht `object-position` + `object-cover` im umgebenden `<div class="rounded-full">`. Wenn das Quellbild selbst schlecht zentriert ist: neues Foto von Christian anfordern oder bestehendes vor Upload zentrieren.
- Sicherstellen, dass der Kreis-Container `aspect-square`, `overflow-hidden` und `rounded-full` hat und das `<Image>` mit `fill` + `object-cover object-center` (oder `object-top` falls Gesicht nach oben rutscht) sitzt.

**Akzeptanzkriterium:** Christians Gesicht sitzt mittig und vollständig im Kreis — auf Desktop und Mobile.

---

### 4. Admin-Logins anlegen: Kai + Christian

**Warum:** Kai (`kai.schmied@finanzteam-26.de`) und Christian (`info@christian-wimmer.eu`) haben noch keinen Admin-Zugang. Self-Service-Account-Anlage greift offenbar nicht („da steht einfach kein Herstellen").

**Was zu tun ist:**
- Supabase-Auth: **beide** User direkt anlegen (Magic-Link oder gesetztes Initialpasswort), Rolle/Policy für `app/admin/(protected)/*` prüfen.
- `app/admin/(protected)/einstellungen/` (oder `/users/`): „Neuen Admin einladen"-Funktion testen und bei Bedarf reparieren — RLS-Policies in `supabase/migrations/` prüfen.
- Beide Accounts vor dem Termin Donnerstag testen (Login → Dashboard → Produkt-CRUD sichtbar).

**Akzeptanzkriterium:** Kai **und** Christian können sich einloggen und sehen Produkte, Tarife-Editor, Lead-Übersicht.

---

### 5. Sterbegeld-Inhalte Review-Lauf (Selfcheck vor Übergabe)

- **Wissensfundus-Artikel haben alle dasselbe Standard-Bild** — per Script alle betroffenen Einträge regenerieren (siehe `scripts/enrich-sterbegeld24plus.ts` als Vorlage, plus `USE_STOCK=1`-Fallback falls OpenAI-Key 401).
- **Leere Author-Cards** auf Redaktions-/Autorenseite — Inhalte hinterlegen oder `published=false`.
- Sitemap-Lauf: `app/sitemap.ts` enthält alle veröffentlichten Routen, keine 404.

**Akzeptanzkriterium:** Keine Doppel-Bilder im Wissensfundus, keine leeren Author-Cards, Sitemap clean.

---

### 6. Design-Politur mit Variant.com-Referenz (VORGEZOGEN ins P0)

**Warum:** Denis hat im Meeting bereits Design-Politur als nächsten Schritt angekündigt; Kai will „aus einem Guss". Christian liefert konkrete visuelle Referenz.

**Visuelle Referenz (Pflicht laden!):**
👉 **https://variant.com/shared/00a74825-4af4-4acc-b1ed-f51e434dd019?t=1778735586360**

⚠️ Die Seite ist eine JS-SPA und liefert bei normalem `curl`/WebFetch **leer** aus. Claude Code **muss** den Headless-Browser (Chrome MCP oder Playwright) verwenden, um sie zu laden. Wenn das fehlschlägt: Denis nach Screenshots fragen, **nicht raten**.

**Übernehmen aus Variant.com-Referenz:**
- **Eleganz der Formulare** — luftige Spacing-Hierarchie, große Input-Höhen (≥ 48–56 px), klare Labels über dem Input statt Placeholder-Pseudo-Labels, deutliche Focus-States in Akzentfarbe, runde Ecken konsistent (vermutlich 8–12 px), Validation-Icons inline.
- **Layout-Rhythmus** — größere vertikale Spacing zwischen Sections (`py-24` statt `py-16`), klar abgegrenzte „Cards" mit dezenten Schatten oder feinen Linien.
- **Grafische Elemente / Linien** — dünne (1px) divider-Linien als Akzent zwischen Sub-Sections, optional Linie als „Story-Anker" durch die Seite (vertikale Zeitachse o. ä.).
- **Typografie** — größerer Headline-Kontrast (Display-Font für H1 / `text-5xl md:text-7xl`, sehr dezentes `text-base` für Body, klare Skala 1.250 oder 1.333).
- **Akzentfarbe** — präsenter einsetzen: nicht nur Buttons, sondern auch dünne Linien, aktive Input-Borders, kleine „Tag"-Elemente, hover-States, Icon-Fills. Trotzdem sparsam genug, dass es Akzent bleibt.
- **Rechner-Darstellung** — Rechner als prominente, eigenständige Card mit eigener visueller Identität (eigene Background-Shade, klare CTA-Hierarchie, Result-Block visuell deutlich von Eingabe getrennt).

**Konkrete Implementierung:**
- `design-tokens/tokens.json` updaten: Spacing-Scale, Border-Radii, Schatten-Token, evtl. neuen Display-Font.
- `tailwind.config.ts` mit neuen Tokens synchronisieren.
- Form-Atome in `components/ui/` (Input, Select, Textarea, Label) refactoren: einheitliche Höhen, Focus-Ring in Akzentfarbe, Error-State-Design.
- `components/sections/TarifRechner.tsx` + `VergleichsRechner.tsx` visuell als „Premium-Card" überarbeiten.
- `app/_components/ProduktHauptseite.tsx`: Section-Rhythmus + Divider-Linien.
- **Mobile zuerst** — alle Änderungen Mobile-First testen (320–414 px), `min-h-screen` und `safe-area-insets` beachten. Touch-Ziele ≥ 44 px.
- Vorher/Nachher-Screenshots in `docs/design-iteration-2026-05.md` festhalten.

**Akzeptanzkriterium:** Sterbegeld-Hauptseite, FAQ, Vergleich und Rechner haben den neuen Look. Lead-Formular fühlt sich „elegant" an (klare Hierarchie, klare Validation, klare CTA). Mobile-Darstellung sauber.

---

### 7. Bildstil-Steuerung pro Produkt zuverlässig (VORGEZOGEN)

> *„Die Idee ist, dass man über den Bildstil die Seite abgrenzt vom Rest. … Dann hast du einen Bildstil." — Denis*

**Was zu tun ist:**
- `lib/openai/image-generator.ts` debuggen: aktuell wird Stil-Referenz nicht zuverlässig übernommen (im Test wurde aus Garten-Vorlage wieder eine Trauerkerze). Möglich:
  - Stil-Hint klarer in den Prompt einbauen (z. B. Bild-zu-Bild-Modus statt nur Text-Prompt, oder expliziter Stil-Token am Prompt-Anfang).
  - Negativ-Prompt gegen Default-Motive („no candles, no flowers, no obvious mourning symbols" wenn Stil das nicht vorsieht).
  - Style-Reference als Bild mit-übergeben (sofern `gpt-image-1` Bild-Input akzeptiert) — sonst Bildbeschreibung der Referenz vorab durch Claude erzeugen lassen und in den Prompt einbauen.
- Admin-UI: Stilreferenz-Bild pro Produkt sichtbar, „neu generieren" mit Preview, „akzeptieren" persistiert in `bilder`.
- Für Sterbegeld zwei Varianten generieren und A/B vergleichbar machen:
  - **Variante A:** Stil der best-performenden Meta-Werbeanzeige (Kai-Vorschlag: leicht pinkig, Rosenblätter).
  - **Variante B:** Würdevoller Schwarz-Weiß-Trauer-Stil (Denis-Vorschlag).
- Den Stil dann **konsequent** auf Hero, Inline-Bilder, Wissensfundus-Cover anwenden.

**Akzeptanzkriterium:** Admin lädt Referenzbild hoch → drei neu generierte Bilder übernehmen sichtbar Farbpalette, Stimmung, Motiv-Welt der Referenz (≥ 2 von 3 ohne Re-Generate brauchbar).

---

### 8. BU-Vergleichsrechner end-to-end aufsetzen (VORGEZOGEN)

> Kai: *„Jetzt möchte ich für die BU auch so einen Vergleichsrechner machen, wo, wie mach ich das dann, wo fang ich da dann an?"*

**Was zu tun ist:**
- Produktanlage `berufsunfaehigkeit` im Admin (sofern noch nicht vorhanden) — Brand-Name, Subline, Pilot-Anbieter aus `vergleich-tarife-seeds/bu.csv`.
- BU-spezifische Felder im Vergleichsrechner sichtbar machen: **Berufsklasse**, **BU-Monatsrente** (`einheit='eur_monat'`), evtl. Endalter. `lib/tarife/produkt-config.ts` für BU pflegen.
- CSV-Import-Komfort: Button im Admin (`app/admin/(protected)/tarife/[slug]/`) — Datei hochladen, Vorschau, validieren, dann persistieren. Denis-Wunsch: *„hochflexibel, dass du mit einer CSV den Inhalt einfüllen kannst."*
- Showcase-How-to als `docs/bu-vergleichsrechner-howto.md` schreiben (Schritte: Produktanlage → CSV in `vergleich-tarife-seeds/bu.csv` mit echten Daten füllen → `npx tsx scripts/seed-vergleich-tarife.ts berufsunfaehigkeit` → Hauptseite generieren → Live-Preview).

**Akzeptanzkriterium:** `/<bu-slug>/vergleichsrechner` zeigt sortierte Anbieter-Tabelle mit Berufsklasse-Filter und Monatsrente; Lead-Flow funktioniert mit BU-spezifischen Prefills.

---

### 9. Content-Tiefe Sterbegeld auf 30–50 Seiten (VORGEZOGEN, beginnt jetzt)

> *„Empfehlung 80 bis 120 Seiten … ich hab an 30, 40, 50 Seiten gedacht, die sinnvoll sind." — Denis*

**Was zu tun ist:**
- Generator-Pipeline um „Ratgeber-Themen-Vorschlag"-Stufe erweitern: Claude schlägt zu Produkt + Zielgruppe **N Themen** vor, Admin wählt aus, Generator schreibt sie durch (Bilder + Auto-Cross-Linking inklusive).
- Themen-Cluster für Sterbegeld zusammenstellen — Long-Tail und AEO-relevante Fragen (z. B. „Sterbegeld vs. Sterbegeldversicherung", „Sterbegeld für Beamte", „Sterbegeld mit Vorerkrankungen", „Sterbegeld steuerfrei?", „Sterbegeld kündigen — geht das?", „Beerdigungskosten 2026").
- Erste **20 zusätzliche Ratgeber-Artikel** Sterbegeld als ersten Schritt zum Ziel 30–50 erzeugen, Status `entwurf`, Review durch Christian/Kai.
- `wissensfundus-seeds/sterbegeld/` weiter ausbauen (Markdown-Seeds bilden das Linker-Vokabular).
- Sitemap + `app/sitemap.ts` automatisch updaten.

**Akzeptanzkriterium:** Sterbegeld-Produkt hat ≥ 30 indexierbare Unterseiten (Hauptseite + FAQ + Vergleich + Tarife + Vergleichsrechner + ≥ 23 Ratgeber/Wissensfundus). Alle Auto-Cross-Links funktionieren.

---

### 10. Tutorial-/Howto-Layer für neue Admin-Nutzer (NEU)

**Warum:** Kai und Christian sind neue Admin-Nutzer. Aktuell gibt es **keine Anleitung in der App**, wie man ein Produkt anlegt, Content generiert, Tarife importiert, Convexa-Token setzt. Ohne diese Schicht braucht jeder Schritt einen Denis-Anruf — das skaliert nicht.

**Was zu tun ist:**
- **Onboarding-Route**: `app/admin/(protected)/onboarding/page.tsx` mit klarem 6-Schritt-Walkthrough:
  1. Produkt anlegen (Slug, Typ, Brand)
  2. Convexa-Form-Token eintragen
  3. CSV mit Anbieter-Tarifen importieren (Link zur `vergleich-tarife-seeds/README.md`-Doku)
  4. Content generieren (Hauptseite/FAQ/Vergleich/Ratgeber)
  5. Bildstil setzen + Hero/Inline-Bilder generieren
  6. Status `publiziert` setzen + Sitemap-Eintrag prüfen
- **Kontext-Tooltips** (`?`-Icons) an jedem Admin-Form-Feld mit Erklärung in 1–2 Sätzen.
- **Dismissible Info-Banner** pro Admin-Sektion (Produkte / Tarife / Bilder / Leads / Wissensfundus) — beim ersten Besuch sichtbar, „verstanden"-Button persistiert in `einstellungen` pro User.
- **Howto-Dokumente** als Markdown unter `docs/howto/` für jeden Workflow (verlinken aus Tooltips + Onboarding-Seite):
  - `docs/howto/neues-produkt-anlegen.md`
  - `docs/howto/tarife-importieren-csv.md`
  - `docs/howto/convexa-token-setzen.md`
  - `docs/howto/content-generieren.md`
  - `docs/howto/bildstil-konfigurieren.md`
  - `docs/howto/leads-bearbeiten.md`
- **Inline-Help-Drawer**: ein „Hilfe"-Button (rechts oben in Admin), öffnet Drawer mit Markdown-Rendering der relevanten Howto-Datei zur aktuellen Route.

**Akzeptanzkriterium:** Ein Neunutzer (Kai oder Christian) kann ohne Denis-Hilfe ein neues Produkt + Tarif-Import + Content-Generation durchführen, indem er nur dem Onboarding folgt.

---

## P1 — Mittelfristig

### 11. Convexa-Token pro Produkt produktiv schalten

- Felder existieren laut `CLAUDE.md` (`produkte.convexa_form_token`). Admin-Maske `app/admin/(protected)/produkte/[slug]/` testen, Token-Eingabe ergonomisch + Erklärungstext.
- Echter Test mit Christians Produktiv-Token für Sterbegeld (statt Denis' Testaccount).
- Re-Sync-Button (`resyncPendingLeads()`) in Lead-Übersicht freischalten.

### 12. Eigene Meta-Webhook-Integration (statt Save-My-Leads-Brücke)

**Warum:** Save-My-Leads ist als Übergangs-Tool teuer und langsam. Denis-Wunsch: *„mittelfristig … abbestellen wollen"*. Eigene Lösung erhält volle Lead-Hoheit.

**Was zu tun ist:**
- `app/api/leads/meta-webhook/route.ts`: Endpoint, der Meta-Lead-Form-Webhooks empfängt.
  - Signaturprüfung (`X-Hub-Signature-256` gegen App-Secret).
  - Zod-Schema für Meta-Payload (`field_data`, `form_id`, `leadgen_id`).
  - Mapping auf interne `leads`-Struktur (Geburtsdatum, Adresse, Wartezeit etc.).
  - Insert in Supabase + Convexa-Push + Resend-Mail wie bestehender Flow.
- Meta Business Manager: Webhook-Subscription auf `leadgen` einrichten, Endpoint-URL eintragen.
- Test mit Meta „Lead Ads Testing Tool".
- `docs/howto/meta-webhook-einrichten.md` schreiben (passt zur Howto-Schicht aus #10).
- Mappings für Form-IDs in `einstellungen`-Tabelle hinterlegen (Form → Produkt).
- **Übergangsweise**: Save-My-Leads-Zugang (von Kai zu besorgen) parallel laufen lassen, bis eigener Webhook stabil ist.

**Akzeptanzkriterium:** Test-Lead aus Meta Lead Ads landet vollautomatisch in Supabase + Convexa + Bestätigungsmail an Lead + Notification an Vertrieb.

### 13. Google Search Console + Analytics nach Domain-Cutover

- Sobald `sterbegeld24plus.de` produktiv: neue GSC-Property + GA4-Property anlegen, Sitemap einreichen.
- Verifikations-Datei oder DNS-TXT vorbereiten — `public/google*.html` oder via Next-Headers.

---

## P2 — Backlog

### 14. Skalierung Content-Tiefe auf 80–120 Seiten

- Über das Sterbegeld-30-50-Sprintziel hinaus: Long-Form-Cluster, FAQ-Erweiterungen, Lokal-/Regional-Seiten (Sterbegeld München, Sterbegeld Berlin etc.), Vergleichs-Long-Tail (Sterbegeld vs. Bestattungsvorsorge usw.).

### 15. KI-Gesundheitsfragen-Bot (BU-Risikovoranfrage) — VERTAGT

- Kais Idee, im Meeting explizit „nicht jetzt" vertagt. Als Backlog-Item belassen.

### 16. Lead-Überschuss-Verkauf via Convexa

- Kommerziell, nicht technisch akut. Wenn Christian versorgt ist und Lead-Volumen Überschuss erzeugt: Anbindung Convexa-Marktplatz prüfen.

---

## Coding-Regeln Reminder (aus `CLAUDE.md`, Pflicht)

- Deutsch in User-Texten und Commits, Englisch im Code.
- Server Components Default; Client Components nur für Interaktivität (Rechner, Formulare).
- API-Routes: **Zod-Pflicht**.
- Tests: **Vitest** für jede neue API-Route und jedes neue Schema-Feld.
- Secrets ausschließlich in `.env.local` + `einstellungen`-Tabelle, niemals im Code.
- Keine neuen Confluence-Referenzen (vollständig entfernt am 30.04.2026).
- Tailwind nur über Tokens aus `design-tokens/tokens.json`.

---

## Definition of Done für diese Iteration

1. P0 (Items 1–10) vollständig: implementiert, getestet, deployed auf Preview-URL.
2. P0 abgenommen durch Denis (Self-Review + lokaler Test mit echtem Convexa-Token von Christian).
3. P1 #11 mindestens angefangen (Convexa-Token-Setup mit echtem Token).
4. Kurzes Status-Update als `KUNDEN-MEETING-2026-05-21.md` (oder Update von `KUNDEN-MEETING-2026-05-13.md`) für nächsten Termin.
5. Kai **und** Christian können das Admin-Onboarding selbst durchlaufen (P0 #10).

---

## Anhang · Verbatim-Quotes als Belegmaterial

- *„Ich brauch Geburtsdatum, Adresse, Sterbegeldsumme und Wartezeit." — Christian, 52:49*
- *„die Wartezeit, die ihr oben ausgewählt habt, das wäre cool, wenn die da drin steht … dass ich ihm quasi blind ein Angebot schicke und das soll halt so gut wie möglich passen." — Christian, 53:15*
- *„ich möchte, dass die Sterbegeldseite online gehen kann. … das sollte bald geschehen." — Denis, 1:04:47*
- *„Es ist nicht endgültig, wie du es jetzt siehst. Mir gefällt es noch nicht so gut, aber ich hab da jetzt nicht so den Augenmerk draufgelegt." — Denis zum Design, 36:31*
- *„Können jetzt zum Beispiel das Bild nehmen von der bestlaufendsten Werbeanzeige. … Dann machen wir doch unsere Seite in dem ganzen Stil." — Kai, 39:23*
- *„es sollte hochflexibel sein, dass du mit einer CSV den Inhalt einfüllen kannst." — Denis, 59:58*
- *„Das, was halt erst mal dann zu sehen ist, das sollte halt dann aus einem Guss sein und ja, ansprechend und funktionieren." — Kai, 1:05:07*
- *„Es gibt eine Empfehlung, wieviel Seiten ein Produkt haben soll, die soll 80 bis 120 Seiten haben. … vielleicht 30, 40, 50 Seiten, die sinnvoll sind." — Denis, 46:16*

---

*Erstellt 2026-05-13 aus Transkript `Leadmonster Besprechung.docx`. Erweitert 2026-05-14 (Vorziehen Design/Bildstil/BU/Content, Korrektur Profilbild, Meta-Webhook eigene Integration, Tutorial-Layer, zweiter Admin-Account). Nächster Kundentermin Do 21.05.2026, 11:00.*
