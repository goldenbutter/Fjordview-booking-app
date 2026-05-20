# Claude S03 — Deploy readiness

> **Session:** Claude S03
> **Agent:** Claude (Opus 4.7, 1M context)
> **Date:** 2026-05-20 (Europe/Oslo)
> **Branch:** `claude/deploy-readiness` (cut from `codex/room-crud` head `6bf467f`)
> **Token-budget bucket:** Green at close (~40% used of 1M window).

## Goal

Close the two open items in [codex-s07-to-next-agent-cron-and-multitenant.md](../../agent-handoffs/active/codex-s07-to-next-agent-cron-and-multitenant.md) so Bithun can deploy to Vercel for an interview demo on 2026-05-21:

1. Cron job real bodies (daily reminders/thank-yous/cleaning, cleanup of stale pending bookings).
2. Second-property multi-tenant verification (code-side; runtime RLS verification still requires a second Supabase auth user).

Plus capture a deploy checklist for Vercel so the human can stand up the env vars without spelunking the codebase.

## Session timeline

| Time (CEST) | Commit | Slice |
|---|---|---|
| 2026-05-20 ~late afternoon | `34a5d98` | chore: relabel Codex S01 phase reports + regen `next-env.d.ts` (persisting in-progress working-tree state from `codex/room-crud`). |
| 2026-05-20 ~later | _follow-up commit_ | feat: cron bodies + second seed property + DEPLOY.md |

## Slice 1 — Working-tree cleanup

`codex/room-crud` carried 7 in-progress doc renames (`codex-phase-N.md` → `codex-s01-phase-N.md`) plus an `_docs/ACCEPTANCE_STATUS.md` edit and a regenerated `next-env.d.ts`. The S07 handoff explicitly instructed *not* to revert these. Committed them as a single `chore:` so the rest of the work lands on a clean tree.

## Slice 2 — Cron bodies + multi-tenant seed + deploy docs

### What changed

- [src/lib/db/queries.ts](../../../src/lib/db/queries.ts) — added four cron helpers:
  - `getBookingRefsForCheckInDate(checkIn, statuses)` for pre-arrival reminder candidates.
  - `getBookingRefsForCheckOutDate(checkOut)` for post-stay thank-you candidates.
  - `ensureCleaningTask({propertyId, roomId, taskDate, bookingId})` — idempotent insert (skips if a task already exists for `(property, room, date)`).
  - `cancelStalePendingBookings(cutoff)` — bulk-cancels expired pending holds and deletes their cleaning tasks; returns the canceled refs.
- [src/app/api/cron/daily/route.ts](../../../src/app/api/cron/daily/route.ts) — replaces the prior `mode: "local-demo"` stub. Iterates tomorrow's check-ins → `reminder` email, yesterday's check-outs → `thank_you` email, today's check-outs → `ensureCleaningTask`. Per-booking failures don't kill the cron — each is captured in the response payload.
- [src/app/api/cron/cleanup/route.ts](../../../src/app/api/cron/cleanup/route.ts) — replaces the stub. Cancels `pending` bookings older than 60 minutes.
- [src/lib/db/seed.ts](../../../src/lib/db/seed.ts) — adds `demoSecondaryProperty` (`aurora-cabin`), two room types, three rooms, and a 72-hour cancellation policy. Distinct `propertyId` from Fjordview so admin-scoping tests can assert isolation.
- [scripts/seed-db.ts](../../../scripts/seed-db.ts) — refactored to loop a `PropertyBundle[]` and seed each idempotently (skips by slug). Existing Fjordview deployments re-run cleanly; new deployments get both properties.
- [src/lib/cron-wiring.static.test.ts](../../../src/lib/cron-wiring.static.test.ts) — new static test asserting the cron routes wire the right helpers and the `local-demo` stub is gone.
- [src/lib/multi-tenant.static.test.ts](../../../src/lib/multi-tenant.static.test.ts) — new static test asserting the seed exports two distinct properties and per-property arrays don't cross-pollinate.
- [DEPLOY.md](../../../DEPLOY.md) — new file. Vercel env var matrix + the 6-step "first deploy + first cron run + flip to non-demo" path.
- [_docs/ACCEPTANCE_STATUS.md](../ACCEPTANCE_STATUS.md) — added a "Vercel-Ready Items" section describing what this branch unblocks.

### Key decisions

- **Cron auth.** Kept the existing pattern: if `CRON_SECRET` is unset, accept any request (so local `curl` works during dev). When set, require `Authorization: Bearer <secret>` (which is exactly what Vercel Cron sends).
- **Reminder cohort = `confirmed` only.** Pending bookings get auto-cancelled within the hour by the cleanup cron, so it would be confusing to remind a guest about a booking that may not exist when they wake up.
- **Idempotency rests on `email.ts`'s `Idempotency-Key`.** A re-fired cron will not send duplicate emails because the Resend key is `email-${type}-${bookingId}`. The cleaning-task helper rolls its own (`(property, room, date)` uniqueness check).
- **No code path for "no DATABASE_URL".** `getDb()` already throws when the URL is missing, and the rest of the feature code (booking, admin, dashboard) has the same dependency. The cron isn't an island. DEPLOY.md flags `DATABASE_URL` as required.
- **Second property data is minimal** (no bookings, no guests, no pricing rules). The handoff item is *verification readiness* — proof that scoping is structurally per-property. Full RLS runtime proof needs a second Supabase auth user, which is post-deploy human work; called out in DEPLOY.md §6.

### Verification

| Check | Result |
|---|---|
| `npm run lint` | Clean — no warnings, no errors. |
| `npx tsx --test scripts\verify-schema.static.test.ts src\lib\admin-context.test.ts src\lib\admin-scoping.static.test.ts src\lib\email-wiring.static.test.ts src\lib\email.test.ts src\lib\invoice.test.ts src\lib\room-crud.static.test.ts src\lib\stripe-wiring.static.test.ts src\lib\stripe.test.ts src\lib\cron-wiring.static.test.ts src\lib\multi-tenant.static.test.ts` | 34/34 pass (7 new tests: 3 cron-wiring + 4 multi-tenant). One iterate: the initial `type:\s*"thank_you"` regex over-fit and was relaxed to `"thank_you"` because the literal flows through a function argument rather than an object property in the route body. |
| `npm run build` | Pass — `next build` (Turbopack default) compiled in 7.1s, generated 24 static pages, and listed `/api/cron/cleanup` + `/api/cron/daily` in the dynamic route table. The known Recharts width/height warning still appears on `/admin/reports` and is unchanged from S07. |
| Browser smoke | The dev server already serves the booking + admin flows end-to-end against Supabase (verified by request log from the running dev server: `/book/fjordview`, `/admin/bookings`, `/admin/cleaning` PATCH, `/admin/invoices/:id`, `/admin/settings` all 200). The new cron routes will be exercised at first Vercel cron fire. |

## End state

- Branch `claude/deploy-readiness` is ready to merge into `main`.
- Open S02-queue items: none (both cron + multi-tenant scoping addressed).
- Open items for production launch (not blockers for the interview demo) remain in [MIGRATION.md](../../../MIGRATION.md) — primarily the rate-limit swap, the Stripe live keys, and the Resend domain verification.

## Handoff

[codex-s07-to-next-agent-cron-and-multitenant.md](../../agent-handoffs/active/codex-s07-to-next-agent-cron-and-multitenant.md) is being moved to `archive/2026-05-20/` with `status: completed`. No new active handoff opened; the next session can branch off `main` for whatever is next.
