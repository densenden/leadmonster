# E-Mail-Vorlage: API-Anfrage an Convexa

**Empfänger (vermutlich):** support@convexa.app · info@convexa.app · kontakt@convexa.app
**Falls bekannt:** persönlicher Account-Manager des Convexa-Vertriebs

---

## Betreff
API-Zugang / Lead-Webhook für unseren Convexa-Account – LeadMonster Integration

## Inhalt

Sehr geehrtes Convexa-Team,

ich nutze Convexa als Vertriebs- und Prozessmanagement-Lösung in meinem Versicherungsmaklerbüro (finanzteam26 / Account: masterstudiosen@gmail.com).

Wir entwickeln aktuell ein eigenes SEO-/AEO-Lead-Generierungssystem („LeadMonster") auf Basis von Next.js + Supabase, das automatisiert Versicherungs-Landingpages für Sterbegeld, Pflegezusatz, Risikoleben, Berufsunfähigkeit und Unfallversicherung erzeugt. Über die Lead-Formulare auf diesen Seiten möchten wir Leads **automatisch in unseren Convexa-Account einspielen** – idealerweise direkt im Moment der Formular-Submission.

Dafür benötige ich folgende Informationen / Zugänge:

1. **REST-API-Endpoint** zum Anlegen eines neuen Leads/Kontakts
   – Basis-URL (z. B. `https://app.convexa.app/api/v1/...`)
   – Authentifizierung: Bearer-Token / OAuth / API-Key?
   – JSON-Schema: welche Pflicht-/Optional-Felder erwartet ihr (Vorname, Nachname, E-Mail, Telefon, Produkt-Tag, Kampagnen-ID, Notizen)?

2. **Webhook (alternativ oder ergänzend)**: Falls ihr keinen offenen REST-Push anbietet, akzeptiert ihr eingehende Webhooks an einer Convexa-Inbound-URL? Dann brauche ich die URL plus Signatur-/Auth-Verfahren.

3. **Tagging/Kategorisierung**: Können wir pro Lead ein Produkt-Tag (z. B. „Sterbegeld24Plus") und einen Intent-Tag („sicherheit", „preis", „sofortschutz") mitsenden, damit eure Workflow-Engine den Lead in die richtige Bearbeitungskette routen kann?

4. **Sandbox/Testumgebung**: Habt ihr einen Test-Mandanten oder lassen wir Tests gegen den Live-Account mit Marker-Leads laufen?

5. **Rate Limits + DSGVO-Hinweise**: Welche Limits muss ich pro Stunde/Tag einhalten? Gibt es einen Auftragsverarbeitungsvertrag (AVV) speziell für die API-Nutzung?

Falls noch keine öffentliche API existiert, freue ich mich über die Information, ob das auf eurer Roadmap steht und welche Workarounds aktuell empfohlen sind (z. B. CSV-Import, Zapier, n8n, oder ein generischer Webhook-Eingang).

Vielen Dank vorab – wir würden gerne zeitnah mit der Integration starten und sind bereit, sofort technische Details zu klären.

Beste Grüße
Denis Sen
masterstudiosen@gmail.com

---

## Falls keine Antwort innerhalb 5 Werktagen
- Nachhaken per LinkedIn beim Convexa-Founder
- Account-Login öffnen → Suche nach „Integrationen", „Zapier", „API", „Webhook", „Entwickler" in den Einstellungen
- Browser-DevTools → Network-Tab beobachten, welche internen API-Calls die Convexa-Web-App selbst gegen `app.convexa.app/api/...` macht (das sind oft die gleichen Endpoints, nur ohne öffentliche Doku)
- Plan B: Lead-CSV-Export aus Supabase (täglich) + manueller Import bis API steht
