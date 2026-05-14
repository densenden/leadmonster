# Tarife per CSV importieren

Anbietertarife für den VergleichsRechner via CSV-Bulk-Import oder CLI-Seed in die `tarife`-Tabelle.

## CSV-Format

Header-Zeile (Spalten-Reihenfolge beliebig — Header-Namen sind das Mapping):

```
anbieter_name,tarif_name,besonderheiten_json,geburtsjahr,summe_eur,beitrag_eur,einheit[,berufsklasse]
```

| Spalte | Pflicht? | Beschreibung |
|---|---|---|
| `anbieter_name` | Ja | z. B. „Allianz", „DELA", „LV1871" |
| `tarif_name` | Empfohlen | Tarif-Bezeichnung des Anbieters |
| `besonderheiten_json` | Empfohlen | JSON-Object, siehe unten |
| `geburtsjahr` | Ja | Vier-stellig (1955, 1962, …) — wird zu `alter_von = alter_bis` umgerechnet |
| `summe_eur` | Ja | Versicherungssumme (Sterbegeld/Leben) oder Monatsrente (BU/Pflege) |
| `beitrag_eur` | Ja | Monatsbeitrag in EUR (Komma oder Punkt als Dezimaltrennzeichen) |
| `einheit` | Empfohlen | `eur_summe` (Default) oder `eur_monat` (BU/Pflege) |
| `berufsklasse` | Nur BU | A / B / C / D |

### besonderheiten_json pro Produkttyp

**Sterbegeld**:
```json
{"wartezeit_monate":36,"gp":false,"doppelte_unfall":true,"rueckholung":true,"lebenslang":true}
```

**Pflege**:
```json
{"pflegegrad_ab":2,"einmalzahlung":true,"beitragsbefreiung_pflegefall":true,"weltweite_leistung":true}
```

**BU**:
```json
{"prozent_bu":50,"prognose_zeitraum_monate":6,"verzicht_abstrakte_verweisung":true,"dynamik":true}
```

**Leben**:
```json
{"laufzeit_jahre":25,"gesundheitspruefung":true,"raucher_unterschied":true,"nachversicherung":true}
```

**Unfall**:
```json
{"progression":350,"mitwirkung_krankheit":false,"todesfall_summe":true,"gliedertaxe":"verbessert"}
```

## Variante A — Admin-UI

1. [/admin/tarife/<slug>](/admin/tarife/) öffnen.
2. Unteres Panel „CSV-Bulk-Import" aufklappen.
3. CSV-Datei wählen → „Importieren".
4. Result: `X eingespielt · Y übersprungen` + Liste etwaiger Zeilen-Fehler.

## Variante B — CLI

```bash
# Vorlage editieren oder erweitern:
vergleich-tarife-seeds/<typ>.csv

# Einzelnes Produkt:
npx tsx scripts/seed-vergleich-tarife.ts <slug>

# Alle Produkte einer Iteration:
npx tsx scripts/seed-all-vergleich-tarife.ts
```

## Idempotenz

UNIQUE-Constraint `(produkt_id, anbieter_name, alter_von, summe, berufsklasse)` — Re-Imports überschreiben bestehende Zeilen, fügen neue ein.

## Häufige Fehler

| Fehler | Ursache | Lösung |
|---|---|---|
| `besonderheiten_json ist kein valides JSON` | Doppelte Quotes innen-außen vertauscht | RFC-4180: JSON-Quotes mit `""` escapen oder Spalte in `"…"` einklammern |
| `Ungültiges geburtsjahr` | Format-Anomalie (Punkt, Leerzeichen) | Pure 4-stellige Ganzzahl |
| `Ungültiger beitrag_eur` | Komma & Punkt gemischt | Eines durchgehend verwenden |
| Pflichtfelder fehlen | Spalte heißt anders im Header | Header gegen Vorlage prüfen — exakt gleiche Namen |
