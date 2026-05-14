# Leads bearbeiten

Leads aus Form-Submits (Sterbegeld24Plus, BU, …) landen in der `leads`-Tabelle und werden automatisch nach Convexa gepusht. Diese Anleitung erklärt, wie Christian (Vertrieb) die Übersicht behält und welche Felder bei „blinder Angebotsversendung" entscheidend sind.

## Lead-Übersicht im Admin

1. [/admin/leads](/admin/leads) öffnen.
2. Tabelle zeigt: Datum · Produkt · Name · Email · Status (Convexa-Sync) · Quick-Actions.
3. Filter nach Produkt, Datum, Status (synced / pending / failed).

## Welche Felder enthält ein Lead?

Seit Migration `20260514000000_lead_kontakt_felder.sql`:

**Standard**:
- Email, Vorname, Nachname, Telefon
- Interesse (Freitext)
- Geburtsdatum, Strasse, PLZ, Ort

**Kontext (aus Rechner-Prefill)**:
- gewuenschter_anbieter (aus VergleichsRechner-Auswahl)
- akzeptierte_wartezeit_monate (aus Wartezeit-Filter)
- berufsklasse (BU)
- sterbegeld_summe (gewünschte Versicherungssumme)
- filter_kontext (jsonb mit weiteren Filtern)

**Tracking**:
- source_url, utm_source/medium/campaign
- convexa_synced, convexa_lead_id, convexa_error

## Christian-Workflow: blindes Angebot

Voraussetzung: alle 6 Felder aus dem O-Ton sind im Lead vorhanden — Geburtsdatum + Adresse + Sterbegeldsumme + Wartezeit + Produkt + Anbieter-Wunsch.

1. Email kommt rein (Resend-Notification an `SALES_NOTIFICATION_EMAIL`).
2. Christian klickt den Link → Admin-Lead-Detail-View.
3. Felder-Check:
   - **Geburtsdatum** → exakter Tarif berechenbar (statt nur Geburtsjahr)
   - **Adresse** → Anbieter-Verfügbarkeit + Postversand
   - **Sterbegeld-Summe** → bereits gewählte Versicherungssumme
   - **Wartezeit** → akzeptierte Wartezeit (in Monaten)
   - **Anbieter-Wunsch** → wenn aus VR, direkter Tarif-Vorschlag
4. Bei vollständigen Daten → Angebot per Mail (PDF) verschicken, **ohne Rückruf**.
5. Wenn Daten fehlen → Telefon-Rückruf (Telefon-Feld nutzen).

## Status-Spalten

| Status | Bedeutung | Aktion |
|---|---|---|
| `convexa_synced=true` | Lead ist in Convexa | Nichts — Convexa übernimmt CRM |
| `convexa_synced=false`, `convexa_error="CONVEXA_INVALID_TOKEN"` | Token-Konfig falsch | Siehe [convexa-token-setzen.md](./convexa-token-setzen.md) |
| `convexa_synced=false`, `convexa_error="CONVEXA_NETWORK_ERROR"` | Convexa-Service-Hick | Re-Sync nach 5 Min versuchen |
| `convexa_synced=false`, ohne Error | Sync noch nicht gelaufen | Re-Sync (Folge-Iteration: Admin-Button) |

## Lead exportieren

1. CSV-Download-Button in der Lead-Übersicht (Folge-Iteration).
2. Heute: SQL-Query `SELECT * FROM leads WHERE produkt_id = ... ORDER BY created_at DESC` via Supabase Studio.

## Datenschutz / Löschen

- Leads enthalten personenbezogene Daten.
- Löschung nur über Admin-Lead-Detail → „Löschen" (Soft-Delete, Folge-Iteration: Hard-Delete + Audit-Log).
- Convexa-Lead bleibt in Convexa — dort ggf. zusätzlich löschen lassen.
