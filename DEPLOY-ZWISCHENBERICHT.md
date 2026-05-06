# Deploy-Zwischenbericht — Single-Domain-Migration auf sterbegeld24plus.de

**Stand:** 2026-05-04 · **Vor Cutover** · **Empfänger:** Kundenmeeting finanzteam26

---

## TL;DR

Die Code-Arbeit für die Single-Domain-Strategie aus § 8 ist **fertig und getestet**. Die DB-Migrationen sind angewendet, der lokale Smoke-Test läuft sauber. Es fehlen nur noch die operativen Schritte (DNS, Google Search Console, optional CSV-Import alter Redirects). Wir empfehlen Cutover **nach Freigabe der Audience-Locks** (→ § 1).

---

## Was ist fertig

| Phase | Inhalt | Stand |
|---|---|---|
| **Phase 1** | Domain-Konfiguration, zentrale Schema.org/Organization (finanzteam26 GmbH & Co. KG als legalName, sterbegeld24plus.de als Brand-URL) | ✅ Code + Tests |
| **Phase 2** | `/` rendert die Sterbegeld24Plus-Hauptseite. `/sterbegeld24plus` → 301 dorthin. Heutige Produktübersicht zieht auf `/produkte` (noindex) | ✅ Code + Tests |
| **Phase 3** | Redirects-Infrastruktur: DB-Tabelle, Edge-Middleware-Hook (60 s Cache), Admin-UI mit Inline-Edit, CSV-Bulk-Import für Screaming-Frog-Exporte | ✅ Code + Migration angewendet |
| **Phase 4** | Sub-Brand pro Produkt (z. B. „BU24Plus" auf `/bu`), Title-Suffix-Strategie („Christian Wimmer Versicherungsmakler" statt Domain bei Nicht-Sterbegeld), TrustStoryLine als wiederkehrende H2 | ✅ Code + Migration angewendet |

**Test-Coverage:** 504 Tests grün · **Build:** clean · **SQL-Smoke-Test:** Idempotent verifiziert.

---

## Was passiert konkret unter sterbegeld24plus.de

```
/                                    Sterbegeld24Plus (Audience 50+, Hauptmarke)
/sofortschutz                        Sterbegeld25 (Vorerkrankte/Sofortschutz)
/bu  /pflege  /leben  /unfall-…      weitere Produkte als Subpfade
/anbieter/[slug]                     Anbieter-Detail-Seiten (Phase 6 — nächste Spec)
/wissen/[slug] · /blog/[slug]        Wissensbasis + Blog
/redaktion/christian-wimmer          Author-Profil (E-E-A-T)
/marktdaten/[thema]                  Backlink-Hub (parallel-arbeitende Initiative)
/admin/redirects                     Redirect-Pflege ohne Re-Deployment
```

`finanzteam26.de` bleibt **eigenständige Corporate-Site der GmbH** (§ 8 Variante 1) — wird im Footer von sterbegeld24plus.de als externer Link „Unternehmen" eingebunden. Kein Cross-Domain-Cannibalization.

---

## Was noch zu tun ist (operativ, vor Go-Live)

1. **DNS-Cutover bei Vercel** — `sterbegeld24plus.de` + `www.sterbegeld24plus.de` als Custom-Domain ans Project binden, www als Canonical. Aufwand: 15 Min.
2. **Initiale Redirects einspielen** — `npx tsx scripts/seed-redirects.ts` (legt `/ueber-uns/`, `/hdi/`, `/muenchener-begraebnisverein/` an). Optional Screaming-Frog-Export der bestehenden sterbegeld24plus.de-Site → CSV-Import unter `/admin/redirects`.
3. **Google Search Console** — neue Property anlegen, Sitemap (`/sitemap.xml`) einreichen, URL-Inspect auf 5–10 Top-Pfade.
4. **Monitoring 7 Tage** — GSC-Crawl-Fehler, Vercel-Analytics, **Lead-Volumen** (Convexa-Tokens unverändert, sollten gleich bleiben).

