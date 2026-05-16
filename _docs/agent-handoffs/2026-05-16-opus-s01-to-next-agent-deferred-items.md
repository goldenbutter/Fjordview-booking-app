---
from: opus (S01)
to: next-agent
date: 2026-05-16T20:50:00+02:00
topic: Deferred items after Supabase wiring + admin write paths
status: open
branch_at_handoff: claude/supabase-and-admin-wiring
read_first:
  - _docs/AGENT-PROTOCOL.md
  - _docs/agent-reports/2026-05-16-opus-s01-execution-summary.md
  - _docs/agent-reports/2026-05-16-opus-s01-pending-audit.md
---

# Handoff — deferred items after Opus S01

## Context

Session S01 (Opus 4.7, 2026-05-16 16:30–20:28 CEST) completed the Supabase activation, the Drizzle persistence layer, the calendar nav + invoice viewer, and the admin write paths. Full details in `_docs/agent-reports/2026-05-16-opus-s01-execution-summary.md`. Branch `claude/supabase-and-admin-wiring` carries 11 commits ahead of `main` and is ready to PR.

Twelve of nineteen prompt acceptance criteria are now fully met. The five remaining hard fails and two partials are all either provider-key-dependent or pure scope-blocked — none are gated by something Opus S01 could have done alone.

## Goal

Pick **one** of the items below, ship it as a focused branch + PR, and write your own session summary + handoff when done. Don't bundle multiple deferred items into one PR unless they share substantial code paths.

## Items, in priority order

### 1. Stripe Checkout + webhook handlers + refund call

- **Why this slice:** makes the public "Pay & confirm" button do an actual payment, completes acceptance criteria #3 + #6
- **Files involved:** `src/app/api/properties/[slug]/bookings/route.ts` (booking POST), `src/app/api/webhooks/stripe/route.ts` (webhook), `src/app/api/bookings/[ref]/cancel/route.ts` (refund), `src/lib/stripe.ts`, `src/lib/db/queries.ts` (modify `createBooking` to set initial status to `pending` instead of `confirmed`+`fully_paid`)
- **Pre-work the HUMAN must do first:**
  - Provide a Stripe test secret key (`sk_test_...`), publishable key (`pk_test_...`), and webhook signing secret (`whsec_...`) in `.env.local`
  - Install Stripe CLI locally to forward webhook events to `localhost:3000/api/webhooks/stripe`
- **Boundaries:** don't touch the email or cron work. Don't touch the admin pages. This is purely the Stripe wiring.
- **Verification gate:** end-to-end booking with `4242 4242 4242 4242` → Stripe Checkout succeeds → webhook flips booking to confirmed → admin sees it; then cancel within policy deadline → Stripe refund issued.

### 2. Resend email integration + 6 missing templates + `email_log` writes

- **Why this slice:** completes acceptance criteria #4, partial #6, and unblocks production sending later
- **Files involved:** `src/lib/email.ts` (replace console.info with real send), `src/emails/*.tsx` (build the 6 missing templates per prompt §11 — `payment-receipt`, `pre-arrival-reminder`, `post-stay-thankyou`, `cancellation-confirmation`, `invoice-email`, `admin-notification`, plus components/`email-header`, `email-footer`, `booking-detail-block`), `src/emails/i18n/{no,en}.ts` (expand from 3 strings to full set), `src/lib/db/queries.ts` (add `logEmail` helper that writes to `email_log` table)
- **Pre-work the HUMAN must do first:**
  - Sign up for Resend (free tier — 100/day, 3000/mo)
  - Add `RESEND_API_KEY=re_...` to `.env.local`
  - For testing without a verified domain, use Resend's default `onboarding@resend.dev` as `EMAIL_FROM`
- **Boundaries:** don't touch Stripe or cron. Don't change admin pages. The 6 templates should follow the parameterized pattern (`property`, `booking`, `guest` props — no hardcoded client names).
- **Verification gate:** create a booking with your email → confirmation email arrives. Cancel it → cancellation email arrives. Both should render correctly in both NO and EN. Each send should produce one row in `email_log`.

### 3. Room type CRUD + Physical room CRUD

