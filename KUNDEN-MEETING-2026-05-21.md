# Status-Update für Kundentermin Donnerstag, 21.05.2026, 11:00

Sprint zwischen Besprechung (13.05.) und Termin (21.05.) — alle 10 P0-Items aus [BESPRECHUNG-2026-05-13-CLAUDE-CODE-PROMPT.md](./BESPRECHUNG-2026-05-13-CLAUDE-CODE-PROMPT.md) bearbeitet.

---

## Was umgesetzt wurde

### 1. Lead-Felder vollständig (Christian-Wunsch „blinde Angebote") ✅

- DB-Migration [supabase/migrations/20260514000000_lead_kontakt_felder.sql](./supabase/migrations/20260514000000_lead_kontakt_felder.sql) ist live: `geburtsdatum`, `strasse`, `plz`, `ort`, `sterbegeld_summe` zur `leads`-Tabelle hinzugefügt.
- [LeadForm.tsx](./components/sections/LeadForm.tsx) zeigt jetzt sichtbare Felder: Geburtsdatum, Straße, PLZ, Ort. Plus Hidden-Fields `defaultSumme` / `defaultWartezeitMonate`, die aus TarifRechner + VergleichsRechner durchgereicht werden.
- API-Validation in [app/api/leads/route.ts](./app/api/leads/route.ts): Zod-Range 1925-2010 für Geburtsdatum, PLZ 5-stellig DE.
- Convexa-Mapping in [lib/convexa/client.ts](./lib/convexa/client.ts): `Birthdate`, `Street`, `Zip`, `City`, `InsuredAmount` werden im PascalCase-Body gesendet.
- 16 Vitest-Tests grün inkl. 3 neue Cases (vollständige Payload, PLZ-Fehler, Geburtsdatum-Out-of-Range).

### 2. Markdown-Renderer repariert ✅

- `**fett**` rendert jetzt als `<strong class="font-bold text-[#1a365d]">` (vorher unstyled).
- `*kursiv*` rendert als `<em class="italic">`.
- [InlineMarkdown.tsx](./components/util/InlineMarkdown.tsx) unterstützt jetzt Bold/Italic auch in Headlines + Sidebars (vorher nur Links).

### 3. Christians Profilbild-Crop korrigiert ✅

- [AuthorByline.tsx](./components/sections/AuthorByline.tsx) `object-[center_10%]` → `object-[center_25%]` (mildere Top-Bias).
- [redaktion/page.tsx](./app/admin/(protected)/redaktion/page.tsx) ergänzt um `object-cover object-[center_25%]`.

### 4. Admin-Logins für Kai + Christian ✅

- Idempotentes Script [scripts/seed-admin-users.ts](./scripts/seed-admin-users.ts) legt Kai (`kai.schmied@finanzteam-26.de`) + Christian (`info@christian-wimmer.eu`) via Service-Role an.
- **Aufruf vor Termin**: `INITIAL_PASSWORD='xxx' npx tsx scripts/seed-admin-users.ts` (Passwort separat kommunizieren).

### 5. Sterbegeld-Review-Tools ✅

- [scripts/sitemap-audit.ts](./scripts/sitemap-audit.ts) prüft alle URLs der Sitemap auf 200/4xx/5xx.
- Author-Cards: keine published-Redaktion-Rows ohne Bio/Foto im DB-Audit gefunden — alle clean.

### 6. Design-Politur (Foundation) ✅

- Neue Form-Atome in [components/ui/](./components/ui/): `Input.tsx` (h-12, focus-ring brand-cyan), `Textarea.tsx`, `Select.tsx`, `Label.tsx` (mit required-Stern), `FieldError.tsx`.
- [LeadForm.tsx](./components/sections/LeadForm.tsx) komplett auf Atome refactored — konsistente 48px-Inputs, sichtbare Focus-States, Error-Variante mit roter Border.
- **Bleibt offen**: variant.com-spezifischer Refactor (Section-Rhythmus, Display-Font, Akzentfarbe). Wartet auf Screenshots-Upload vom Kunden — Foundation ist gelegt.

### 7. Bildstil-Steuerung (Style-First + Negativ-Prompt) ✅

- [hero-prompt.ts](./lib/openai/hero-prompt.ts) komplett restrukturiert: bei aktiver Style-Reference **steht VISUAL STYLE jetzt am Prompt-Anfang** (LLMs gewichten Anfang stärker), Default-Motive aus BRAND_LOOKS werden weggelassen.
- Neuer **Negativ-Prompt** pro Produkttyp: `TYP_NEGATIVE_MOTIFS.sterbegeld = "candles, lit flames, lily flowers, gravestones, urns, funeral wreaths"`. Verhindert dass selbst bei Garten-Vorlage wieder Trauerkerzen rauskommen.
- [StyleReferencePanel](./app/admin/(protected)/produkte/[id]/_components/StyleReferencePanel.tsx) (existiert bereits) + Vision-Analyse via GPT-4o-mini sind verdrahtet.
- **Action für Termin**: A/B-Set für Sterbegeld24Plus (Variante A: Meta-Anzeige pinkig, Variante B: Schwarz-Weiß-Trauer) — Kai + Christian liefern die zwei Referenzbilder.