---

## Bewusst noch nicht enthalten (eigene Folge-Specs)

- **§ 1 Audience-Locks** — die strategisch wichtigste Vorbedingung: pro Brand klar disjunkte Zielgruppe + H1-Keyword-Cluster. Konkret offen:
  - Sterbegeld24Plus → 50+ ohne Gesundheitsprüfung *(klar)*
  - Sterbegeld25 → Vorerkrankte/Sofortschutz *(klar)*
  - Unfall-Brands: Paare/Familie · Reise/Auslandsschutz · **dritte Audience noch zu entscheiden** (Sport/Hobby vs. Senioren 70+ vs. Handwerker)
- **§ 3 Anbieter-Detail-Seiten** unter `/anbieter/[slug]` — 5–7 Top-Anbieter pro Produkt mit Christians Praxiseinschätzung
- **§ 4 Persona-Pillar-Pages** — pro Produkt 3 Personas (z. B. „Sterbegeld für Diabetiker")
- **§ 5 Conversion-Bausteine** — Beratungs-Termin-Tool, personalisierte Vergleichs-PDFs, WhatsApp-Beratung, Email-Sequenzen mit Christian als Absender

---

## Risiken / Aufmerksamkeit im Meeting

1. **Domain-Branding-Trade-Off:** Wer „BU für Handwerker" sucht und auf `sterbegeld24plus.de/bu` landet, könnte irritiert sein. **Mitigation ist live:** Sub-Brand-Logo (z. B. „BU24Plus") + TrustStoryLine („Christian Wimmer berät seit 20 Jahren in allen Personen-Versicherungen…") + Title-Suffix „Christian Wimmer Versicherungsmakler" statt Domain im Title-Tag.
2. **Audience-Locks (§ 1) sind formal die Vorbedingung für Live-Schaltung** — sonst kannibalisieren sich die Subpfade gegenseitig. Frage ans Meeting: Wer entscheidet die dritte Unfall-Audience? Wann?
3. **Sub-Pages bleiben erstmal unter altem Pfad** — `sterbegeld24plus.de/sterbegeld24plus/faq` (statt `/faq`). Pragmatischer Phase-2-Scope; in einer Folge-Iteration ggf. flach ziehen, falls SEO-Mehrwert konkret messbar.
4. **Parallel laufende Arbeiten** — Sterbegeld-Rechner / Produktart-Konfigurator + Marktdaten-Hub sind in der gleichen Codebase aktiv. Bisher konfliktfrei; wir haben einen Module-Split (`produkt-config.ts` vs. `produkt-config-db.ts`) eingeführt, damit Client- und Server-Code sauber getrennt bleiben.

---

## Was wir vom Meeting brauchen

- [ ] **Sign-off Audience-Locks** (Sterbegeld 50+/Sofortschutz, Unfall Paare/Reise/3.) — oder Termin, bis wann
- [ ] **Datum für Cutover** — DNS + GSC + Monitoring in einem Schwung
- [ ] **Crawl-Export** der bestehenden sterbegeld24plus.de (Screaming Frog) — CSV mit allen Altpfaden, damit nichts ins 404 läuft
- [ ] **Priorisierung Folge-Specs:** Anbieter-Detail-Seiten (§ 3) vs. Persona-Pillar-Pages (§ 4) vs. Conversion-Bausteine (§ 5) — Reihenfolge?

---

## Commit-Trail (nachvollziehbar)

```
953a8cb Polish: zusätzliche Tests für Phase-1 + Phase-4
18a5b33 Phase 4: Sub-Brand-Display + Title-Suffix + TrustStoryLine
db37f71 Phase 3: Redirects-Infrastruktur
60fbe60 Phase 2: Root-Routing — Sterbegeld24Plus rendert unter `/`
cabf12a Phase 1: Single-Domain-Migration auf sterbegeld24plus.de
```

Migrationen: `20260504000010_domain_redirects.sql` · `20260504000020_brand_display.sql`
