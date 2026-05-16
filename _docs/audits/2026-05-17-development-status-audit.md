# Development Status Audit — 2026-05-17

> **Auditor:** Codex audit session  
> **Branch:** `codex/development-status-audit`  
> **Scope:** Compare `_docs/_prompt/guesthub-booking-system-dev-prompt.md` against merged implementation on `main` (`5809bd8`) plus all agent reports/handoffs present on disk. No source changes made.  
> **Time:** 2026-05-17 00:25 CEST  
> **Context bucket:** Green, estimated under 30% of Codex 250k window.

## Executive Summary

The repo is substantially beyond a static prototype: it now has a Next.js app, Drizzle schema/migration, Supabase-backed reads/writes, admin pages, booking creation, cancellation DB state updates, invoice viewer, reports, rate limiting on two public endpoints, and RLS policies in the live database.

The latest audited status from Opus S02 remains accurate: **12 of 19 acceptance criteria are achieved, 2 are partial, and 5 are pending**. My code-level spot check did not find evidence that the pending criteria were completed after S02. The largest remaining gaps are still Stripe, Resend/email logging/templates, room CRUD, pricing CRUD, multi-tenant verification/auth-aware scoping, and real cron bodies.

Verification run in this audit:

| Command | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run build` | Pass, 24 static pages; one Recharts sizing warning during build output |
| `npm run db:verify` | Pass for 10 RLS-enabled tables, 10 policies, 7 indexes, 1 migration; script still reports `auth.property_id() exists: NO` |
| `npx dotenv -e .env.local -- tsx scripts/verify-rls.ts` | Pass for current admin: `public.current_property_id()` returned the expected property id |

## Evidence Base

Primary plan:

- `_docs/_prompt/guesthub-booking-system-dev-prompt.md`
- Planned development phases: lines 1020-1066
- Critical rules: lines 1070-1088
- Acceptance criteria: lines 1094-1114

Prior reports and handoffs:

- `_docs/agent-reports/2026-05-16/opus-s01-execution-summary.md`
- `_docs/agent-reports/2026-05-16/opus-s02-bug-audit-and-fixes.md`
- `_docs/agent-handoffs/active/opus-s02-to-next-agent-deferred-items.md`

Current implementation evidence:

- `src/app/api/properties/[slug]/bookings/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/bookings/[ref]/cancel/route.ts`
- `src/lib/email.ts`
- `src/app/api/cron/daily/route.ts`
- `src/app/api/cron/cleanup/route.ts`
- `src/app/admin/rooms/page.tsx`
- `src/app/admin/pricing/page.tsx`
- `src/app/admin/layout.tsx`
- `scripts/verify-schema.ts`

## Acceptance Criteria Status

| # | Prompt acceptance criterion | Status | Audit finding |
|---:|---|---|---|
| 1 | Guest can browse rooms and see availability for selected dates | Achieved | Public room and availability routes exist; S01/S02 browser/API checks reported success. |
| 2 | Prices reflect base + seasonal + day-of-week rules correctly | Achieved | Pricing engine and availability integration exist; S01 reports verified priced availability. |
| 3 | Guest completes booking → pays via Stripe test checkout → gets confirmation email | Pending | Booking POST still returns `mode: "local-demo"` and a local `/booking/...` URL (`src/app/api/properties/[slug]/bookings/route.ts:80-85`). No checkout session creation. |
| 4 | Confirmation email renders in both Norwegian and English | Pending | Only `booking-confirmation.tsx` exists under `src/emails`; `src/lib/email.ts` sends plain text and does not write `email_log`. |
| 5 | Guest can view booking via self-service link | Achieved | Self-service route/page exists and S01/S02 reports verified persisted lookup and UUID/ref fixes. |
| 6 | Guest can cancel within policy → Stripe refund issued → cancellation email sent | Partial | Cancellation enforces email/policy and updates DB; cancel route still returns `mode: "local-demo"` and no Stripe refund or cancellation email is wired (`src/app/api/bookings/[ref]/cancel/route.ts:45-47`). |
| 7 | Admin logs in → dashboard shows arrivals, departures, occupancy, revenue | Achieved with caveat | Dashboard content exists and S02 fixed arrivals/departures; auth guard exists, but admin pages still resolve `env.defaultPropertySlug` instead of signed-in admin property. |
| 8 | Admin can list, filter, search bookings | Achieved | S01 Entry 4 and current API/page support filters/search. |
| 9 | Admin can create a manual booking | Achieved | `/admin/bookings/new` and `POST /api/admin/bookings` exist; S02 fixed unpaid aggregate accounting. |
| 10 | Admin sees occupancy calendar | Achieved | Calendar page/API exist; S01/S02 report verification. |
| 11 | Admin can manage room types and physical rooms | Pending | `src/app/admin/rooms/page.tsx` is read-only inventory; no admin room/room-type CRUD routes. |
| 12 | Admin can add/edit pricing rules and preview effective price | Partial | Preview exists; `src/app/admin/pricing/page.tsx` lists rules but has no CRUD/write routes. |
| 13 | Admin sees cleaning tasks for today | Achieved | Cleaning page and status update API exist; S01/S02 report status cycling. |
| 14 | Admin can view occupancy and revenue reports | Achieved | Reports page and CSV export route exist; S01 reports real chart and CSV export. |
| 15 | All data scoped to `property_id` (add second demo property, verify isolation) | Pending | Query layer generally filters by property id and DB RLS is enabled, but seed has only one property and no second-tenant verification has been performed. |
| 16 | Booking flow works on mobile phone | Achieved by prior browser check | Reported in Codex/Opus checks; not re-browser-tested in this audit. |
| 17 | Admin dashboard works on tablet | Achieved by prior browser check | Reported in Codex/Opus checks; not re-browser-tested in this audit. |
| 18 | No hardcoded property names, colors, or contact info anywhere in code | Achieved with narrow caveat | Runtime references appear confined to seed/default/demo docs. `package.json` and `README.md` still use Fjordview branding, previously judged acceptable for prototype repo/docs. |
| 19 | `.env.example` and `MIGRATION.md` complete and accurate | Achieved with caveat | Present and tracked. `scripts/verify-schema.ts` still checks old `auth.property_id()` even though migration uses `public.current_property_id()`. |

**Current score:** **12 achieved / 2 partial / 5 pending**.

## Phase Completion

| Prompt phase | Planned items | Achieved | Partial | Pending |
|---|---:|---:|---:|---:|
| Phase 1 — Foundation | 8 | 8 | 0 | 0 |
| Phase 2 — Booking Engine | 7 | 4 | 1 | 2 |
| Phase 3 — Emails + Guest Self-Service | 6 | 1 | 1 | 4 |
| Phase 4 — Admin Dashboard | 8 | 6 | 1 | 1 |
| Phase 5 — Reports + Polish | 9 | 5 | 2 | 2 |

Detailed interpretation:

- **Phase 1:** Complete. App scaffold, dependencies, Drizzle schema/migration, seed scripts, auth guard, `.env.example`, and `MIGRATION.md` exist.
- **Phase 2:** Availability, guest booking UI, booking ref, room assignment, and self-service success path exist. Stripe Checkout/session creation and webhook behavior remain pending. Room assignment currently happens at booking create time because the public flow skips Stripe pending state.
- **Phase 3:** Guest self-service exists. Cancellation DB logic is partial. Resend email delivery, full React Email template set, `email_log`, cancellation email, admin notification, reminders, and thank-you templates remain pending.
- **Phase 4:** Admin layout, dashboard, booking list/detail/manual create, calendar, guests, cleaning, settings property update, reports, invoice viewer are present. Room CRUD is pending. Pricing CRUD is partial because preview exists but rule editing is absent.
- **Phase 5:** Reports, CSV export, invoice generation/view/print, input validation on several API routes, RLS schema, and public endpoint rate limiting are present. Cron bodies are stubs. RLS verification is partial because only one property exists and no second-tenant isolation test was run.

## Planned vs Achieved Count

Using the prompt's 38 phase checklist items:

- **Achieved:** 24
- **Partial:** 5
- **Pending:** 9

Pending or partial items:

1. Stripe Checkout session creation.
2. Stripe webhook handler for `checkout.session.completed` and `charge.refunded`.
3. Confirmation/cancellation React Email templates in both NO and EN beyond the one skeletal confirmation file.
4. Resend send functions with `email_log` tracking.
5. Guest cancellation flow issuing Stripe refund and sending cancellation email.
6. Admin notification on new booking.
7. Pre-arrival reminder and post-stay thank-you templates.
8. Room type CRUD + physical room CRUD + photo upload.
9. Pricing rule CRUD.
10. Cron bodies for reminders, thank-you, cleaning generation, and stale pending cleanup.
11. Full loading/error boundary pass.
12. RLS isolation test with a second property/admin user.

## Security And Standards Notes

No critical credential leak was found in tracked files. `.env.local` is ignored by `.gitignore`, and `git ls-files` shows only `.env.example` and `.gitignore` are tracked from env files.

Findings and risks:

| Severity | Area | Finding |
|---|---|---|
| High | Payments | Stripe webhook endpoint verifies signature through `constructStripeEvent`, but only acknowledges events. Until it mutates booking/payment state, payment acceptance is not real. |
| High | Multi-tenant admin scoping | `LOCAL_DEMO_MODE=false` protects `/admin/*` with Supabase Auth, but admin pages/routes still use `env.defaultPropertySlug` instead of resolving the signed-in admin's property. This is the largest real multi-tenant gap. |
| High | RLS verification | RLS exists in DB, but app server uses direct Postgres service credentials through Drizzle, so app-layer `propertyId` scoping is the effective guard for most routes. A second-property test is still required. |
| Medium | Cron authorization | Cron routes return success if `CRON_SECRET` is unset. This is developer-friendly but should be treated as unsafe for deployed environments. |
| Medium | Email auditability | `email_log` table exists but has 0 rows and no helper writes. The prompt requires send success/failure tracking. |
| Medium | Rate limiting | In-memory rate limiting is applied to availability and booking creation only. It is not durable across serverless instances and is absent from self-service cancellation/login/admin APIs. |
| Low | Verification script accuracy | `scripts/verify-schema.ts` checks for `auth.property_id()` even though accepted implementation uses `public.current_property_id()`. This creates a false negative in `db:verify`. |
| Low | Build warning | `npm run build` emits a Recharts width/height warning. Build still passes, but reports chart layout should be browser-checked. |

## Current Open Handoff

The active handoff `_docs/agent-handoffs/active/opus-s02-to-next-agent-deferred-items.md` is still valid. It lists the correct six priority slices:

1. Stripe Checkout + webhook handlers + refund call.
2. Resend email integration + six missing templates + `email_log` writes.
3. Room type CRUD + physical room CRUD.
4. Cron job real bodies.
5. Multi-tenant verification.
6. Auth-aware admin scoping.

My audit adds two recommended small corrections around that work:

1. Fix `scripts/verify-schema.ts` to validate `public.current_property_id()` instead of `auth.property_id()`.
2. Consider splitting auth-aware admin scoping ahead of multi-tenant verification, because the current admin UI still resolves from `DEFAULT_PROPERTY_SLUG`.

## Recommended Next Implementation Order

1. **Auth-aware admin scoping + second-property verification.** This closes the highest architectural risk before more admin write paths are added.
2. **Stripe Checkout + webhook + refund.** This moves acceptance #3 and #6 from pending/partial toward complete.
3. **Resend/templates/`email_log`.** This completes #4 and the email half of #3/#6.
4. **Room and pricing CRUD.** This closes #11 and #12.
5. **Cron bodies.** Best after email helpers exist, because reminders and thank-you jobs depend on them.

## Bottom Line

The project is roughly **65% demo-ready by acceptance criteria** and **about 63% complete by phase checklist count**. The completed work is meaningful and verified by lint/build/DB checks, but the remaining 35-40% includes the hardest production-facing pieces: real payment state, real email lifecycle, real multi-tenant admin scoping, and CRUD for configuration data.
