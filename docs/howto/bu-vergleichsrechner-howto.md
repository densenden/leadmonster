# BU-Vergleichsrechner: How-to

End-to-End-Anleitung, um den Vergleichsrechner für ein BU-Produkt produktiv zu schalten — egal ob über die Admin-UI oder per CLI. Die Schritte gelten analog auch für Pflege/Leben/Unfall.

---

## 1. Produkt anlegen (falls noch nicht vorhanden)

1. Im Admin auf [/admin/produkte](/admin/produkte) → „Neues Produkt".
2. Felder ausfüllen:
   - **Name**: z. B. „BU24Plus" (oder Markenname von Christian)
   - **Slug**: `bu` oder `berufsunfaehigkeit` (URL-freundlich, klein, deutsch)
   - **Typ**: `bu` — wählt automatisch die BU-Filter-Achsen (Berufsklasse, Monatsrente)
   - **Status**: `entwurf` zu Beginn — wird später auf `aktiv` gesetzt
3. **Convexa-Form-Token** im Reiter „Einstellungen" hinterlegen (eigener Token pro Kampagne — Christian liefert).

## 2. Tarife befüllen

Zwei Wege — UI für gelegentliche Updates, CSV für die Erst-Befüllung:

### A) CSV-Upload (empfohlen für > 10 Zeilen)

1. CSV mit folgendem Header bauen:
   ```
   anbieter_name,tarif_name,besonderheiten_json,geburtsjahr,summe_eur,beitrag_eur,einheit,berufsklasse
   ```
2. Pro Anbieter × Alter × Summe × Berufsklasse eine Zeile.
   - `summe_eur` = gewünschte Monatsrente (z. B. 1500)
   - `beitrag_eur` = monatlicher Beitrag (z. B. 391.47 — Punkt oder Komma als Dezimaltrennzeichen erlaubt)
   - `einheit` = `eur_monat` (Pflicht für BU, da Renten)
   - `berufsklasse` = `A` / `B` / `C` / `D`
   - `besonderheiten_json`: JSON-Object, BU-relevant z. B.:
     ```json
     {"prozent_bu":50,"prognose_zeitraum_monate":6,"verzicht_abstrakte_verweisung":true,"dynamik":true}
     ```
3. Im Admin [/admin/tarife/<slug>](/admin/tarife/) → unteres Panel „CSV-Bulk-Import" → Datei hochladen → „Importieren".
4. Result-Block zeigt `X eingespielt · Y übersprungen` + Liste von Zeilen-Fehlern.

Vorlage liegt im Repo unter [vergleich-tarife-seeds/bu.csv](../../vergleich-tarife-seeds/bu.csv).

### B) Einzelne Zeile via UI

1. Im Tarife-Editor `+ Neuer Tarif` klicken.
2. Felder ausfüllen (alle BU-Filter-Spalten sind sichtbar — Berufsklasse, Monatsrente, Besonderheiten).
3. „Speichern" — Upsert über UNIQUE-Constraint (produkt_id, anbieter_name, alter_von, summe, berufsklasse).

### C) CLI / Re-Seed (Entwickler-Pfad)

```bash
npx tsx scripts/seed-vergleich-tarife.ts bu
```
- Liest [vergleich-tarife-seeds/bu.csv](../../vergleich-tarife-seeds/bu.csv) und upsertet alle Zeilen für das Produkt mit Slug `bu`.

## 3. Hauptseite + Vergleichsrechner-Section generieren

Sobald ≥ 2 Anbieter-Tarife in der DB liegen, fügt der Generator automatisch eine `vergleichsrechner`-Section ein.

1. Admin: [/admin/produkte/<id>](/admin/produkte/) → „Inhalte generieren" → Generator läuft Hauptseite/FAQ/Vergleich/Tarif.
2. Status der Generierung erscheint pro Page-Type. Bei Fehler: Toast mit Code.
3. Resultierende Sections können vor Publishing per Hand editiert werden.

## 4. Live-Vorschau prüfen

- `https://<base>/<bu-slug>` → Hauptseite (Vergleichsrechner-Section eingebettet)
- `https://<base>/<bu-slug>/vergleichsrechner` → eigene VR-Route
- `https://<base>/<bu-slug>/tarife` → klassischer Tarif-Rechner (sofern aktiviert)
- Berufsklasse-Filter testen: Tabelle muss bei Wechsel zwischen A/B/C/D sortieren.

## 5. Lead-Submit testen

1. Im VR-Rechner einen Anbieter auswählen → LeadForm öffnet darunter.
2. Submit mit Test-Mail + Geburtsdatum + Adresse → 201 Response.
3. Convexa-Push sollte `Berufsklasse`, `InsuredAmount` (Monatsrente), `Birthdate`, `Street`, `Zip`, `City` enthalten.
4. Verifizieren in Convexa-Dashboard oder via Resync-Button im Admin.

## 6. Status auf `publiziert` setzen

- Im Admin Produkt-Detail → „Publizieren" je Page-Type.
- Sitemap wird automatisch via `generateStaticParams()` aktualisiert (revalidate=60).

---

## Troubleshooting

| Symptom | Ursache | Lösung |
|---|---|---|
| CSV-Import: „Pflichtfelder fehlen" | Header-Zeile falsch oder Trennzeichen nicht Komma | Header gegen Vorlage prüfen, RFC-4180 Komma-Trenner |
| Vergleichsrechner zeigt leere Tabelle | Keine Anbietertarife für gewähltes Alter / Summe / Berufsklasse | Mehr Tarif-Zeilen seedn oder Filter-Achsen-Default in [lib/tarife/produkt-config.ts](../../lib/tarife/produkt-config.ts) anpassen |
| Lead-Submit ohne Berufsklasse in Convexa | LeadForm wurde nicht über VR geöffnet (kein filterContext) | Sicherstellen, dass User über VR-CTA klickt, nicht über generisches Lead-Formular |
| Generator-Run bricht ab | ANTHROPIC_API_KEY ungültig oder Vercel-Function-Timeout | Logs prüfen, ggf. Vercel-Pro-Plan für 300s Timeout |
