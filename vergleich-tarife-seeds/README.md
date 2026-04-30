# vergleich-tarife-seeds

CSV-Vorlagen für den **VergleichsRechner** — pro Produkt eine Datei mit
Anbietertarifen (Allianz, AXA, DELA, …). Die Werte sind **realistische
Markt-Schätzungen als Vorlage** und sollten vor dem Live-Gehen mit echten
Broker-Daten überschrieben werden.

## Dateinamen

Der Dateiname entspricht dem Produkttyp, **nicht** dem Slug. Das Seed-All-Script
macht den Mapping zur tatsächlichen Slug-Variante:

| Datei | Erwartete Slug-Kandidaten (DB) |
|---|---|
| `sterbegeld.csv` | `sterbegeld24plus`, `sterbegeld` |
| `pflege.csv` | `pflegezusatz`, `pflege` |
| `leben.csv` | `risikoleben`, `leben` |
| `bu.csv` | `berufsunfaehigkeit`, `bu` |
| `unfall.csv` | `unfall` |

## Spalten

```
anbieter_name,tarif_name,besonderheiten_json,geburtsjahr,summe_eur,beitrag_eur,einheit
```

| Spalte | Pflicht | Beschreibung |
|---|---|---|
| `anbieter_name` | ✓ | Marke (z. B. `Allianz`, `DELA`, `Alte Leipziger`) |
| `tarif_name` | – | Tarifname (z. B. `Bestattungsschutzbrief`). Leer = `null`. |
| `besonderheiten_json` | – | JSON-String mit Tarif-Eigenschaften — wird im VergleichsRechner für Badge-Vergabe genutzt (`schnellster_schutz` aus `wartezeit_monate`, `bester_schutz` aus `rueckholung`+`doppelte_unfall`+`lebenslang`). Schema je Produkttyp unterscheidlich (siehe unten). |
| `geburtsjahr` | ✓ | 4-stellige Jahreszahl. Wird im Seed-Script in `alter_von = alter_bis = currentYear - geburtsjahr` umgewandelt (1-Jahres-Bracket). |
| `summe_eur` | ✓ | Versicherungssumme in EUR (sterbegeld/leben/unfall) **oder** Monatsrente (pflege/bu). |
| `beitrag_eur` | ✓ | Monatlicher Beitrag in EUR. `beitrag_low = beitrag_high = beitrag_eur` (exakter Wert, keine Spanne). |
| `einheit` | – | `eur_summe` (Default) oder `eur_monat`. Pflege/BU brauchen `eur_monat`. |

## `besonderheiten_json` pro Produkttyp

### Sterbegeld
```json
{
  "lebenslang": true,
  "gp": false,
  "wartezeit_monate": 12,
  "doppelte_unfall": true,
  "rueckholung": true,
  "kindermitvers": false
}
```

### Pflegezusatz
```json
{
  "pflegegrad_ab": 2,
  "einmalzahlung": true,
  "beitragsbefreiung_pflegefall": true,
  "weltweite_leistung": true,
  "foerderung_staatlich": false
}
```

### Risikoleben
```json
{
  "laufzeit_jahre": 25,
  "gesundheitspruefung": true,
  "raucher_unterschied": true,
  "nachversicherung": true
}
```

### BU
```json
{
  "prozent_bu": 50,
  "prognose_zeitraum_monate": 6,
  "verzicht_abstrakte_verweisung": true,
  "dynamik": true
}
```

### Unfall
```json
{
  "progression": 350,
  "mitwirkung_krankheit": false,
  "todesfall_summe": true,
  "gliedertaxe": "verbessert"
}
```

## Wide- → Long-Konvertierung

Wenn der Versicherer-Vertrieb seine Daten in Wide-Format liefert (Spalten:
Anbieter₁/5k, Anbieter₁/10k, Anbieter₂/5k, …), muss vorab konvertiert werden.
Beispiel: Sterbegeld-CSV wurde aus einer 5-Anbieter-Excel-Tabelle generiert
(siehe Generator in der Git-History).

## Seed-Aufrufe

Einzelnes Produkt:
```bash
npx tsx scripts/seed-vergleich-tarife.ts sterbegeld24plus
# oder mit explizitem CSV-Pfad:
npx tsx scripts/seed-vergleich-tarife.ts sterbegeld24plus vergleich-tarife-seeds/sterbegeld.csv
```

Alle Produkte auf einmal:
```bash
npx tsx scripts/seed-all-vergleich-tarife.ts
```

Idempotent: Mehrfach-Aufrufe schreiben dieselben Rows (UNIQUE auf
`produkt_id, anbieter_name, alter_von, summe`).

## Lücken handhaben

Wenn ein Anbieter bestimmte Geburtsjahre nicht versichert (z. B. DELA <50):
einfach die entsprechenden Zeilen weglassen. Der VergleichsRechner blendet
fehlende Anbieter pro Auswahl-Kombination automatisch aus.
