# PRD — Keep Sterbegeld, delete test sites, prepare next niches

**Status:** shipped (DB 2026-08-14; public 404-guard needs next deploy)  
**Product:** LeadMonster  
**Depends on:** [content-strategie-nischen-anbieter.md](./content-strategie-nischen-anbieter.md) §8 (single domain `sterbegeld24plus.de`)

## Concept (learning)

A **product** in LeadMonster is not “a page file”. It is one row in table `produkte`.

- `status = aktiv` → public URL `/{slug}` (Sterbegeld lives on `/`)
- `status = entwurf` → exists in Admin, **not** in Google, no live microsite
- `status = archiviert` → hidden, still in DB until hard-delete

A **product type** (`produkt_typen`) is the *kind* of insurance (Sterbegeld, BU, …).  
The calculator labels (sum, age, filters) come from the type. The public site comes from the product row + generated content.

So “prepare fields” here means: create the **kind** + an **empty draft product**. No public pages yet. Content engine can fill them later.

## What is live today (prod DB, 2026-08-14)

| Slug | Status | Keep? |
|---|---|---|
| `sterbegeld24plus` | aktiv, 77 leads, full content | **KEEP — primary** |
| `sterbegeld25` | archiviert, 0 leads, test content | delete |
| `unfall2000` | archiviert, 0 leads | delete |
| `unfall-no-problem` | archiviert, 2 test leads | delete (leads detached, not deleted) |

## Goal

1. Sterbegeld24Plus stays the only public product (`/` on sterbegeld24plus.de).
2. Hard-delete the three archived test products (content + tarife cascade).
3. Pause unused kinds `pflege` and `unfall` (`active = false` — they disappear from “Neues Produkt”).
4. Prepare **draft** slots (not live):

| Niche | Type slug | Product slug | Public? |
|---|---|---|---|
| Risikolebensversicherung | `leben` (already exists) | `risikoleben` | no (`entwurf`) |
| BU | `bu` (already exists) | `berufsunfaehigkeit` | no |
| Versicherungen für Kinder mit ADHS | `kinder` (new) | `kinder-adhs` | no |
| Erbschaftsteuer bei Vermögen umgehen | `erbschaft` (new) | `erbschaftsteuer` | no |
| Andere Spezialnischen | `spezial` (new) | `spezialnische` | no — empty placeholder |

## Out of scope

- Generating Hauptseite / Ratgeber / images for the new niches
- Turning any new product `aktiv`
- Changing Sterbegeld content or tarife
- Deleting Wissensfundus seed files or CSV templates (not public sites)
- Lead confirmation emails (separate topic)

## Success metrics

- `GET /` still Sterbegeld24Plus
- `GET /sterbegeld25`, `/unfall2000`, `/unfall-no-problem` → 404
- Admin → Produkte shows Sterbegeld + 5 draft cards
- Admin → Versicherungsarten: `pflege` / `unfall` inactive; `kinder` / `erbschaft` / `spezial` present
- No live product except Sterbegeld

## Rollout

1. Idempotent SQL on prod (detach test leads → delete test products → types → drafts)
2. Code fallbacks (labels, accents, calculator defaults) so Admin shows German names
3. Verify Admin list + public 404s
4. Later PRDs: generate content per niche when ready
