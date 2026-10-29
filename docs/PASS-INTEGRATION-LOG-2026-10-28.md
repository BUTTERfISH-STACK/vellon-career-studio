# VÉLLON PASS Integration Log

Date: 2026-10-28
Project: VÉLLON Career Studio
Offer: R29.99 ZAR, one-time payment, 24-hour access after approval

## Security and release constraints

- Keep Yoco in test mode until end-to-end verification passes.
- Never expose secret keys, database URLs, or ADMIN_TOKEN to browser code.
- Never unlock PASS based solely on a browser redirect or localStorage.
- Verify payment server-side before admin approval.
- Start the 24-hour expiry only when approval succeeds.
- Preserve existing project files and backups.
- Do not deploy or push to GitHub without explicit authorization.

## Stage 1 — Webhook matching

Status: Static checks passed; end-to-end verification pending.

- Backed up the original webhook.
- Updated checkout matching to use the stored checkout ID.
- Validate orderId when supplied.
- Require the expected amount, currency, test mode, and event-specific status.
- Added duplicate webhook delivery-content checks.
- JavaScript syntax check passed.
- ESLint passed.
- Production build passed.
- Yoco sandbox event compatibility and database behavior remain unverified.

Backup:
backups/webhook.js.matching-fix-20261028-155752.bak

## Stage 2 — Database migration review

Status: Pending review.

- Inspect the migration for schema correctness and safe repeat execution.
- Confirm the intended Neon database before running it.
- Do not run the migration until the review is complete.

## Remaining stages

- Verify Yoco checkout and webhook contracts against real test-mode events.
- Run and verify the database migration.
- Connect the customer checkout and return-status flow.
- Build the protected admin approval interface.
- Test success, failure, duplicate events, mismatches, approval, decline, and expiry.
- Complete the end-to-end test-mode checklist before considering live mode.
