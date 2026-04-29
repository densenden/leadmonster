# Wissensfundus-Seeds

Editierbare Markdown-Dateien, die per `npm run seed:wissensfundus` (Skript: `scripts/seed-wissensfundus.ts`) in die DB-Tabelle `wissensfundus` gespiegelt werden.

## Konvention

Jede Datei = ein Wissensfundus-Eintrag. Frontmatter steuert Metadaten:

```md
---
slug: was-ist-sterbegeld
kategorie: sterbegeld           # 'allgemein' | 'sterbegeld' | 'pflege' | 'leben' | 'bu' | 'unfall'
thema: Was ist Sterbegeld?
tags: ['definition', 'senioren']
link_phrases: ['Sterbegeld', 'Sterbegeldversicherung']  # Trigger für Auto-Cross-Linking
published: true
---

# Was ist Sterbegeld?

Sterbegeld bezeichnet eine zweckgebundene...
```

## Re-Import alter finanzteam26-Beiträge

Sobald die Egress-Whitelist `finanzteam26.de` zulässt, importiert
`scripts/import-finanzteam26-blog.ts` die Original-HTML-Seiten in `blog_posts`
(nicht in den Wissensfundus). Es werden HTML-Tags zu Markdown konvertiert,
Quelle (`source_url`, `source_origin = 'finanzteam26'`) gesetzt, und der
Admin kann sie anschließend im Editor anpassen.

## Bedienung

```bash
npm run seed:wissensfundus       # idempotent — überschreibt nach slug
npm run seed:wissensfundus -- --kategorie=pflege   # nur eine Kategorie
```
