# Convexa-Form-Token setzen

Damit Leads nach Form-Submit automatisch im Convexa-CRM erscheinen, muss pro Produkt (oder global) ein Form-Token hinterlegt werden.

## Token-Auflösung (Priorität)

1. **Pro Produkt** — `produkte.convexa_form_token` (höchste Priorität)
2. **Global** — `einstellungen.convexa_form_token`
3. **Fallback** — `process.env.CONVEXA_FORM_TOKEN`

## Wo bekommt man den Token?

In Convexa selbst (https://app.convexa.app):
1. Login → Formulare → das relevante Formular auswählen
2. „Embed" oder „API" → der Token im Endpoint-Pfad: `POST https://api.convexa.app/submissions/{TOKEN}`

⚠️ **Pro Kampagne ein eigener Token** (Convexa-Konvention). Sterbegeld24Plus, BU, Pflege etc. brauchen je einen.

## Pro Produkt setzen (empfohlen)

1. [/admin/produkte/<id>](/admin/produkte/) öffnen.
2. Sektion „Convexa-Integration" (rechts oder im Tab „Einstellungen").
3. Token einfügen → „Speichern".

## Global setzen (Default für alle Produkte ohne eigenen Token)

1. [/admin/einstellungen](/admin/einstellungen) öffnen.
2. Sektion „Convexa".
3. Token + Base-URL eingeben → „Speichern".
4. Verschlüsselung erfolgt server-seitig (`einstellungen`-Tabelle).

## Test

1. Im Produkt-Frontend ein Test-Lead absenden (echte Email-Adresse).
2. [/admin/leads](/admin/leads) öffnen → der neue Lead muss erscheinen mit:
   - `convexa_synced=true` (grünes Häkchen)
   - `convexa_lead_id` gesetzt (synthetische ID, da Convexa keine eigene zurückgibt)
3. In Convexa selbst (https://app.convexa.app) → Leads → der Eintrag mit den richtigen Custom-Feldern (FirstName, LastName, Email, Birthdate, Street, …).

## Häufige Probleme

| Symptom | Ursache | Lösung |
|---|---|---|
| `convexa_synced=false` + `convexa_error="CONVEXA_NOT_CONFIGURED"` | Kein Token gefunden | Token pro Produkt oder global hinterlegen |
| `CONVEXA_INVALID_TOKEN` | Token falsch / abgelaufen / deaktiviert | In Convexa neuen Token anfordern |
| `CONVEXA_BAD_REQUEST` | Payload-Schema nicht akzeptiert | Body-Log in `convexa_error` prüfen; Email-Format häufig die Ursache |
| Lead nicht in Convexa, aber in Supabase | Re-Sync nötig | Admin → „Re-Sync pending leads" Button (Folge-Iteration) |
