# PRD — Email confirmation before Convexa

**Status:** in progress  
**Product:** LeadMonster

## Concept

A form submit saves the lead. It does not prove the inbox is real. Email confirmation does: we send one link, and only a click marks the address as confirmed. That is not 2FA. 2FA is a second code at login.

While `resend_enabled` is on:

1. The thank-you screen tells the visitor to open the mail and click.
2. Convexa and the sales mail wait for that click.
3. The link lasts 72 hours. The database stores only a hash of the token.

While `resend_enabled` is off, nothing promises a mail, and Convexa still runs right after save.

## Success

- After submit, the thank-you text mentions the confirm link.
- The mail contains `E-Mail-Adresse bestätigen`.
- The link host is the public site `https://www.sterbegeld24plus.de`, never a `*.vercel.app` hostname.
- Before the click, `email_confirmed_at` is empty and `convexa_synced` stays false.
- After the click, `email_confirmed_at` is set and Convexa runs.
