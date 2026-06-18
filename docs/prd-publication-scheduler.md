# PRD: Publication Scheduler („Redaktionsplan")

> **Stand: 2026-05-01**
> **Status:** Draft, implementierungsreif
> **Pilot-Pipeline:** Sterbegeld24Plus
> **Bezug:** [seo-aeo-strategie.md](./seo-aeo-strategie.md), [content-strategie-nischen-anbieter.md](./content-strategie-nischen-anbieter.md), [redaktion-trust-spec.md](./redaktion-trust-spec.md)

---

## 1. Problem-Kontext

LeadMonster generiert mit Claude und gpt-image-1 deutlich schneller publikationsfähigen Content als der Markt vertragen kann. Drei sich verstärkende Probleme entstehen ohne gesteuerte Veröffentlichung:

**Erstens, das aktuelle Commodity-Content-Signal von Google.** Site-Level-Quality-Bewertung deindexiert Domains, die zu viel undifferenzierten Content auf einmal veröffentlichen. Wer 10 Seiten pro Tag publiziert, signalisiert maschinellen Output und kassiert die Quittung wochenspäter als kompletten Index-Drop, nicht als gradueller Ranking-Verlust.

**Zweitens, Crawling-Budget und natürliches Site-Tempo.** Eine Domain mit 30 indexierten Seiten, die plötzlich auf 200 wächst, signalisiert Google entweder „Site-Update zum Hosting-Migration" oder „Massengeneration". Letzteres ist gefährlich. Eine konstante Veröffentlichungs-Frequenz von 2-4 Seiten pro Tag wirkt natürlich wie eine engagierte Redaktion.

**Drittens, Reviewer-Kapazität.** Das menschliche Review durch Christian ist der Engpass des ganzen Systems. Wenn 50 generierte Artikel gleichzeitig in `status='review'` stehen, ist das unbearbeitbar — ein Scheduler entlastet, indem er Review-Termine in den Kalender legt und nicht alles als „immer offen" auftaucht.

Lösung: Ein **Redaktionsplan**, der `status='review'`-Inhalte automatisch oder manuell auf zukünftige Veröffentlichungs-Tage verteilt, einen Kalender als zentrale UI zur Verfügung stellt, und einen Cron-Job, der pünktlich umschaltet auf `status='publiziert'`. Sterbegeld24Plus ist die Pilot-Pipeline — alle bestehenden Sterbegeld-Inhalte (Hauptseite, Ratgeber, Anbieter-Seiten, Wissensfundus-Re-Import) durchlaufen erstmalig den Scheduler.

---

## 2. Ziele und Nicht-Ziele

