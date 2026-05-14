# Neues Produkt anlegen

Eine neue Versicherungsart (z. B. Pflege, Risikoleben, Unfall) als Produkt im LeadMonster anlegen. Dauer: ca. 5 Minuten + AI-Generierung.

## 1. Produkt anlegen

1. Admin → [/admin/produkte](/admin/produkte) → „Neues Produkt".
2. Felder:
   - **Name**: Marken-Name (z. B. „PflegeSchutzPlus")
   - **Slug**: URL-freundlich, klein, deutsch (`pflegeschutz`, `risikoleben`, …)
   - **Typ**: `pflege` / `leben` / `bu` / `unfall` / `sterbegeld` — bestimmt Filter-Achsen, Default-Summen, Brand-Look
   - **Status**: `entwurf`
   - **Domain**: optional, falls eigene Domain (z. B. `pflegeschutz24.de`)
3. „Speichern".

## 2. Produkt-Config

1. Im Produkt-Detail → Tab „Konfiguration".
2. **Zielgruppe**: 1-2 Tags (z. B. `senioren_50plus`, `familien`)
3. **Fokus**: `sicherheit` / `preis` / `sofortschutz`
4. **Anbieter**: Liste der relevanten Anbieter (steuert FAQ-Inhalte)
5. **Argumente**: jsonb mit den 3-5 wichtigsten Verkaufsargumenten.

## 3. Convexa-Form-Token

Wichtig — sonst landen Leads nicht im CRM.

1. Admin → [/admin/einstellungen](/admin/einstellungen) **oder** im Produkt-Detail unter „Convexa".
2. Token aus Convexa-Backend (pro Kampagne!) eintragen.
3. Test-Lead absenden → unter [/admin/leads](/admin/leads) prüfen, ob `convexa_synced=true`.

## 4. Bildstil setzen

Siehe [bildstil-konfigurieren.md](./bildstil-konfigurieren.md). Empfohlen vor der Content-Generierung — die Hero-Bilder übernehmen sonst nur den BRAND_LOOKS-Default.

## 5. Tarife befüllen

Siehe [tarife-importieren-csv.md](./tarife-importieren-csv.md). Mindestens 2 Anbieter-Tarife sind nötig, damit der VergleichsRechner-Section greift.

## 6. Inhalte generieren

Siehe [content-generieren.md](./content-generieren.md). Generator läuft Hauptseite/FAQ/Vergleich/Tarif/3 Ratgeber (~3-5 min).

## 7. Publizieren

1. Im Produkt-Detail jede generierte Page-Section reviewen.
2. Status auf `publiziert` setzen (pro Section).
3. Hauptseite + Sitemap aktualisieren sich automatisch.

## Checkliste vor Live-Gang

- [ ] Produkt-Status auf `aktiv`
- [ ] Mindestens Hauptseite + 3 Ratgeber publiziert
- [ ] Bildstil gesetzt + Hero-Bild generiert
- [ ] Vergleichsrechner zeigt Tabelle (≥2 Anbieter)
- [ ] Test-Lead landet in Convexa
- [ ] Domain in Vercel + SSL aktiv (falls eigene Domain)
