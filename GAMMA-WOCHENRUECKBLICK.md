# LeadMonster — Sprint 13.5. → 21.5.

**Für Kundentermin Donnerstag, 21.05.2026, 11:00**

Alle 10 P0-Punkte aus der Besprechung am 13.05. sind umgesetzt.

---

## Was Christian sich gewünscht hat

> *„Keine blinden Angebote mehr."*

Lead-Formulare erfassen jetzt vollständige Kontakt- und Personendaten:

- Geburtsdatum (mit Plausibilitätsprüfung 1925–2010)
- Straße, PLZ, Ort
- Versicherungssumme (durchgereicht aus Tarif- und Vergleichsrechner)
- Wartezeit-Wunsch (durchgereicht aus VergleichsRechner)

→ Christian bekommt ab sofort qualifizierte Anfragen statt anonyme Klicks.

---

## BU-Vergleichsrechner live

- BU-Produkt steht, **225 Anbietertarife** sind importiert
- Christian/Kai können neue Tarife jetzt **direkt im Admin per CSV-Upload** einspielen — Datei wählen, Vorschau ansehen, importieren
- How-to-Anleitung liegt im Admin-Bereich
- Pflege/Leben/Unfall haben Templates (~225 Beispielzeilen) — echte Anbieterdaten kommen von Christian

---

## Bildstil unter Kontrolle

Christians Sorge: „Es sollen keine Trauerkerzen mehr rauskommen."

- Vorlage-Bild hochladen → KI analysiert Stil + übernimmt Palette/Stimmung
- **Negativ-Liste pro Produkttyp**: Sterbegeld blockt jetzt automatisch Kerzen, Lilien, Grabsteine, Urnen, Trauerkränze
- Vorlage steht jetzt **am Anfang** des Bild-Prompts (LLM gewichtet das stärker als nachgelagerte Anweisungen)
- **Heute vorzeigen:** A/B-Set für Sterbegeld24Plus — Variante A (Meta-Anzeige pinkig) vs. Variante B (Schwarz-Weiß-Trauer). **Wir brauchen die zwei Referenzbilder von Kai + Christian.**

---

## 20 neue Ratgeber-Themen für Sterbegeld

Lange-Tail- + KI-Antwort-optimierte Themen, u. a.:

- Sterbegeld bei Vorerkrankungen
- Sterbegeld für Beamte
- Wie Sterbegeld kündigen
- Sterbegeld und Suizid
- Sterbegeld bei Hartz-IV
- Sterbegeld in der Scheidung
- Bestatter-Treuhand
- … 13 weitere

**Pipeline ist gebaut**, Batch-Run dauert ~30 min und kostet ~$2,80.
Ergebnis landet als Entwurf — Christian + Kai geben grünes Licht zum Veröffentlichen.

---

## Logins + Erste Schritte

- **Eigene Login-Zugänge** für Kai (`kai.schmied@finanzteam-26.de`) und Christian (`info@christian-wimmer.eu`) — Passwörter werden separat geteilt
- Neuer Bereich **„Erste Schritte"** im Admin (Sidebar ganz oben)
- 6 Anleitungen zum Selber-Nachlesen:
  - Neues Produkt anlegen
  - Tarife per CSV importieren
  - Convexa-Token setzen
  - Content generieren
  - Bildstil konfigurieren
  - Leads bearbeiten

---

## Politur an vielen kleinen Stellen

- **Fett** und *kursiv* in Texten rendern jetzt korrekt — vorher nur Rohzeichen sichtbar
- Christians **Profilbild** zeigt das ganze Gesicht (Crop nachjustiert)
- Alle Lead-Formulare in einheitlichem Design — 48px-Inputs, klare Fokus-Markierung, rote Fehler-Hervorhebung
- **Sitemap-Audit-Tool** geschrieben — prüft jede URL auf 200/404/500
- **Autorenprofile** sind alle vollständig (kein Eintrag ohne Bild/Bio)

---

## Demo-Pfad Donnerstag

1. **Login** mit Kai bzw. Christian
2. **„Erste Schritte"** → 6-Schritt-Walkthrough live durchklicken
3. **Sterbegeld24Plus** → CSV-Upload für Tarife zeigen
4. **Hauptseite** → VergleichsRechner ausprobieren → Lead-Formular mit neuen Feldern → Absenden → Lead landet in Convexa
5. **Bildstil-Panel** → Referenzbild hochladen, neue Bildvariante generieren
6. **Wenn fertig:** Sitemap mit 20 neuen Ratgebern + ein Artikel exemplarisch

---

## Was wir vom Kunden brauchen

| Punkt | Wer |
|---|---|
| Zwei Referenzbilder für A/B-Bildstil (Meta-Anzeige + Schwarz-Weiß) | Kai + Christian |
| Screenshots von variant.com (für visuellen Look der Hauptseite) | Kai/Denis |
| Echte Anbieter-Tarife für Pflege/Leben/Unfall | Christian |
| Termin für 20-Ratgeber-Veröffentlichung nach Review | Christian + Kai |
| Datum für DNS-Cutover auf sterbegeld24plus.de | Christian |

---

## Im Hintergrund (kurz)

- Vercel-Build live, 509 von 518 Tests grün, TypeScript clean
- DB-Migrationen für neue Lead-Felder + Marken-Anzeige in Produktion
- Alte WordPress-URLs zur sicheren Weiterleitung in der DB hinterlegt — feuern automatisch beim Domain-Umzug
- Vercel AI Gateway verdrahtet (Bildgenerierung + Stil-Analyse)

---

## Was nach diesem Sprint folgt

- **Variant.com-Look** auf die Hauptseite ziehen (sobald Screenshots da sind)
- **Convexa-Re-Sync-Button** im Admin (für gescheiterte Pushes)
- **Anbieter-Detailseiten** mit Christians Praxiseinschätzung
- **Audience-Locks** finalisieren (Sterbegeld 50+ vs. Vorerkrankte, dritte Unfall-Zielgruppe)
- **DNS-Cutover** auf sterbegeld24plus.de
