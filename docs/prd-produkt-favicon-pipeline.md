# PRD — Per-product favicon pipeline

**Status:** implementing  
**Date:** 2026-07-19  
**Product:** LeadMonster

## Problem

Browser tabs always showed the global LeadMonster `app/icon.svg`. Product branding
(letter circle / square upload) lived only in the navbar, not in the tab icon.

## Goal

Every public product page (including root `/` for sterbegeld24plus) uses a
**product-specific favicon**:

1. If a **square product icon** is uploaded → use that file  
2. Else → **generate** a circular PNG with the product initial + accent color  

## Pipeline

```
Admin upload (optional, must be 1:1)
        │
        ▼
produkte.navbar_logo_url (+ visible for navbar only)
        │
        ▼
GET /api/produkte/[slug]/icon?size=32|180
        │
        ├─ url present → proxy/redirect uploaded square icon
        └─ else → sharp renders letter circle PNG
        │
        ▼
metadata.icons on product layout + root page
```

## Rules

- Favicon generation does **not** depend on `navbar_logo_visible`  
  (tab icon can exist even if navbar mark is hidden)  
- Upload must stay square (existing validation)  
- Always respond with **200 image/png** from our domain (no 302) — better for Google  
- Default size **48×48** (Google: multiples of 48px)  
- Cache: `public, max-age=3600, stale-while-revalidate=86400`  
- Non-product routes keep global `app/icon.svg`

## Google Search timing

Google does **not** update favicons instantly:

1. Crawl homepage (sees `<link rel="icon" href="/api/produkte/.../icon">`)
2. Fetch that URL (must return 200 + square PNG)
3. Pass quality checks (not too generic, crawlable, ≥48px)
4. Show in Search results — often **a few days to a few weeks**

Faster check: [Google Search Console](https://search.google.com/search-console) → URL Inspection on `/` → request indexing. Still no guarantee for favicon refresh timing.

## Out of scope

- Separate DB column for favicon (reuse product icon upload)  
- `.ico` format (PNG is enough for modern browsers)
