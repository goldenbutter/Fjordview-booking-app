---
from: codex (S04 audit)
to: next-agent
date: 2026-05-17T00:25:00+02:00
topic: Audit follow-up after development-status review
status: completed
date_acknowledged: 2026-05-17T02:54:31+02:00
date_completed: 2026-05-17T03:07:55+02:00
final_commit: cfab950
branch_at_handoff: codex/development-status-audit
read_first:
  - _docs/AGENT-PROTOCOL.md
  - _docs/agent-handoffs/active/opus-s02-to-next-agent-deferred-items.md
  - _docs/audits/2026-05-17-development-status-audit.md
  - _docs/agent-reports/2026-05-17/codex-s04-development-status-audit.md
---

# Audit follow-up dispatch

## Context

Codex audited the merged `main` state against `_docs/_prompt/guesthub-booking-system-dev-prompt.md`, prior Codex reports, Opus S01/S02 reports, and the active S02 handoff. The existing Opus S02 handoff remains valid and should stay the primary implementation queue.

## Goal

Pick up implementation using the S02 handoff, with these audit refinements:

1. Consider doing auth-aware admin scoping before or alongside second-property verification. The admin guard exists, but admin pages/routes still resolve `env.defaultPropertySlug`.
2. Fix `scripts/verify-schema.ts` when touching verification scripts: it checks for `auth.property_id()` even though the accepted migration uses `public.current_property_id()`.
3. Keep Stripe and Resend work grounded in the prompt: public booking should start as `pending`/`unpaid`, Stripe webhook should confirm and mark paid, cancellation should issue refund and send email, and every email send should write `email_log`.

## Boundaries

- Do not duplicate this handoff's audit report in chat; use `_docs/audits/2026-05-17-development-status-audit.md`.
- Do not rewrite `_docs/agent-handoffs/active/opus-s02-to-next-agent-deferred-items.md` unless you are formally acknowledging/completing that handoff.
- Do not change app source just to satisfy this audit handoff unless the human asks for implementation.

## Verification Gate

For any implementation that follows:

- `npm run lint`
- `npm run build`
- Relevant browser/API smoke checks
- `npm run db:verify`
- For multi-tenant work, add and verify a second property/admin scope test.

## Open Questions

- Which provider keys are ready now: Stripe, Resend, both, or neither?
- Should the next coding slice prioritize architecture risk (auth-aware admin scoping) or demo completeness (Stripe checkout)?