- **Why this slice:** completes acceptance criterion #11; pure UI work, no provider keys needed
- **Files involved:** new `/admin/rooms/new` page + form, new `/admin/rooms/[id]` edit page, modify `/admin/rooms/page.tsx` to add edit buttons + a "New room type" button, new admin API routes (`POST/PATCH/DELETE /api/admin/room-types` + same for `/api/admin/rooms`), new query helpers in `queries.ts` (`createRoomType`, `updateRoomType`, `deleteRoomType`, similar for rooms)
- **Pre-work:** none — purely additive
- **Boundaries:** don't touch booking, cleaning, pricing logic. Just CRUD on `room_types` and `rooms` tables.
- **Verification gate:** create a new room type via the UI → appears in `/book/fjordview` room listing. Edit a room type's base price → public booking page reflects new price. Delete an unused room type → it's gone everywhere.

### 4. Cron job real bodies

- **Why this slice:** completes operational requirements from prompt §12; needs Vercel deployment to test end-to-end but logic can be unit-verified
- **Files involved:** `src/app/api/cron/daily/route.ts` (pre-arrival reminders, post-stay thank-you, cleaning task generation), `src/app/api/cron/cleanup/route.ts` (stale pending booking cleanup)
- **Pre-work:** none — but actual cron firing requires Vercel deployment
- **Boundaries:** don't change email send logic (separate slice); just call the existing helpers.
- **Verification gate:** invoke each route manually with the `CRON_SECRET` header → it queries the DB and acts. Confirm via `email_log` and `bookings` table state changes.

### 5. Multi-tenant verification

- **Why this slice:** completes acceptance criterion #15; sanity-check that the RLS + property_id scoping actually isolates tenants
- **Files involved:** `src/lib/db/seed.ts` (add a second demo property), `scripts/seed-db.ts` (insert it), then exercise the admin pages while signed in as an admin scoped to property A and verify property B's data is invisible
- **Pre-work:** none for the seed; for the actual RLS test, requires creating a second `admin_users` entry tied to a different Supabase auth user
- **Boundaries:** don't change RLS policies — they're already in the migration. Just verify they work.
- **Verification gate:** SQL queries from the perspective of admin A's JWT return only property A's data. Admin pages render only property A's data. Direct SQL from the postgres role (bypassing RLS) shows both properties.

### 6. Auth-aware admin scoping

- **Why this slice:** required for true multi-tenant production. Currently every admin page uses `env.defaultPropertySlug` which is a global default — fine for single-property prototype, wrong for multi-tenant.
- **Files involved:** all admin pages + `admin/layout.tsx`. Replace `getPropertyBySlug(env.defaultPropertySlug)` with a helper that resolves the current admin's property via the Supabase session.
- **Pre-work:** flip `LOCAL_DEMO_MODE=false` in `.env.local` for testing; sign in as `bithun@ibithun.com` / `admin1`.
- **Boundaries:** don't change `LOCAL_DEMO_MODE=true` behaviour (still bypasses auth + uses the env default).
- **Verification gate:** while `LOCAL_DEMO_MODE=false`, the admin layout shows the signed-in admin's property name (not the env default), and admin queries scope to that property's id.

## Recommended order

If the human asks "what's next" without picking, suggest **Item 1 (Stripe)** as the highest-impact slice. It makes the demo feel real (an actual payment flow). It also unblocks Item 2 (emails get triggered by Stripe webhook events).

## Boundaries shared across all items

- Do NOT redo anything described in `2026-05-16-opus-s01-execution-summary.md` Entries 1–4.
- Do NOT rename, restructure, or relocate files in `_docs/`.
- Do NOT touch `claude/supabase-and-admin-wiring` — that branch is the source of truth for what's already merged.
- Branch from the latest `main` after the existing PR merges. Use `codex/<topic>` or `claude/<topic>` per `AGENT-PROTOCOL.md`.
- When you finish: write your own session summary in `_docs/agent-reports/` and write a follow-up handoff if there are items to pass along.

## Open questions to surface to the human

- Which provider keys (Stripe / Resend) is the human ready to provide right now? That determines which slice is unblocked.
- Does the human want each slice as a separate PR (recommended for review clarity) or bundled?