### 8. BU-Vergleichsrechner end-to-end ✅

- BU-Produkt existiert in DB (Slug `bu`).
- 225 BU-Anbietertarife aus [vergleich-tarife-seeds/bu.csv](./vergleich-tarife-seeds/bu.csv) ge-seedet.
- **Neu**: CSV-Upload-UI im Admin-Tarif-Editor ([app/admin/(protected)/tarife/_components/CsvImport.tsx](./app/admin/(protected)/tarife/_components/CsvImport.tsx)) — Datei wählen → Vorschau → „Importieren" → Result mit Inserted/Skipped/Errors.
- Server-Action [importTarifeCsv](./app/admin/tarife/actions.ts) validiert pro Zeile, batchet 50er Upserts.
- Howto-Doc: [docs/howto/bu-vergleichsrechner-howto.md](./docs/howto/bu-vergleichsrechner-howto.md).

### 9. Content-Tiefe: 20 Sterbegeld-Ratgeber ✅ (Pipeline + 20 Themen)

- [scripts/sterbegeld-ratgeber-themen.ts](./scripts/sterbegeld-ratgeber-themen.ts): 20 Long-Tail/AEO-Themen (Vorerkrankungen, Beamte, kündigen, Suizid, Hartz-IV, Scheidung, Bestatter-Treuhand…).
- INTERNAL_SECRET-protected Route [app/api/admin/internal/generate-batch/route.ts](./app/api/admin/internal/generate-batch/route.ts) iteriert pro Topic und ruft `generateContent(produktId, topic)` auf.
- [scripts/generate-sterbegeld-ratgeber-batch.ts](./scripts/generate-sterbegeld-ratgeber-batch.ts) postet gegen die Route, Logs progress.
- **Action für Termin**: `npx tsx scripts/generate-sterbegeld-ratgeber-batch.ts --base=https://leadmonster-kappa.vercel.app` (~30 min Laufzeit, ~$2.80 via Vercel AI Gateway). Drafts landen als `entwurf`, Christian/Kai reviewen.

### 10. Onboarding + Howto-Schicht (minimal) ✅

- Neue Admin-Route [/admin/onboarding](./app/admin/(protected)/onboarding/page.tsx) mit 6-Schritt-Walkthrough.
- 6 Howto-Markdowns in [docs/howto/](./docs/howto/):
  - neues-produkt-anlegen.md
  - tarife-importieren-csv.md
  - convexa-token-setzen.md
  - content-generieren.md
  - bildstil-konfigurieren.md
  - leads-bearbeiten.md
  - bu-vergleichsrechner-howto.md (Bonus, aus Item 8)
- Markdown-Rendering im Admin via [/admin/onboarding/howto/[slug]](./app/admin/(protected)/onboarding/howto/[slug]/page.tsx).
- Sidebar-Eintrag „Erste Schritte" in [admin-nav.tsx](./app/admin/_components/admin-nav.tsx) prominent oberhalb Produkte.

---

## Querschnitt

- **Vercel AI Gateway** ist verdrahtet ([lib/openai/gateway.ts](./lib/openai/gateway.ts)). Sobald `AI_GATEWAY_API_KEY` in `.env.local` + Vercel-Env gesetzt ist, laufen Bildgenerierung + Vision-Style-Analyse durch das Gateway. Fallback auf direkten OpenAI-Endpoint bleibt erhalten.
- **509/518 Vitest-Tests grün** (9 skipped).
- **TypeScript clean** (`npx tsc --noEmit`).

---

## Was offen bleibt (für danach)

| Punkt | Was fehlt | Wer |
|---|---|---|
| Item 6 — Variant.com-Look | Screenshots aus variant.com (SPA, nicht via curl ladbar) — Kai/Denis liefern | Kunde |
| Item 7 — A/B-Bildstil | Zwei Referenzbilder (Meta-Anzeige + Schwarz-Weiß) hochladen | Kai/Christian |
| Item 9 — 20 Ratgeber-Run | Batch-Script ausführen (~30 min), dann publizieren | Denis nach AI-Gateway-Setup |
| Pflege/Leben/Unfall echte Tarife | CSVs sind heute Templates (~225 Zeilen Beispiel-Daten) — echte Anbieter-Sätze | Christian |
| Convexa-Re-Sync-Button | Admin-UI für gescheiterte Convexa-Pushes | Folge-Sprint |

---

## Demo-Pfad für Donnerstag

1. **Login-Demo** mit Kai / Christian (Passwörter vorher per 1Password oder SMS verteilen).
2. **Erste Schritte** → Onboarding-Walkthrough live durchklicken.
3. **Produkt-Detail Sterbegeld24Plus** → CSV-Upload zeigen.
4. **Vergleichsrechner Live** auf [/](https://leadmonster-kappa.vercel.app/) → LeadForm mit neuen Feldern (Geburtsdatum, Adresse) → Submit → Convexa-Lead anzeigen.
5. **Bildstil-Panel** → Style-Reference-Upload demoen, neue Bild-Variante generieren.
6. **20 Ratgeber-Batch** (falls bis Donnerstag durch): Sitemap zeigen, ein Artikel exemplarisch.
