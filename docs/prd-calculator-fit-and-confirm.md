# PRD — Calculator fits the page, confirmation is obvious

**Status:** implemented locally (not deployed)  
**Date:** 2026-10-12  
**Product:** LeadMonster

## Concept

Two layout ideas:

1. **A box cannot be wider than its parent unless we allow scroll.**  
   The tariff table used `overflow-x-auto`. That CSS rule means: if the columns are wider than the card, show a sideways scrollbar instead of shrinking the columns. Long labels like `Hannoversche anfragen` plus `whitespace-nowrap` made the table wider than the card (`max-w-5xl` = 1024px). That is the gray bar in the screenshot.

   Fix: `table-fixed` + `w-full` locks the table to the card width. Text wraps. Below the `lg` breakpoint (1024px) we keep the stacked cards, which already fit a phone.

2. **Low contrast is easy to skip.**  
   After submit, the form is replaced by a white box with gray text on a white page. The important line is “click the email link, or we cannot process this”. If a visitor misses it, the lead sits unconfirmed.

   Fix: navy border, light blue background, the email sentence in bold, and scroll that box under the sticky header.

## What we are not changing

- The words of the confirmation (same German copy).
- Mobile cards still say `{Anbieter} anfragen`. The desktop button says `Anfragen` so the last column stays narrow.
