# Content generieren

Hauptseite, FAQ, Vergleich, Tarif-Page und Ratgeber-Artikel werden für ein Produkt automatisch via Claude (Anthropic API) erzeugt. Voraussetzung: Produkt + Config + (idealerweise) Wissensfundus + Tarife bereits angelegt.

## Voraussetzungen

- Produkt mit Slug, Typ, Name in [/admin/produkte](/admin/produkte) angelegt
- `produkt_config` ausgefüllt (Zielgruppe, Fokus, Anbieter, Argumente)
- Wissensfundus-Einträge für den Produkttyp existieren (verbessert Output deutlich)
- Mindestens 2 Anbieter-Tarife in DB (sonst kein VergleichsRechner-Section)
- Environment: `ANTHROPIC_API_KEY` in `.env.local` (default text provider); for OpenAI text provider also set `OPENAI_API_KEY` (or optional `AI_GATEWAY_API_KEY` for images/vision only)

## Volle Generierung (alle Page-Types)

1. [/admin/produkte/<id>](/admin/produkte/) → „Inhalte generieren" (oder einzelner Page-Type-Button).
2. Generator durchläuft sequentiell: hauptseite → faq → vergleich → tarif → 3 Default-Ratgeber.
3. Pro Page-Type erscheint Status-Toast: `success` mit Row-ID oder `failed` mit Fehler-Code.
4. Default-Status der Drafts ist `entwurf`.

⚠️ Laufzeit: 3-5 min für volle Generierung (Vercel-Pro 300s Timeout). Bei Hindernissen einzelne Page-Types nachgenerieren.

## Einzelne Ratgeber-Themen generieren

Generator akzeptiert einen `topic`-Parameter. Per UI:
1. Im Produkt-Detail → „Ratgeber" → „Neuer Ratgeber" → Slug + Thema eingeben.
2. Generator erzeugt **nur** diesen Artikel.

## Batch-Generierung (z. B. 20 Ratgeber für Sterbegeld)

```bash
# Voraussetzung: Dev-Server läuft oder Vercel-Preview ist deployed
npx tsx scripts/generate-sterbegeld-ratgeber-batch.ts --base=https://<preview>.vercel.app
```

- Liest [scripts/sterbegeld-ratgeber-themen.ts](../../scripts/sterbegeld-ratgeber-themen.ts) und ruft pro Topic
  die `/api/admin/internal/generate-batch`-Route auf.
- INTERNAL_SECRET-protected (Header `X-Internal-Secret`).
- Idempotent über Slug-UNIQUE in `generierter_content`.

## Review + Publishing

1. [/admin/produkte/<id>](/admin/produkte/) → Liste der generierten Inhalte mit Status.
2. „Bearbeiten" öffnet den Markdown-Editor pro Section (FAQ, Body, Steps, …).
3. „Auf publiziert setzen" → Hauptseite / Ratgeber wird unter `/<slug>/...` ausgeliefert (ISR revalidate=60).

## Generator-Optionen

- **AI-Provider** in [/admin/einstellungen](/admin/einstellungen) konfigurierbar: Anthropic (Default) oder OpenAI.
- **Image-Pipeline**: läuft optional pro Hero-/Inline-Section. Steuerung in [bildstil-konfigurieren.md](./bildstil-konfigurieren.md).
- **Auto-Cross-Linking**: Wissensfundus-Phrases werden automatisch durch interne Links ersetzt (siehe `lib/linker/auto-link.ts`).

## Fehlerbilder

| Fehler | Wahrscheinliche Ursache |
|---|---|
| `ANTHROPIC_API_KEY missing` | Env nicht gesetzt |
| `Validation failed` | Generator-Output nicht JSON-Schema-konform (sehr selten — Retry triggert automatisch bis 3x) |
| Vercel-Timeout | Single-Run zu lang — pro Page-Type generieren statt alles auf einmal |
| Ratgeber ohne Cover-Bild | Image-Pipeline-Konfiguration prüfen (Bildstil), oder Cover manuell setzen |
