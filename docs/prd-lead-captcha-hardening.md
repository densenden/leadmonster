# PRD — Lead form captcha hardening (stop bot leads)

**Status:** shipped (prod 2026-07-29)  
**Date:** 2026-07-29  
**Product:** LeadMonster

## Concept (why bots got through)

A **captcha** is a challenge that proves “this submit is likely a human”.

Our Cloudflare Turnstile check used a **soft-fail** policy:

- If the browser sent **no token** → server still **accepted** the lead  
- Reason (product): antivirus / network sometimes blocks the widget  

Bots learned this: they POST `/api/leads` **without** a captcha token and land in `leads` (and Convexa). Honeypot only catches naive bots that fill hidden fields.

**Learning takeaway:** Soft-fail = “protection optional”. Hard-fail = “no valid captcha → reject / quarantine”.

## Problem

Many leads since **2026-07-22** were not filtered. Captcha was on but not enforced when the token was missing.

## Goal

1. **Hard-require** a valid captcha token when bot protection is enabled  
2. Offer a **second provider: hCaptcha** (checkbox challenge) so we can switch away from Turnstile  
3. Add a cheap extra signal: **minimum form fill time** (bots often submit in &lt;1s)  
4. Keep honeypot + IP rate-limit  

## Provider switch

| Setting | Values |
|---|---|
| `captcha_provider` | `turnstile` (default, existing keys) \| `hcaptcha` |
| `turnstile_enabled` | master ON/OFF for any captcha (kept for backwards compat) |
| `hcaptcha_site_key` / `hcaptcha_secret_key` | keys from https://dashboard.hcaptcha.com |

Admin → Einstellungen → Bot-Schutz: toggle + provider + keys.

## Server rules (when captcha enabled)

| Case | Behavior |
|---|---|
| No token | **403** `CAPTCHA_REQUIRED` + quarantine `lead_bot_attempts` |
| Token rejected by provider | **403** `CAPTCHA_FAILED` + quarantine |
| Provider siteverify network down | Soft-allow (rare outage; log warning) |
| Invalid secret key | **Hard-fail** (so misconfig is visible; do not silently open the door) |
| Form dwell &lt; 2.5s | **403** `TOO_FAST` + quarantine `too_fast` |

## Client rules

- Widget **must** load; if it fails → show error, **block submit** (no soft submit)  
- Require token before POST  
- Send `formLoadedAt` (ISO) for dwell check  

## Out of scope

- CAPTCHA for admin login (Supabase Auth has its own)  
- Automatic provider failover mid-request  
- Blocking real customers with accessibility alternatives beyond provider widgets  

## Success metrics

- Spike of rows in `lead_bot_attempts` with `captcha_required` / `too_fast`  
- Drop of suspicious rows in `leads` after deploy  
- Real users can still submit after completing checkbox / Turnstile  

## Rollout

1. Deploy hard-fail Turnstile (works with existing Cloudflare keys immediately)  
2. Create hCaptcha site + keys → paste in Admin → switch provider to `hcaptcha`  
3. Monitor Admin → Leads / Bot-Versuche  

## Bugfix 2026-07-31 — hCaptcha 422

Vercel logs showed Zod `too_big` on `turnstileToken` (max 2048).  
hCaptcha response tokens are often longer than Turnstile tokens.  
Raised limit to **8192** in `app/api/leads/route.ts`.
