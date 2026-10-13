# PRD — Disable Resend lead emails (master switch)

**Status:** shipped (prod 2026-08-14)  
**Product:** LeadMonster  
**Depends on:** Resend mailer (`lib/resend/mailer.ts`), Admin Einstellungen

## Concept (learning)

After a lead is saved, LeadMonster can do **two separate things**:

1. **Convexa** — push lead into the CRM (Admin toggle `convexa_sync_enabled`)
2. **Resend** — send emails that do **not** go through Convexa:
   - confirmation to the prospect (`sendLeadConfirmation`)
   - ping to sales (`sendSalesNotification` → address from `sales_notification_email`)

Saving a sales email address in Admin only sets *where* the sales ping goes. It does **not** mean “Convexa mail”. Those Resend mails always ran after every successful lead (and on bot recover), as long as `RESEND_API_KEY` exists.

**Goal now:** Admin can turn Resend completely OFF (default OFF). Leads + Convexa stay unchanged.

## Goal

1. Setting `resend_enabled` in `einstellungen` (default `false`)
2. `isResendEnabled()` — missing/empty/`false` = no emails
3. Gate in `POST /api/leads` and `recoverBotAttempt`
4. Admin → Einstellungen toggle next to sales email
5. LeadForm copy must not promise a confirmation email while mail is the product default off

## Out of scope

- Deleting Resend code or API keys
- Changing Convexa sync
- Email drip sequences / freshness script notify

## Success metrics

- New lead → `resend_sent` stays `false`, no Resend API call when switch OFF
- Admin can turn switch ON later without a code deploy
- Convexa still works independently

## Rollout

1. Migration seed `resend_enabled = false`
2. Code gate + Admin UI + tests
3. Deploy production
4. Smoke: submit test lead → no inbox mail, Convexa optional as configured
