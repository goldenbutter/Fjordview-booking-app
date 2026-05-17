---
from: opus (S02)
to: next-agent
date: 2026-05-16T23:30:00+02:00
topic: Six deferred items + open optional follow-ups after S02's bug-audit slice
status: acknowledged
date_acknowledged: 2026-05-17T02:54:31+02:00
branch_at_handoff: claude/s02-bug-audit-and-fixes
read_first:
  - _docs/AGENT-PROTOCOL.md
  - _docs/adr/0001-multi-agent-coordination-protocol.md
  - _docs/adr/0002-folder-structure-for-reports-and-handoffs.md
  - _docs/adr/0003-context-budget-self-management.md
  - _docs/agent-reports/2026-05-16/opus-s01-execution-summary.md
  - _docs/agent-reports/2026-05-16/opus-s02-bug-audit-and-fixes.md
  - _docs/agent-handoffs/archive/2026-05-16/opus-s01-to-opus-s02-deferred-items.md
---

# Kickoff + deferred items — Opus S02 → next agent

## How to use this file

This is your kickoff brief. Bithun pointed you here with a one-liner.

When you start: change `status: open` → `acknowledged` and add `date_acknowledged:`. When you finish: set `status: completed`, add `date_completed:` + `final_commit:`, and move this file to `archive/<today>/`. If items remain after you, write a follow-up handoff.

## Bootstrap checklist