**Ziele:**
- Gleichmäßige Verteilung von Veröffentlichungen über Zeit (Default 2-4 Inhalte pro Werktag, konfigurierbar pro Produkt).
- Visueller Kalender (Tag/Woche/Monat) mit Drag-Drop für manuelle Korrekturen.
- Automatische Verteilung („Auto-Schedule") eines Inhalts-Pools auf freie Slots unter Regeln (Rate-Limit, Mix der Page-Types, keine Cluster).
- Pünktliche Status-Transition `scheduled → publiziert` per Cron, idempotent.
- Audit-Trail (wer hat wann was eingeplant, manuell vs. automatisch).
- Conflict-Warnings (zu viele gleichartige Inhalte am selben Tag, Reviewer-Überlast, Feiertage).
- Pilot vollständig auf Sterbegeld24Plus, danach generisch auf alle Produkte ausrollbar.

**Nicht-Ziele (für diese Iteration):**
- Social-Media-Cross-Posting (Twitter/LinkedIn-Auto-Share) — separate spätere Iteration.
- E-Mail-Newsletter-Versand-Steuerung — bleibt in `email_sequenzen`.
- A/B-Test-Scheduling für Title-Tags — separates Feature.
- Multi-Author-Workflow mit Approval-Chain — vorerst nur Christian als Reviewer.

---

## 3. User Stories

**US-1 — Auto-Verteilung einer Content-Welle**
> Als Vertriebsmitglied will ich nach einem Generator-Lauf 25 neue Sterbegeld-Ratgeber per Knopfdruck so auf die nächsten 4-6 Wochen verteilen, dass sie mit gleichmäßiger Frequenz und passendem Themen-Mix erscheinen, damit die Site natürlich wächst und kein Commodity-Cluster entsteht.

**US-2 — Manuelles Re-Scheduling per Drag-Drop**
> Als Christian will ich im Kalender einen für Donnerstag eingeplanten Beitrag auf den darauffolgenden Montag verschieben können, weil ich Donnerstag im Urlaub bin und vorher nicht reviewen kann.

**US-3 — Pool-Übersicht**
> Als Admin will ich auf einen Blick sehen, wieviele `review`-Inhalte noch unscheduled sind und wie lange der aktuelle Veröffentlichungs-Vorrat reicht, damit ich rechtzeitig nachgenerieren lasse.

**US-4 — Konflikt-Warnung**
> Als Reviewer will ich gewarnt werden, wenn an einem Tag drei generische Sterbegeld-Pillar-Inhalte gleichzeitig publiziert würden — der Scheduler soll Alternative-Slots vorschlagen.

**US-5 — Frische-Re-Review als geplanter Inhalt**
> Als System will ich Inhalte, deren `next_review_at` in der Vergangenheit liegt, automatisch in den Kalender legen — nicht als Veröffentlichung, sondern als Review-Termin.

**US-6 — Blackout-Tage**
> Als Vertrieb will ich Wochenenden und Feiertage als Default-Blackout-Tage konfigurieren können, damit Veröffentlichungen werktags landen.

---

## 4. Funktionale Anforderungen

### 4.1 Status-Erweiterung

Bisheriges Status-Enum in `generierter_content`, `blog_posts`, `wissensfundus`: `entwurf | review | publiziert` (Wissensfundus nutzt bisher nur `published boolean`).

Neue Statuswerte:
- `scheduled` — Cron wird zur `scheduled_at`-Zeit auf `publiziert` umschalten.
- `review` bleibt — Pool, aus dem der Auto-Scheduler zieht.
- `entwurf` bleibt — noch nicht freigegeben, taucht im Scheduler nicht auf.

Wissensfundus bekommt zusätzlich `status text DEFAULT 'publiziert' CHECK (status IN ('entwurf','review','scheduled','publiziert'))` als Migration, behält aber `published` als generierten Compatibility-View.

### 4.2 DB-Felder pro Content-Tabelle

```sql
ALTER TABLE <table>
  ADD COLUMN scheduled_at    timestamptz,
  ADD COLUMN scheduled_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN auto_scheduled  boolean NOT NULL DEFAULT false,
  ADD COLUMN scheduling_lock boolean NOT NULL DEFAULT false;  -- manuell gesetzt → Auto-Scheduler darf nicht überschreiben
```

Plus partieller Index pro Tabelle:
```sql
CREATE INDEX idx_<table>_scheduler
  ON <table>(scheduled_at)
  WHERE status = 'scheduled';
```

### 4.3 Tabelle `scheduling_config`

```sql
CREATE TABLE scheduling_config (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id               uuid REFERENCES produkte(id) ON DELETE CASCADE,
  -- NULL = globaler Default; sonst Override pro Produkt
  max_pro_tag              integer NOT NULL DEFAULT 3,
  min_spacing_minuten      integer NOT NULL DEFAULT 180,    -- Mindestabstand zwischen 2 Publikationen
  blackout_wochentage      integer[] NOT NULL DEFAULT '{0,6}',  -- 0=So, 6=Sa
  blackout_daten           date[] NOT NULL DEFAULT '{}',    -- Feiertage, Urlaubstage
  publikations_zeitfenster int4range NOT NULL DEFAULT '[8,18)',  -- nur zwischen 08:00 und 18:00
  mix_regel                jsonb NOT NULL DEFAULT '{"max_pro_page_type_pro_tag":2}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
```

### 4.4 Auto-Distribution-Algorithmus

Eingabe: ein Set von Content-Items (gemischte Tabellen via UNION-Query, alle `status='review'` + `scheduling_lock=false`), Zeitraum (Start- und End-Datum).

Ausgabe: pro Item ein `scheduled_at`-Timestamp.

Algorithmus (deterministisch, idempotent):

1. **Verfügbare Slots berechnen** für den Zeitraum unter Berücksichtigung von `blackout_wochentage`, `blackout_daten`, `publikations_zeitfenster`. Slot-Dichte = `max_pro_tag` Slots verteilt im Zeitfenster mit `min_spacing_minuten` Mindestabstand.
2. **Pool ranken** nach: (a) Page-Type-Priorität — Pillar/Anbieter-Seiten zuerst, generische Ratgeber zuletzt; (b) bei Tie nach `created_at` aufsteigend (älteste Drafts zuerst).
3. **Mix-Constraint anwenden**: pro Tag nicht mehr als `mix_regel.max_pro_page_type_pro_tag` Items desselben `page_type`, nicht mehr als 1 Anbieter-Seite pro Tag, nicht 2 zur selben Persona pro Woche.
4. **Greedy zuweisen**: jedes Item bekommt den frühesten Slot, der die Constraints einhält. Wenn kein passender Slot gefunden wird, Item bleibt unscheduled und wird im UI als Konflikt markiert.
5. **Schreiben**: `scheduled_at` und `auto_scheduled=true` setzen, Status auf `scheduled`. Transaktional.

Pflicht-Idempotenz: Re-Run des Auto-Schedulers über denselben Pool darf bestehende manuelle Pläne nicht überschreiben (`scheduling_lock=true` schützt). Nur Items mit `auto_scheduled=true` oder `status='review'` werden umgeplant.

### 4.5 Manuelles Override

Im Kalender per Drag-Drop ein Item auf einen anderen Tag/Slot ziehen → API-Call `PATCH /api/redaktionsplan/{itemId}` setzt `scheduled_at`, `scheduled_by=auth.uid`, `scheduling_lock=true`, `auto_scheduled=false`.

Per Klick „Lock entfernen" wird `scheduling_lock=false` zurückgesetzt — beim nächsten Auto-Run greift wieder die automatische Verteilung.

### 4.6 Cron-Job „Publish Now"

Läuft alle 5 Minuten (über Skill `anthropic-skills:schedule` oder Vercel Cron):

```
SELECT * FROM <content_tables> WHERE status='scheduled' AND scheduled_at <= now();
→ FOR EACH: UPDATE status='publiziert', published_at=now(), scheduled_at unverändert
→ Bei Erfolg: Sitemap-Revalidation triggern (ISR-Revalidate-Webhook)
→ Bei Fehler: Log + Sentry-Notification, Item bleibt scheduled für Retry
```

### 4.7 Frische-Re-Review-Integration

Cron-Job „Freshness Check" (täglich 06:00) prüft auf `next_review_at < now()` (siehe [redaktion-trust-spec.md § 4.5](./redaktion-trust-spec.md#25-re-review-cron)) und erzeugt pro fälligem Inhalt ein **Review-Event** im Kalender — eigener Tabellentyp `review_termine` mit `due_at`, `content_ref`, kein `scheduled_at`-Eintrag in der Content-Tabelle. Diese Termine erscheinen im Kalender als orange Marker neben den Veröffentlichungen.

---

## 5. UI/UX — Admin-Kalender

### 5.1 Route

`app/admin/(protected)/redaktionsplan/page.tsx` — Server Component mit Client-Calendar.

Sidebar-Eintrag „Redaktionsplan" zwischen „Bilder" und „Einstellungen".

### 5.2 Layout

Drei Hauptbereiche horizontal:

**Linke Spalte (Inhalts-Pool, ca. 280 px):**
- Filter nach Produkt-Dropdown (Default: aktuelles Produkt = Sterbegeld24Plus)
- Filter nach Page-Type (hauptseite, ratgeber, anbieter, blog, wissen, persona)
- Liste aller `status='review'`-Inhalte ohne `scheduled_at`, mit Card pro Item:
  - Titel
  - Page-Type-Badge (farbcodiert)
  - Produkt-Badge
  - Autor-Foto (klein, aus `redaktion`)
  - Wortzahl, falls vorhanden
  - Drag-Handle
- Footer: „N Items im Pool · Vorrat reicht für X Tage bei aktueller Frequenz" (berechnet aus `scheduling_config.max_pro_tag`)
- Button: „Auto-Verteilen über nächste 28 Tage" → öffnet Modal mit Settings-Preview, dann ausführt

**Mittlere Spalte (Kalender, fluid):**
- View-Wechsler oben: Tag · Woche · Monat (Default Woche)
- In Wochen/Monatsview: pro Tag eine Spalte mit allen geplanten Items
- Items sind Cards im selben Farbschema wie im Pool
- Drag-Drop: Item aus Pool oder zwischen Tagen verschieben
- Blackout-Tage visuell grau hinterlegt
- Heutige Spalte stärker hervorgehoben
- Konflikt-Indikator pro Tag (gelbes Warndreieck, wenn Mix-Regel verletzt würde)

**Rechte Spalte (Konflikte + Stats, ca. 280 px, ein-/ausklappbar):**
- „⚠ 3 Tage mit Konflikten" — klickbare Liste, scrollt Kalender dorthin
- „📅 Review-Termine: 2 fällig" — Liste aus `review_termine`
- Mini-Stats: „Diese Woche: 14 Veröffentlichungen geplant, 11 reviewt, 3 ausstehend"

### 5.3 Bulk-Actions

- „Alle ausgewählten verschieben um +N Tage"
- „Alle Locks entfernen für Datumsspanne X-Y"
- „Pool leeren auf nächsten 14 Tage" (Auto-Schedule mit aggressiverer Frequenz)
- „Vorschau-PDF" — eine zur Approval geeignete Übersicht des Plans als PDF, das Christian vorab durchgehen kann

### 5.4 Modal „Auto-Verteilen"

Vor dem Auto-Run zeigt ein Modal:
- Zeitraum (Default: jetzt + 28 Tage, editierbar)
- Frequenz (vorbelegt aus `scheduling_config.max_pro_tag`, override-bar)
- Vorschau: „N Items werden auf X Veröffentlichungs-Slots verteilt, davon Y mit Konflikt-Risiko"
- Buttons: „Plan anwenden" · „Plan als Entwurf speichern" · „Abbrechen"

---

## 6. Pilot mit Sterbegeld24Plus

### 6.1 Bestehende Inhalte als Test-Pool

Mit Sterbegeld24Plus existiert bereits eine reiche Pipeline:

| Quelle | Items | Status heute | Status nach Pilot-Lauf |
|---|---|---|---|
| `generierter_content` Sterbegeld24Plus | 12 Sections + 3 Ratgeber | publiziert | unverändert |
| Geplante Anbieter-Seiten | 7 (Allianz, DELA, Ideal, LV1871, NÜRNBERGER, Mün. Begräbnisverein, HDI) | noch nicht generiert | nach Generator-Lauf in `review`, dann Pool |
| Geplante Persona-Pages | 5-7 (Diabetiker, Vorerkrankte, Senioren 70+, Handwerker, Witwen, alleinstehende Frauen) | noch nicht generiert | wie oben |
| Wissensfundus-Re-Import finanzteam26 | 18 Slugs (siehe redaktion-trust-spec § 6) | noch nicht importiert | nach Import in `review`, dann Pool |
| Blog-Re-Import alte finanzteam26 | 10 bereits importiert (Status `entwurf`) | entwurf | nach Christian-Review auf `review`, dann Pool |

Gesamt-Pool nach voller Produktion: **~50 Items** für Sterbegeld allein, die über den Scheduler verteilt werden.

### 6.2 Pilot-Veröffentlichungs-Plan

Bei Default-Konfiguration (`max_pro_tag=3`, Mo-Fr, Zeitfenster 08-18 Uhr, min_spacing=180min):
- 50 Items / 3 Items/Tag = ca. 17 Werktage = 3,5 Wochen
- Mit Mix-Constraints (max 2 derselben Page-Type pro Tag, max 1 Anbieter-Seite pro Tag) effektiv 4-6 Wochen

Vorgegebener Mix pro Woche der Pilot-Phase:
- 2-3 Anbieter-Seiten
- 3-4 Persona-Pages
- 3-5 Wissensfundus-Einträge
- 1-2 Blog-Re-Imports
- Re-Reviews bei Fälligkeit

Diese Frequenz signalisiert Google natürliches Site-Wachstum und vermeidet die Site-Level-Quality-Penalty aus § 1.

### 6.3 Erfolgs-Kriterien für den Pilot

- Cron-Job läuft 14 Tage fehlerfrei, alle `scheduled_at`-Termine treffen die geplante Veröffentlichungs-Zeit ±5 Min.
- Christian kann täglich in unter 5 Min die fällige Review-Liste sehen und abarbeiten.
- Mindestens 30 Items aus dem Pool werden in 3 Wochen automatisch verteilt und veröffentlicht.
- Google Search Console: Crawl-Frequenz steigt langsam und gleichmäßig, keine plötzlichen Crawl-Errors.
- Konfliktrate unter 10 % (nicht mehr als 10 % der Auto-Schedule-Items landen im Konflikt-Status).

---

## 7. Technische Architektur

### 7.1 Backend

**API-Endpunkte unter `/api/redaktionsplan/`:**

```
GET    /api/redaktionsplan/pool?produkt=…&page_type=…     → unscheduled review-Items
GET    /api/redaktionsplan/calendar?from=…&to=…           → scheduled items + review-termine im Zeitraum
POST   /api/redaktionsplan/auto-schedule                  → führt Auto-Distribution aus
PATCH  /api/redaktionsplan/{contentType}/{id}             → manuelles Re-Schedule, Lock setzen
DELETE /api/redaktionsplan/{contentType}/{id}             → Schedule entfernen, zurück in Pool
GET    /api/redaktionsplan/conflicts?from=…&to=…          → Konflikt-Liste
```

Alle mit Zod-Validation, alle protected durch Supabase-Auth + RLS.

**Library-Struktur:**

```
lib/redaktionsplan/
  ├── distribute.ts       # Auto-Distribution-Algorithmus, pure Funktion
  ├── conflicts.ts        # Mix-Regel-Checks
  ├── slot-availability.ts # Slot-Berechnung aus scheduling_config
  ├── publish.ts          # transitions scheduled → publiziert (vom Cron aufgerufen)
  └── types.ts
```

### 7.2 Frontend

**Komponenten:**

```
components/redaktionsplan/
  ├── ContentPool.tsx          # linke Spalte
  ├── Calendar.tsx             # mittlere Spalte (react-big-calendar oder eigene Lösung)
  ├── ConflictPanel.tsx        # rechte Spalte
  ├── AutoScheduleModal.tsx    # Konfig-Modal
  ├── ItemCard.tsx             # einzelnes Item, dragable
  └── BulkActionsMenu.tsx
```

Drag-Drop via `@dnd-kit/core` (leichtgewichtig, Server-Component-kompatibel beim Wrapper).

Calendar-Library: `react-big-calendar` für die Woche/Monat-Views, eigene Tagesansicht mit höherer Slot-Auflösung.

### 7.3 Cron-Job

Skill `anthropic-skills:schedule` (Cowork) **oder** Vercel-Cron (`vercel.json`):

```json
{
  "crons": [
    { "path": "/api/cron/publish-due",   "schedule": "*/5 * * * *" },
    { "path": "/api/cron/freshness",     "schedule": "0 6 * * *"   }
  ]
}
```

Schutz via `Authorization: Bearer <CRON_SECRET>` Header — Vercel setzt das automatisch, externe Aufrufe werden abgewiesen.

---

## 8. Migration

`supabase/migrations/20260502000000_publication_scheduler.sql`:

```sql
-- Status-Enum erweitern auf allen drei Content-Tabellen
ALTER TABLE generierter_content DROP CONSTRAINT generierter_content_status_check;
ALTER TABLE generierter_content
  ADD CONSTRAINT generierter_content_status_check
  CHECK (status IN ('entwurf','review','scheduled','publiziert'));

ALTER TABLE blog_posts DROP CONSTRAINT blog_posts_status_check;
ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('entwurf','review','scheduled','publiziert'));

ALTER TABLE wissensfundus
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publiziert'
    CHECK (status IN ('entwurf','review','scheduled','publiziert'));

-- Scheduler-Felder pro Tabelle (3x identisch)
ALTER TABLE generierter_content
  ADD COLUMN IF NOT EXISTS scheduled_at    timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_scheduled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduling_lock boolean NOT NULL DEFAULT false;
-- analog für blog_posts und wissensfundus

CREATE INDEX IF NOT EXISTS idx_genc_scheduled
  ON generierter_content(scheduled_at) WHERE status = 'scheduled';
-- analog für blog_posts und wissensfundus

-- Konfig
CREATE TABLE scheduling_config (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id               uuid REFERENCES produkte(id) ON DELETE CASCADE,
  max_pro_tag              integer NOT NULL DEFAULT 3,
  min_spacing_minuten      integer NOT NULL DEFAULT 180,
  blackout_wochentage      integer[] NOT NULL DEFAULT '{0,6}',
  blackout_daten           date[] NOT NULL DEFAULT '{}',
  publikations_zeitfenster int4range NOT NULL DEFAULT '[8,18)',
  mix_regel                jsonb NOT NULL DEFAULT '{"max_pro_page_type_pro_tag":2,"max_anbieter_pro_tag":1}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_scheduling_config_unique_produkt
  ON scheduling_config(produkt_id)
  WHERE produkt_id IS NOT NULL;

-- Globaler Default
INSERT INTO scheduling_config (produkt_id) VALUES (NULL) ON CONFLICT DO NOTHING;

-- Review-Termine
CREATE TABLE review_termine (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type    text NOT NULL CHECK (content_type IN ('generierter_content','blog_post','wissensfundus')),
  content_id      uuid NOT NULL,
  due_at          timestamptz NOT NULL,
  reviewer_id     uuid REFERENCES redaktion(id) ON DELETE SET NULL,
  done_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_termine_due ON review_termine(due_at) WHERE done_at IS NULL;

-- RLS
ALTER TABLE scheduling_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_termine    ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_scheduling_admin ON scheduling_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY p_review_admin     ON review_termine    FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 9. Success Metrics

**Operativ (Pilot, 4-6 Wochen Sterbegeld):**
- Cron-Uptime ≥ 99 %, alle Veröffentlichungen treffen Termin ±5 Min.
- Auto-Distribute-Konfliktrate ≤ 10 %.
- Pool-Vorrat hält permanent ≥ 7 Tage (Reviewer-Frühwarnsystem funktioniert).
- Mindestens 30 Items über den Scheduler veröffentlicht im Pilot-Zeitraum.

**SEO (8-12 Wochen nach Pilot-Launch):**
- Indexierungsrate (GSC) > 85 % der publizierten URLs.
- Keine plötzlichen Crawl-Anomalien (kein Spike, kein Drop) — Google-Crawl-Stats zeigen lineares Wachstum.
- Kein Site-Level-Quality-Signal-Drop messbar (Sistrix Sichtbarkeitsindex der Domain stabil oder steigend).
- Long-Tail-Rankings auf S. 1 (Position 1-10) wachsen linear, mindestens 5 neue pro Monat.

**Redaktionell:**
- Christians durchschnittliche Review-Zeit pro Tag ≤ 30 Min.
- Re-Review-Termine (`review_termine`) werden zu ≥ 90 % vor `due_at + 7 Tage` abgehakt.

---

## 10. Rollout-Plan

**Woche 1** — Migration + Backend
- Migration auf Staging, Smoke-Test des Status-Enums
- `lib/redaktionsplan/distribute.ts` mit Unit-Tests
- `/api/redaktionsplan/*` Endpunkte fertig
- Cron-Endpunkte `publish-due` und `freshness` deployed auf Staging

**Woche 2** — Frontend
- Calendar-Komponente + Pool-Komponente + Drag-Drop
- Auto-Schedule-Modal
- Konflikt-Panel

**Woche 3** — Pilot-Lauf Sterbegeld
- Sterbegeld-Pipeline füllt Pool (Anbieter-Seiten + Personas generieren, Wissensfundus-Reimport)
- Auto-Schedule über 4 Wochen
- Christian reviewt täglich, manuelle Korrekturen via Drag-Drop
- Wöchentliches Standup zum Konflikt-Reporting

**Woche 4-7** — Pilot-Beobachtung
- GSC-Crawl-Stats und Sistrix-Sichtbarkeit beobachten
- Bei Auffälligkeiten Frequenz reduzieren (`max_pro_tag` runter)
- Nach Woche 6: Pilot-Review-Meeting, ggf. Anpassungen

**Woche 8+** — Rollout auf weitere Produkte
- BU, Pflege, Leben, Unfall-Varianten jeweils mit eigener `scheduling_config`-Row
- Per Produkt-Toggle aktivieren

---

## 11. Offene Fragen

**OQ-1 — Schreib-Optimum-Tageszeit:** Aktuell vorgegeben 08-18 Uhr. Gibt es analytische Hinweise, dass z. B. 09-11 Uhr (vormittagslese-Peak) besser konvertiert? Sollte das Veröffentlichungs-Zeitfenster für Money-Pages enger gesetzt werden? — **Empfehlung:** Default belassen, bei Bedarf später per `scheduling_config` produkt-spezifisch verengen.

**OQ-2 — Blackout-Datenpflege:** Wer pflegt die Feiertage in `blackout_daten`? Manuell oder per Library (`date-holidays`)? — **Empfehlung:** Library-basierte Default-Pflege für DE+BY, manuelle Override-Möglichkeit für Urlaubszeiten.

**OQ-3 — Veröffentlichungs-Drosselung bei GSC-Anomalien:** Soll der Scheduler bei plötzlichem Indexing-Drop automatisch die Frequenz reduzieren? — **Empfehlung:** Nicht in dieser Iteration, aber Hook für spätere Automation vorsehen.

**OQ-4 — Multi-Reviewer:** Aktuell ist Christian Single-Reviewer. Wenn finanzteam26-Berater (Schmieds) als zweite Reviewer ins System sollen — eigene `reviewer_id`-Zuteilung pro `review_termine`? — **Empfehlung:** Schema sieht das schon vor, UI später ergänzen.

**OQ-5 — Was passiert mit `status='scheduled'`-Inhalten beim Generator-Re-Run?** Wenn der Generator denselben Slug mit neuem Content überschreibt, geht der Scheduling-Status verloren. — **Empfehlung:** Generator muss `scheduled`-Inhalte als geschützt behandeln und ein Re-Run erzwingt eine UI-Warnung.

---

## 12. Definition of Done

- ⬜ Migration läuft fehlerfrei auf Staging
- ⬜ `distribute.ts` mit ≥ 90 % Test-Coverage
- ⬜ `/api/cron/publish-due` läuft 7 Tage am Stück ohne Fehler
- ⬜ Calendar-UI funktional auf Desktop, Drag-Drop ohne Bugs
- ⬜ Auto-Schedule verteilt 30 Sterbegeld-Items konfliktfrei
- ⬜ Christian kann den Plan ohne Doku bedienen
- ⬜ GSC zeigt linearen Crawl-Anstieg im Pilot-Zeitraum
- ⬜ Konflikt-Rate ≤ 10 %
- ⬜ Doc in `docs/` aktuell gehalten
