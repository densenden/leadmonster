# PRD — Lead spam heuristics (captcha-solving fake leads)

**Status:** shipped (prod 2026-08-03)  
**Date:** 2026-08-03  
**Product:** LeadMonster  
**Depends on:** [prd-lead-captcha-hardening.md](./prd-lead-captcha-hardening.md)

## Concept (learning)

A **captcha** only proves “something solved the challenge” — not “this is a real Sterbegeld customer”.

Bot farms:

1. Open VergleichsRechner and **leave the defaults** (age 65 → Geburtsjahr, Wunschsumme 8000 €, Wartezeit “Egal”)  
2. Click CTA → LeadForm opens with prefilled `interesse` text that still says those defaults  
3. Fill random identity + a LeadForm `geburtsdatum` (often unrelated to the calculator year)  
4. Solve hCaptcha → POST `/api/leads` → Convexa  

Admin → Bot-Versuche stayed empty because captcha **passed**. Fakes sat in normal Leads.

**Takeaway:** Captcha = door lock. Product heuristics = “did they behave like a real comparer?”

## Evidence (DB, 2026-07/08)

User-flagged fakes (Silke, Malte, Uwe, Cem, Achim, …) all share:

| Field | Value |
|---|---|
| `sterbegeld_summe` | **8000** (= `default_summe`) |
| `akzeptierte_wartezeit_monate` | **0** (Egal → inherit cheapest tarif) |
| `interesse` | `… Geburtsjahr **1961** (65 Jahre), **8.000 €** …` |
| `filter_kontext.form_placement` | `vergleichsrechner` |
| LeadForm `geburtsdatum` | often a **different** year than 1961 |

VergleichsRechner Sterbegeld defaults (`lib/tarife/produkt-config.ts`):

- `default_age: 65` → geburtsjahr = `CURRENT_YEAR - 65` (2026 → **1961**)  
- `default_summe: 8000`  
- Wartezeit filter `default_value: null` (“Egal”)

Also: birth years **after 1990** (1991+) are rare for own Sterbegeld applications → strong fake signal.

## Goal

1. Quarantine to `lead_bot_attempts` (`spam_heuristic`) — **no Convexa**, no sales mail  
2. Keep server-signed form-session cookie + hard-fail captcha siteverify  
3. Bot-Versuche UI labels for new reasons  

## Heuristic rules (quarantine if **any** match)

| Signal | Rule |
|---|---|
| `born_after_1990` | `geburtsdatum` year **> 1990** (1991+) |
| `vergleich_defaults_unchanged` | From VergleichsRechner path: summe **8000** + wartezeit **null/0** + `interesse` still contains default age text (`Geburtsjahr {year}` / `(65 Jahre)`) and default summe |

Do **not** use name/email mismatch, typo domains, or street-without-number as main rules (rejected).

## Out of scope (next PRD)

- Email double opt-in before Convexa (still needed for coherent fakes that change calculator knobs)  
- SMS OTP / IP reputation  
- Auto-delete historical fake leads  

## Success metrics

- New `lead_bot_attempts` rows with `spam_heuristic` for default-knob + young-birth bots  
- Drop of `sum=8000` + `Geburtsjahr 1961` fakes in `leads` after deploy  

## Rollout

1. Ship heuristics + migration reasons  
2. Deploy production  
3. Monitor Admin → [Bot-Versuche](https://www.sterbegeld24plus.de/admin/leads/bots)  
4. Follow-up: email confirm before Convexa  
