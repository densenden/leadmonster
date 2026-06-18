# Bildstil pro Produkt konfigurieren

Jedes Produkt hat einen eigenen visuellen Look — über ein hochgeladenes Referenzbild + automatisch extrahierte Stil-Direktive. Sterbegeld24Plus z. B. soll andere Bilder bekommen als BU24Plus. So funktioniert's:

## Voraussetzungen

- Produkt existiert in [/admin/produkte](/admin/produkte)
- `OPENAI_API_KEY` in `.env.local` (direkter OpenAI-Zugang) **oder** optional `AI_GATEWAY_API_KEY` (Vercel AI Gateway)
- Ein Referenzbild im Stil, den alle Bilder dieses Produkts haben sollen (z. B. ein Mood-Board-Bild, eine bestlaufende Anzeige, ein Filmstill)

## Stil setzen

1. [/admin/produkte/<id>](/admin/produkte/) → Sektion „Bildstil-Referenz" (StyleReferencePanel).
2. Bild hochladen (JPG/PNG, max 10 MB).
3. Backend lädt das Bild nach Supabase Storage (Bucket `produkt-style-references`) **und** ruft Vision-Analyse via GPT-4o-mini:
   - Output: kurze englische Stil-Direktive (Farb-Palette + Lichtstimmung + Rendering-Technik)
   - landet in `produkte.style_description`
4. Nach Upload erscheint Vorschau + die englische Direktive.

## Prüfen, ob die Stilreferenz wirklich greift

Nach dem Upload solltest du an **drei Stellen** sehen, dass der Stil aktiv ist:

1. **Produkt bearbeiten** (`/admin/produkte/<id>`) — unter „Hero-Bild“ und in der blauen Box **„Stilreferenz aktiv — wird in den Bild-Prompt eingebaut“** (Thumbnail + Direktive).
2. **Content bearbeiten** (`/admin/produkte/<id>/content`) — gleiche Box oben im Editor; beim **„Bild generieren“** pro Section ebenfalls in der geöffneten Panel-Leiste.
3. **Nach der Generierung** — grüner Hinweis „Letzte Generierung: Stilreferenz war im API-Prompt aktiv“; in der DB-Tabelle `bilder` steht in `prompt_used` entweder `VISUAL STYLE …` (Auto-Prompt) oder `Visual style direction: …` (nachgereiht).

Der **Auto-Prompt** im Textfeld beginnt mit `VISUAL STYLE (primary direction …)` — das ist der sichtbare Beweis, dass `style_description` eingebaut wurde. OpenAI `gpt-image-1` bekommt **Text-Prompts** (kein Bild-Input); die Stilreferenz wirkt über die Vision-extrahierte englische Direktive, nicht als Pixel-Upload an die Image-API.

## Bilder mit dem Stil generieren

Sobald `style_description` gesetzt ist, übernehmen **alle neuen Hero- und Section-Bilder** automatisch den Stil — ohne Code-Eingriff.

Prompt-Strategie ([lib/openai/hero-prompt.ts](../../lib/openai/hero-prompt.ts)):
- **VISUAL STYLE** wird an den Prompt-Anfang gesetzt (LLMs gewichten den Anfang stärker)
- **SUBJECT** (= Szene) folgt darunter
- Default-Motive aus BRAND_LOOKS (z. B. „Trauerkerze" für Sterbegeld) werden **explizit ausgeschlossen**, wenn eine Style-Reference greift — das verhindert, dass selbst bei „Garten-Vorlage" wieder Kerzen rauskommen

## Re-Generation

Pro Bild-Slot (Hero, Section-Inline, OG) gibt es einen „Neu erzeugen"-Button. Das alte Bild wird in `bilder` überschrieben.

## A/B-Test (Empfehlung für Sterbegeld)

1. **Variante A** — Stil der best-performenden Meta-Anzeige (z. B. pinkig + Rosenblätter): Bild aus Ads hochladen → Stil-Direktive übernehmen.
2. **Variante B** — Würdevoll Schwarz-Weiß-Stil: zweites Referenzbild → zweites Produkt-Set generieren.
3. Beide live testen (Lead-Conversion vergleichen).

## Stil entfernen

Im StyleReferencePanel auf „Entfernen" klicken. Danach greift wieder der Default-BRAND_LOOK aus [lib/openai/hero-prompt.ts](../../lib/openai/hero-prompt.ts) (Sterbegeld = Sage Green/Cream, BU = Industrial Blue-Grey, etc.).

## Troubleshooting

| Symptom | Lösung |
|---|---|
| Vision-Analyse läuft nicht | API-Key prüfen (`OPENAI_API_KEY` oder `AI_GATEWAY_API_KEY`); Modell `gpt-4o-mini` muss erreichbar sein |
| Generierte Bilder ignorieren den Stil | `style_description` zu generisch — Referenzbild mit klarerem visuellem Charakter wählen; Hero-Prompt loggt den finalen Prompt-String, manuell prüfen |
| Wieder Trauerkerze trotz Garten-Stil | Negativ-Prompt sollte greifen — falls nicht, in [hero-prompt.ts](../../lib/openai/hero-prompt.ts) → `TYP_NEGATIVE_MOTIFS` schärfer formulieren |
| OpenAI 401 / Quota | `OPENAI_API_KEY` abgelaufen oder fehlt in Vercel — Key erneuern und in `.env.local` + Vercel-Env setzen |
