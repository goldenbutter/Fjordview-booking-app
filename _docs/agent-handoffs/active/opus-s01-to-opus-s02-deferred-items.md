---
from: opus (S01)
to: opus-s02
date: 2026-05-16T20:50:00+02:00
topic: Kickoff + deferred items after Supabase wiring + admin write paths
status: acknowledged
date_acknowledged: 2026-05-16T22:15:00+02:00
branch_at_handoff: claude/supabase-and-admin-wiring
read_first:
  - _docs/AGENT-PROTOCOL.md
  - _docs/adr/0001-multi-agent-coordination-protocol.md
  - _docs/adr/0002-folder-structure-for-reports-and-handoffs.md
  - _docs/adr/0003-context-budget-self-management.md
  - _docs/agent-reports/2026-05-16/opus-s01-execution-summary.md
  - _docs/agent-reports/2026-05-16/opus-s01-pending-audit.md
---

## Scope amendment 2026-05-16T22:15 (S02 acknowledging)

Bithun's actual ask for S02 is **not** one of items 1–6 below. Between S01 closing out and S02 starting, the user reopened S01 and asked it to do a comprehensive prompt-acceptance-criteria crosscheck — they suspect ~10 unsurfaced bugs S01 missed. S01 crashed (repeated 500 errors) before producing the audit.

**S02 is therefore taking on a 7th item ahead of 1–6: a bug audit of the existing implementation against `_docs/_prompt/guesthub-booking-system-dev-prompt.md` §19, fixing what it finds.**

Items 1–6 below remain valid and unblocked. They are now S03's queue.

Branch: `claude/s02-bug-audit-and-fixes` (off `claude/supabase-and-admin-wiring`, since S01's PR is not yet merged).

# Kickoff + deferred items — Opus S01 → Opus S02

## How to use this file

You are Opus session **S02**. This handoff is your full kickoff brief. The user pointed you here with a one-liner; everything you need is below.

When you start: update this file's `status: open` → `status: acknowledged` and add a `date_acknowledged:` field in the YAML frontmatter. When you finish (or stop and pass along to S03): set `status: completed`, add `date_completed:` + `final_commit:`, and **move this file** from `active/` to `archive/<today>/` per the protocol. If items remain, write a follow-up handoff (`opus-s02-to-opus-s03-*.md` or `opus-s02-to-next-agent-*.md`).

## Bootstrap checklist (do these in order)

1. **Read the docs listed in `read_first:` above.** Protocol + ADRs first (~10 minutes), then S01 summary (~10 minutes). Don't skip — you will absolutely redo something S01 already shipped if you do.
2. **Verify your branch.** Run `git branch --show-current`. You should be on `claude/<your-topic>` once you start work — **never** commit on a `codex/*` branch even if you accidentally land on one. (S01 made this mistake near the end and had to fix it via `git branch -f`. You can avoid it entirely by always running the check before committing.)
3. **Confirm where `main` is.** If S01's PR (`claude/supabase-and-admin-wiring`) is merged: branch your new work off `main`. If not yet merged: branch off `claude/supabase-and-admin-wiring` directly so you build on top of S01's work.
4. **Update this handoff's `status:` to `acknowledged`.** Commit that small update separately so the history is clean.

## Context (state of the repo)

Session S01 (Opus 4.7, 2026-05-16 16:30–21:35 CEST) completed the Supabase activation, the Drizzle persistence layer, the calendar nav + invoice viewer, the admin write paths, and the multi-agent coordination scaffolding (AGENT-PROTOCOL.md + ADRs 0001–0003 + folder restructure + `.claude/`/`.codex/` conventions). Codex independently added ADR 0004 documenting their parallel `.codex/` setup. Full session details: `_docs/agent-reports/2026-05-16/opus-s01-execution-summary.md` (5 entries).

Twelve of nineteen prompt acceptance criteria are now fully met. The five remaining hard fails and two partials are all either provider-key-dependent or scope-blocked — none are gated by something S01 could have done alone.

`claude/supabase-and-admin-wiring` carries 16 commits ahead of `main` and is ready to PR.

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
