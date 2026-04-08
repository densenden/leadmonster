# Raw Idea — Supabase Schema & Database Foundation

**Date:** 2026-04-06
**Status:** Idea captured — awaiting requirements phase

---

## Feature Description

**Feature: Supabase Schema & Database Foundation**

All 7 database tables created in Supabase (PostgreSQL) with correct column types, foreign keys, RLS policies, indexes, and generated TypeScript types. Tables: `produkte`, `produkt_config`, `wissensfundus`, `generierter_content`, `leads`, `einstellungen`, `email_sequenzen`.

---

## Tables in Scope

1. `produkte` — Core product registry (slug, name, typ, status, domain)
2. `produkt_config` — Per-product configuration (zielgruppe, fokus, anbieter, argumente)
3. `wissensfundus` — Knowledge base entries (kategorie, thema, inhalt, tags)
4. `generierter_content` — AI-generated content store (page_type, slug, title, meta, content JSON, schema markup)
5. `leads` — Lead capture records with Confluence and Resend sync flags
6. `einstellungen` — System settings / credentials store (Confluence credentials, encrypted)
7. `email_sequenzen` — Email sequence templates per product

---

## Key Requirements (as stated)

- Correct PostgreSQL column types for all tables
- Foreign keys with appropriate ON DELETE behavior
- Row Level Security (RLS) policies
- Indexes for performance
- Generated TypeScript types from Supabase schema