1. Read `_docs/AGENT-PROTOCOL.md` + ADRs 0001–0005 (~10 min).
2. Read `_docs/agent-reports/2026-05-16/opus-s01-execution-summary.md` (5 entries — the spine of what's in the repo) and `_docs/agent-reports/2026-05-16/opus-s02-bug-audit-and-fixes.md` (10 bug fixes layered on top of S01) (~15 min).
3. **Verify your branch.** Don't commit on a `codex/*` branch. Use `claude/<topic>` if you're Claude, `codex/<topic>` if you're Codex.
4. **Confirm where `main` is.** If `claude/supabase-and-admin-wiring` and/or `claude/s02-bug-audit-and-fixes` are merged, branch off `main`. Otherwise branch off `claude/s02-bug-audit-and-fixes` (S02's branch, which itself was off S01's branch). The S01 → S02 branch is **not** rebased; it's the parent.
5. Update this handoff `status: open` → `acknowledged` and commit that small update separately.

## Context (state of the repo at S02 close)

S01 (Opus 4.7, 2026-05-16 16:30–21:35 CEST): Supabase wiring, Drizzle persistence, calendar nav, invoice viewer, admin write paths, multi-agent protocol scaffolding (16 commits on `claude/supabase-and-admin-wiring`).

S02 (Opus 4.7, 2026-05-16 ~22:15–23:30 CEST): bug audit + 6 fix commits on `claude/s02-bug-audit-and-fixes` (status colours, dashboard today's arrivals/departures, cancellation deadline timezone, public booking form pre-fill, UUID handling, manual booking accounting). No new features.

Acceptance criteria: 12 ✅ / 2 ⚠️ / 5 ❌ — unchanged from S01 (S02 only fixed correctness of ✅ items).

## Items, in priority order

(Carried over from S01 → S02 handoff with minor edits. The boundaries and verification gates still apply.)

### 1. Stripe Checkout + webhook handlers + refund call

- **Why this slice:** completes acceptance criteria #3 + #6; makes the public "Pay & confirm" button do an actual payment.
- **Files involved:** `src/app/api/properties/[slug]/bookings/route.ts` (booking POST → return Stripe Checkout URL), `src/app/api/webhooks/stripe/route.ts` (verify signature, handle `checkout.session.completed` + `charge.refunded`), `src/app/api/bookings/[ref]/cancel/route.ts` (issue Stripe refund), `src/lib/stripe.ts`, `src/lib/db/queries.ts` (`createBooking` now accepts `status` / `paymentStatus` / `paidAmount` overrides — wire the public flow to start `pending` + `unpaid` + paidAmount = 0; the webhook flips it).
- **Pre-work the HUMAN must do first:**
  - Stripe test secret (`sk_test_...`), publishable key (`pk_test_...`), and webhook signing secret (`whsec_...`) in `.env.local`
  - Stripe CLI locally to forward webhook events to `localhost:3000/api/webhooks/stripe`
- **Boundaries:** don't touch email or cron. Don't touch admin pages beyond surfacing payment_intent fields if needed.
- **Verification gate:** end-to-end booking with `4242 4242 4242 4242` → Stripe Checkout succeeds → webhook flips booking to confirmed → admin sees it; cancel within deadline → Stripe refund issued.

### 2. Resend email integration + 6 missing templates + `email_log` writes

- **Why this slice:** completes #4 + partial #6.
- **Files involved:** `src/lib/email.ts` (replace `console.info`), `src/emails/*.tsx` (build 6 missing templates per prompt §11 — `payment-receipt`, `pre-arrival-reminder`, `post-stay-thankyou`, `cancellation-confirmation`, `invoice-email`, `admin-notification`, plus `components/email-header`, `email-footer`, `booking-detail-block`), `src/emails/i18n/{no,en}.ts` (expand), `src/lib/db/queries.ts` (`logEmail` helper writing to `email_log`).
- **Pre-work:** Resend free tier signup + `RESEND_API_KEY=re_...` in `.env.local`. For testing without a verified domain: use Resend's `onboarding@resend.dev`.
- **Boundaries:** don't touch Stripe or cron. Don't change admin pages. Templates fully parameterised per §18 rule 6.
- **Verification gate:** create a booking with your email → confirmation arrives. Cancel → cancellation arrives. Both render in NO + EN. Each send writes one row in `email_log`.

### 3. Room type CRUD + Physical room CRUD

- **Why this slice:** completes criterion #11; pure UI work, no provider keys needed.
- **Files involved:** new `/admin/rooms/new` page + form, new `/admin/rooms/[id]` edit page, modify `/admin/rooms/page.tsx` for edit buttons + "New room type", new admin API routes (`POST/PATCH/DELETE /api/admin/room-types` + same for `/api/admin/rooms`), new helpers in `queries.ts` (`createRoomType`, `updateRoomType`, `deleteRoomType`, similar for rooms).
- **Pre-work:** none — additive.
- **Boundaries:** don't touch booking, cleaning, pricing logic.
- **Verification gate:** create a room type via UI → appears in `/book/fjordview`. Edit base price → public reflects new price. Delete unused room type → gone everywhere.

### 4. Cron job real bodies

- **Why this slice:** completes §12 ops requirements.
- **Files involved:** `src/app/api/cron/daily/route.ts` (pre-arrival reminders, post-stay thank-you, cleaning generation), `src/app/api/cron/cleanup/route.ts` (stale pending cleanup).
- **Pre-work:** none for unit; full firing needs Vercel deployment.
- **Boundaries:** don't change email send logic itself (separate slice); just call helpers.
- **Verification gate:** invoke each route manually with `CRON_SECRET` → queries DB and acts. Confirm via `email_log` and booking state.

### 5. Multi-tenant verification

- **Why this slice:** completes #15.
- **Files involved:** `src/lib/db/seed.ts` + `scripts/seed-db.ts` (add a second demo property), then exercise admin pages as admin scoped to property A and verify property B's data is invisible.
- **Pre-work:** RLS test needs a second `admin_users` row tied to a different Supabase auth user.
- **Boundaries:** don't change RLS policies; just verify they work.
- **Verification gate:** SQL from admin A's JWT returns only property A's data. Admin pages render only A's data. postgres role sees both.

### 6. Auth-aware admin scoping

- **Why this slice:** required for real multi-tenant. Every admin page uses `env.defaultPropertySlug` today.
- **Files involved:** `admin/layout.tsx` + every admin page + admin API routes. Replace `getPropertyBySlug(env.defaultPropertySlug)` with a helper that resolves the signed-in admin's property via the Supabase session.
- **Pre-work:** flip `LOCAL_DEMO_MODE=false`; sign in as `bithun@ibithun.com` / `admin1`.
- **Boundaries:** preserve `LOCAL_DEMO_MODE=true` behaviour (bypass + env default).
- **Verification gate:** with `LOCAL_DEMO_MODE=false`, admin layout shows the signed-in admin's property, queries scope to that property's id.

## Recommended order

If the human says "what's next" without picking: still **Item 1 (Stripe)**, same reasoning as the S01 → S02 handoff. It makes the demo feel real and unblocks Item 2 (emails get triggered by webhook events).

## Bonus follow-ups S02 surfaced but didn't fix

These are not in the §19 acceptance criteria; pick up whenever it makes sense. None are urgent.

- **Manual booking server doesn't validate `paidAmount <= totalPrice`.** Trusted form, low impact, but worth a Zod refinement at some point.
- **`autoAssignRoom` silent null.** When all rooms of the type are booked, the new booking lands with `room_id = NULL`. Admin must reassign. Worth surfacing a "no rooms left of this type" warning at booking time on the admin manual flow.
- **Dashboard still missing "this week mini-calendar" and "revenue this month vs last month" per §13.** Both are nice-to-have polish, not acceptance criteria.

## Boundaries shared across all items

- Do NOT redo anything described in S01 entries 1–5 or S02's bug-audit summary.
- Do NOT rename, restructure, or relocate files in `_docs/`.
- Do NOT touch the open branches `claude/supabase-and-admin-wiring` or `claude/s02-bug-audit-and-fixes` — they're history-of-record until merged. Build on top.
- Branch from the latest `main` after both PRs merge. Until then: branch off `claude/s02-bug-audit-and-fixes`.
- When you finish: session summary in `_docs/agent-reports/<today>/` + follow-up handoff if anything remains.

## Open questions to surface to the human

- Which provider keys (Stripe / Resend) is the human ready to provide right now? That determines which slice is unblocked.
- Should S01's branch be PR'd + merged first, or should each subsequent branch keep stacking on top? Stacking gets harder past two layers.

## Progress update — Codex S02 — 2026-05-17T03:07:02+02:00

Codex picked up the audit-recommended architecture slice before provider-key work. Item 6, auth-aware admin scoping, is implemented in `codex/auth-aware-admin-scoping`: admin pages/API routes now resolve the active property from the signed-in Supabase admin user when `LOCAL_DEMO_MODE=false`, while preserving default-slug demo behavior when `LOCAL_DEMO_MODE=true`. Admin booking and invoice detail views/routes are property-scoped. `scripts/verify-schema.ts` now checks `public.current_property_id()`.

Remaining S02 queue: Stripe, Resend/templates/email log, room/physical room CRUD, cron bodies, and second-property multi-tenant verification.

## Progress update — Codex Stripe slice — 2026-05-17T13:16:14+02:00

Item 1, Stripe Checkout + webhook handlers + refund call, is implemented on `codex/stripe-checkout-webhooks`. Public booking now starts `pending`/`unpaid`, creates a Stripe Checkout Session, webhook `checkout.session.completed` confirms/marks paid and stores Stripe IDs, `charge.refunded` marks refunded, and cancellation issues a Stripe refund when a PaymentIntent exists. Verified with a real Stripe test Checkout payment (`4242`) and refund against local webhook forwarding.

Remaining S02 queue: Resend/templates/email log, room/physical room CRUD, cron bodies, and second-property multi-tenant verification.

## Progress update — Codex Resend slice — 2026-05-17T13:44:04+02:00

Item 2, Resend email integration + missing templates + `email_log` writes, is implemented on `codex/resend-email-log` at code commit `dc133a3`. The slice adds the full React Email template set, shared parameterized email components, NO/EN copy, Resend/local-demo send helper, `logEmail(...)`, checkout confirmation/receipt/admin-notification sends, and cancellation confirmation sends. Verified with TDD red/green tests, full local Node test set (19 pass), lint, build, DB schema verify, and a no-network DB smoke that wrote an `email_log` row.

Human input still needed for live delivery verification: choose/confirm the recipient inbox for a real booking/cancellation smoke. `.env.local` has a Resend-looking key and `EMAIL_FROM=onboarding@resend.dev`; no live email was intentionally sent during this slice.

Remaining S02 queue: room/physical room CRUD, cron bodies, and second-property multi-tenant verification.

## Live verification update — Codex Resend slice — 2026-05-17T13:52:00+02:00

After Bithun approved using `bithun@ibithun.com`, Codex ran a live Resend smoke on `codex/resend-email-log`: created test booking `FV-2026-0009`, sent confirmation, payment receipt, cancelled the booking, then sent cancellation confirmation. Resend returned sent message IDs for all three emails and `email_log` contains three matching `sent` rows for that booking.

## Follow-up update — Codex Resend slice — 2026-05-17T14:15:00+02:00

Bithun tested booking `FV-2026-0010` from `goldenbutter@gmail.com`. DB evidence: booking is confirmed/fully paid, admin notification to `bithun@ibithun.com` sent successfully, guest confirmation/receipt to `goldenbutter@gmail.com` logged `failed`. Root cause is sender configuration, not route logic: current `EMAIL_FROM=onboarding@resend.dev` can deliver to the Resend account inbox but not arbitrary customer inboxes until a sending domain is verified.

Codex also added owner-side cancellation notification support: cancellation now sends both guest `cancellation` and owner `admin_cancellation`. Verified by red/green tests, full local Node test set (20 pass), lint, build rerun pass, and `npm run db:verify`.

## Follow-up update — Codex invoice attachment — 2026-05-17T14:32:00+02:00

After Bithun confirmed guest/owner delivery works with verified `ibithun.com`, Codex added invoice PDF attachment support for payment receipt/invoice emails. The implementation generates a simple PDF invoice from booking/property/guest/room details and sends it as `invoice-<booking-ref>.pdf` through Resend attachments. Verified with red/green tests, full local Node test set (22 pass), lint, and build.

## Follow-up update — Codex professional invoice PDF — 2026-05-17T14:46:00+02:00

Bithun rejected the first receipt PDF as too plain. Codex replaced it with a professional admin-style invoice PDF layout using the same booking data: branded header, invoice reference, issued date, billed-to details, stay details, line items, VAT summary, total, payment status, cancellation text, and footer. Verified with red/green tests, full local Node test set (22 pass), lint, and build.
