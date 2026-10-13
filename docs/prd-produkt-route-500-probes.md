# PRD — Stop 500s on `/[produkt]` from bot probes

**Status:** shipped (prod 2026-08-10, dpl leadmonster-dwjuhcdpg)  
**Date:** 2026-08-10  
**Product:** LeadMonster  
**Vercel alert:** Medium — `produkt lookup failures` on `/[produkt]`, 5xx spike

## Concept (learning)

`/[produkt]` is a **catch-all dynamic route**. Any first URL segment that is not a real Next.js route becomes a "product slug".

Bots probe for secrets (`/.env`, `/.env.bak`) and PHP shells (`/wp.php`). Those URLs hit the product page.

The page is **ISR** (`revalidate = 60`) but `createAdminClient()` forced every Supabase call to `cache: 'no-store'`. Next.js then throws:

> Page changed from static to dynamic at runtime

That becomes HTTP **500** instead of a clean **404**. Vercel alerts on the 5xx spike. Real product pages were mostly fine; the noise was scanners.

## Goal

1. Middleware hard-404 for obvious probe paths (no serverless product render).  
2. Slug shape-check before any DB call → `notFound()` (404).  
3. `createPublicClient()` for public ISR pages (uses `next.revalidate`, not `no-store`).  
4. Keep `createAdminClient()` + `no-store` for Admin / APIs that need fresh data.

## Out of scope

- WAF / Vercel Firewall rules (nice later)  
- Changing product URL structure  
- Blocking all unknown slugs at CDN (we still want soft 404 for typos like `/pflegee`)

## Success metrics

- Probe paths return **404**, not 500  
- Valid product pages still render (e.g. `/` and published slugs)  
- Vercel `/[produkt]` 5xx alert volume drops after deploy

## Rollout

1. Code + unit tests for slug/probe helpers  
2. Deploy production leadmonster  
3. Spot-check: `/.env` → 404, real product → 200, unknown slug → 404  

## Test links (prod)

- Probe: `https://www.sterbegeld24plus.de/.env` → expect 404  
- Probe: `https://www.sterbegeld24plus.de/wp.php` → expect 404  
- Home: `https://www.sterbegeld24plus.de/` → expect 200  
- Unknown slug: `https://www.sterbegeld24plus.de/does-not-exist-xyz` → expect 404  
