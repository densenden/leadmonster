# PRD — Manual recover of false-positive bot attempts

**Status:** shipped (prod 2026-08-10)  
**Date:** 2026-08-10  
**Product:** LeadMonster  
**Depends on:** [prd-lead-spam-heuristics.md](./prd-lead-spam-heuristics.md), [prd-lead-captcha-hardening.md](./prd-lead-captcha-hardening.md)

## Concept (learning)

`lead_bot_attempts` is a **quarantine**, not a trash can.

Heuristics (captcha fail, too fast, Sterbegeld spam patterns) can be wrong. A real person might:

1. Leave VergleichsRechner defaults by accident  
2. Fail captcha once  
3. Still be a valid prospect  

Admin must be able to **promote** one quarantine row into a normal `leads` row (Convexa + emails), without re-typing the form.

**Details column** shows *why* it was filtered (signals, dwell, placement) so the decision is informed.

## Goal

1. Admin → Bot-Versuche: **Details** column (readable summary from `payload`)  
2. Admin → Bot-Versuche: **Als Lead freigeben** action per row  
3. On recover: insert `leads`, optional Convexa push + sales/confirmation mail, mark attempt recovered (keep audit row)  
4. Enrich future quarantine `payload` with full form snapshot (address etc.) so recover has enough fields  

## Out of scope

- Bulk recover all  
- Auto-unquarantine  
- Editing fields before recover (v1 uses stored snapshot as-is)  

## Success metrics

- False-positive can become a real lead in &lt; 30s from Admin UI  
- Recovered rows stay visible as “freigegeben” (not deleted)  
- Link to new lead detail  

## Rollout

1. Migration `recovered_at` / `recovered_lead_id`  
2. `recoverBotAttempt` lib + server action  
3. UI Details + button  
4. Deploy + test on production Bot-Versuche page  
