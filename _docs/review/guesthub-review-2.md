# GuestHub Prototype — Review #2 (Cross-Verification vs Dev Prompt)

> **Reviewer:** Claude (Opus 4.7) — independent cross-verification
> **Date:** 2026-05-16
> **Branch reviewed:** `claude/review-booking-requirements-CHmKo` (HEAD `fd33cb2`)
> **Reference prompt:** `_docs/_prompt/guesthub-booking-system-dev-prompt.md`
> **Scope:** Section-by-section audit of the entire codebase against the prompt's 19 sections plus the Section 18 critical rules and Section 19 acceptance criteria.
> **Verdict:** **△ Partial foundation only — ~30% of acceptance criteria met.** The local demo runs and the business logic (pricing engine, availability, booking ref) is correct. But the production wiring required by the prompt — Stripe Checkout, webhook handling, real emails, admin auth, admin CRUD, DB migrations, RLS — is either stubbed or absent. Several Section 18 "critical rules" are violated.

---

## 0. How to read this review

For each prompt section I list findings as:

- ✓ **Met** — implemented as specified
- △ **Partial** — present but stubbed, mocked, or incomplete
- ✗ **Missing / Violated** — required by the prompt but absent, or actively breaks a rule

Every finding cites `file:line` so Codex can jump straight to it.

---

## 1. Tech stack (prompt §2)

**Status: ✓ Met.** All required libraries are in `package.json`. Versions are modern (Next.js 16, React 19, Drizzle 0.45, Stripe 22, Resend 6, Zod 4). Note: the prompt says "Next.js 14+" — Next 16 is fine, but the project's own `AGENTS.md` warns *"This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing code."* Verify nothing in `_docs/` is using deprecated 14/15-era APIs (route handler signatures, `cookies()` await semantics, etc.). I did not see obvious violations.

---

## 2. Database schema (prompt §4) — ✗ Major gaps

**File:** `src/lib/db/schema.ts`

### Tables declared in Drizzle

| Prompt table | Present? | Evidence |
|---|---|---|
| `properties` | ✓ | `schema.ts:13-34` |
| `room_types` | ✓ | `schema.ts:36-50` |
| `rooms` | ✓ | `schema.ts:52-60` |
| `pricing_rules` | ✓ | `schema.ts:62-76` |
| `guests` | ✗ **Missing** | not declared |
| `bookings` | ✗ **Missing** | not declared |
| `cancellation_policies` | ✗ **Missing** | not declared |
| `cleaning_tasks` | ✗ **Missing** | not declared |
| `email_log` | ✗ **Missing** | not declared |
| `admin_users` | ✗ **Missing** | not declared |

6 of 10 tables required by §4 are not in the Drizzle schema at all. They exist only as in-memory TypeScript arrays in `src/lib/db/seed.ts`.

### Other §4 requirements

- ✗ **No `drizzle/migrations/` directory exists.** The schema has never been pushed. The prompt's §17 Phase 1 step explicitly requires *"Drizzle schema matching Section 4, generate + push migrations to Supabase."*
- ✗ **No SQL indexes** — prompt §4 lists 7 required indexes (`idx_bookings_availability`, etc.). None are declared.
- ✗ **No RLS policies** — prompt §4 specifies `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + `auth.property_id()` helper + policies per table. None exist.
- ✗ **No DB client** — `src/lib/db/index.ts` does not exist; nothing imports a live Drizzle client.
- △ `properties` table also missing `stripe_account_id` column (prompt §4 line 110).

**Impact:** The prompt's central architectural principle ("Multi-tenant from day one … every RLS policy scopes to it") is unenforced. Until tables and RLS land, the multi-tenant guarantee in §18.3 cannot be tested.

---

## 3. Availability query (prompt §5) — △ Correct logic, wrong substrate

**File:** `src/lib/availability.ts`

- ✓ `rangesOverlap` at `availability.ts:5-7` mirrors `check_in < $check_out AND check_out > $check_in`.
- ✓ `getAvailableRoomTypes` filters by `propertyId`, `active`, excludes statuses `cancelled`/`no_show` (`availability.ts:18-23`).
- ✗ Implementation is **in-memory JavaScript** over `demoRooms`/`demoBookings`. The prompt's §5 LATERAL JOIN SQL is not used. Once the DB lands, this must be reimplemented as a real query, or the seed arrays must be backed by Drizzle reads.

---

## 4. Pricing engine (prompt §6) — ✓ Met

**File:** `src/lib/pricing.ts`

- ✓ `calculateNightlyPrice` (`pricing.ts:22-44`) filters active rules, sorts by `priority` descending, returns early on `priceOverride`, applies `modifierPct` with `Math.round` (integer math preserved per §18.2).
- ✓ `calculateStayPrice` (`pricing.ts:46-71`) iterates `checkIn..checkOut-1` via `eachDayOfInterval(start, subDays(end, 1))`, returns `{ nights, subtotal, currency }` matching §6.
- ✓ Review #1's pricing table (Sat × 1.15 + Sun base) matches expected output.

---

## 5. Booking reference generator (prompt §7) — ✓ Met

**File:** `src/lib/booking-ref.ts`

- ✓ Format `PREFIX-YYYY-NNNN` produced via `padStart(4, "0")`.
- ✓ Called from `src/app/api/properties/[slug]/bookings/route.ts:58` with the property's prefix.

---

## 6. Room auto-assignment (prompt §7) — △ Partial

**File:** `src/lib/availability.ts:46-62`

- ✓ Filters by `propertyId`, `roomTypeId`, `active`, excludes overlapping non-cancelled bookings.
- ✗ **Not least-recently-used.** Returns `available[0]` — first match, no sort. Prompt §7 explicitly requires *"Prefer least-recently-used room (spread wear evenly)"* with the LRU sort given in lines 426-434. Codex must add the sort or rooms will get used unevenly once volume grows.

---

## 7. API routes (prompt §8) — ✗ Most admin routes missing

### Public routes

| Route | Method | Present | Notes |
|---|---|---|---|
| `/api/properties/[slug]/rooms` | GET | ✓ | `route.ts:4-17` — returns seed; **no Zod validation of slug** |
| `/api/properties/[slug]/availability` | GET | ✓ | `route.ts:6-35` — rate-limited (60/min), manual validation, no Zod |
| `/api/properties/[slug]/bookings` | POST | △ | `route.ts:8-104` — Zod schema ✓, rate-limited (12/min) ✓, but **does NOT create a Stripe Checkout Session**; returns a local URL (`route.ts:101`) |
| `/api/bookings/[ref]` | GET | ✓ | `route.ts:4-29` — no Zod on email query |
| `/api/bookings/[ref]/cancel` | POST | △ | `route.ts:5-32` — Zod ✓; **mocks the refund** (no Stripe call, no email) |
| `/api/webhooks/stripe` | POST | △ | Signature verification ✓ (see §10 below); **no `checkout.session.completed` or `charge.refunded` handler** |

### Admin routes (prompt §8 admin block)

| Route | Required | Present |
|---|---|---|
| `GET /api/admin/dashboard` | ✓ | ✓ |
| `GET /api/admin/bookings` | ✓ | ✓ (no filter/search/paginate logic) |
| `GET /api/admin/bookings/[id]` | ✓ | ✗ |
| `POST /api/admin/bookings` | ✓ (manual) | ✗ |
| `PATCH /api/admin/bookings/[id]` | ✓ | ✗ |
| `DELETE /api/admin/bookings/[id]` | ✓ | ✗ |
| `GET /api/admin/calendar` | ✓ | ✓ |
| `GET /api/admin/guests` | ✓ | ✗ |
| `GET /api/admin/guests/[id]` | ✓ | ✗ |
| CRUD `/api/admin/room-types` | ✓ | ✗ |
| CRUD `/api/admin/rooms` | ✓ | ✗ |
| CRUD `/api/admin/pricing-rules` | ✓ | ✗ |
| `GET /api/admin/cleaning` | ✓ | ✗ |
| `PATCH /api/admin/cleaning/[id]` | ✓ | ✗ |
| `GET /api/admin/reports/occupancy` | ✓ | ✗ |
| `GET /api/admin/reports/revenue` | ✓ | ✗ |
| `GET /api/admin/reports/sources` | ✓ | ✗ |
| `POST /api/admin/invoices/[bookingId]` | ✓ | ✓ |
| `POST /api/admin/emails/resend/[logId]` | ✓ | ✗ |

**Score:** 4 of 19 admin endpoints present. There is also a generic CSV export at `src/app/api/admin/reports/export/route.ts`, but the per-report endpoints from the prompt do not exist.

---

## 8. Guest booking flow (prompt §9) — △ UI works, payment is fake

- ✓ `/book/[slug]` page, date picker, room cards, guest form, summary are present (`src/app/(public)/book/[slug]/page.tsx`, `src/components/booking/booking-flow.tsx`).
- ✗ Step 7 of §9 says *"`POST /api/properties/[slug]/bookings` → returns Stripe Checkout URL → redirect"*. Current code skips Stripe entirely and writes the booking to `localStorage` (`booking-flow.tsx:127-128`), then redirects to a local success URL. The webhook never fires because no real session was created.
- ✗ Step 9 side effects (set status, auto-assign room, send confirmation, create cleaning task, update guest totals, admin notification) — none happen, because nothing actually triggers them.
- ✓ `/booking/[ref]` self-service page exists with ref+email lookup.

---

## 9. Stripe integration (prompt §10) — ✗ Not connected

**Files:** `src/lib/stripe.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/app/api/properties/[slug]/bookings/route.ts`, `src/app/api/bookings/[ref]/cancel/route.ts`

- ✓ Keys read from env only (`stripe.ts:4-7`, `env.ts:5-6`). No hardcoded secrets.
- ✓ Webhook signature verification is mandatory in non-demo mode (`stripe.ts:24-25`: throws on missing signature; uses `stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret)` on line 27). Complies with §18.5.
- ✗ **No Checkout Session creation.** The booking POST returns a hand-rolled local URL instead of calling `stripe.checkout.sessions.create(...)` per §10 lines 520-544.
- ✗ **No webhook event handlers.** `webhooks/stripe/route.ts:9-20` constructs the event, then immediately returns `{ received: true, eventType }`. Neither `checkout.session.completed` nor `charge.refunded` are processed. Prompt §10 lines 556-571 require both.
- ✗ **No refund.** Cancellation route returns a *calculated* refund amount but never calls `stripe.refunds.create({...})`. Prompt §10 lines 589-594 require it. `policy.deadline_hours` is also not enforced server-side.

---

## 10. Email system (prompt §11) — ✗ Single stub template

**Files:** `src/lib/email.ts`, `src/emails/`

- ✗ Templates present: **1 of 7** required.
  - ✓ `booking-confirmation.tsx` — exists, but is 22 lines, plain `<div>`, no React Email components, no header/footer/detail block.
  - ✗ Missing: `payment-receipt`, `pre-arrival-reminder`, `post-stay-thankyou`, `cancellation-confirmation`, `invoice-email`, `admin-notification`, and the three `components/` sub-templates (`email-header`, `email-footer`, `booking-detail-block`).
- △ i18n: `src/emails/i18n/no.ts` and `en.ts` exist but each contain only 3 strings, and the existing template doesn't import them.
- ✗ `email_log` table writes — prompt §11 line 660 says *"Log to email_log table (success or failure)"*. Code in `email.ts:14-43` logs to `console.info` in demo mode and returns `{ status }` in live mode, but never writes to a `email_log` row (the table doesn't exist in Drizzle anyway — see §2).
- ✓ Parameterization is correct in `email.ts` (`payload.property.name`, `payload.guest.email`, `payload.booking.language`). No "Fjordview" in the template itself.

---

## 11. Cron jobs (prompt §12) — △ Schedule correct, bodies empty

**File:** `vercel.json`, `src/app/api/cron/{daily,cleanup}/route.ts`

- ✓ Two crons declared at `0 8 * * *` and `*/30 * * * *` — fits Vercel Hobby's 2-job ceiling.
- ✓ Both routes check `CRON_SECRET` via the `authorized()` helper.
- ✗ Both routes are **stubs** — they return `{ mode: "local-demo", jobs: [...], status: "logged" }` and do no DB work. None of pre-arrival reminders, post-stay thank-yous, cleaning generation, or stale-pending cleanup actually runs.

---

## 12. Admin dashboard (prompt §13) — △ Shells without content

- ✓ Sidebar lists all 10 pages (`src/app/admin/layout.tsx:18-29`). "Invoices" page is an addition beyond the prompt.
- ✓ Pages exist for every sidebar item (`src/app/admin/{dashboard,bookings,calendar,guests,rooms,pricing,cleaning,reports,invoices,settings}/page.tsx`).
- ✗ **No auth guard.** Layout shows a static "Signed in as" string (`layout.tsx:63`), but there is no middleware, no Supabase session check, no redirect to login, no `/login` page. `/admin/*` is publicly accessible.
- ✗ Most admin pages are read-only views of the seed arrays. Manual booking creation, room type CRUD, pricing rule CRUD, cleaning status cycling, settings editing — none of the write paths are wired.

---

## 13. Auth (prompt §17 Phase 1) — △ Deferred until Supabase is provisioned

**Reviewer note from the project owner:** auth is intentionally not implemented yet because the Supabase project hasn't been set up. So the items below are not bugs — they are pending work that will land alongside the Supabase wiring in §2.

- Pending: `/login` page.
- Pending: `middleware.ts` enforcing auth on `/admin/*`.
- △ `src/lib/auth.ts` already constructs a Supabase server client when env vars exist; once Supabase is live, callers need to check the session and join to `admin_users` to resolve `property_id`.

Codex should bundle this with the Drizzle migrations + RLS work (P0 #1 and #5 below), not treat it as a separate fix.

---

## 14. Critical rules (prompt §18) — Mixed compliance

| # | Rule | Status |
|---|---|---|
| 1 | No client names in code | ✗ Violated. See findings below. |
| 2 | All prices in smallest currency unit (integer) | ✓ `pricing.ts:38` uses `Math.round`; `utils.ts:16` divides only for display. |
| 3 | Every DB query includes `property_id` | ✓ Seed queries do; no real DB queries exist yet to test. |
| 4 | Stripe keys from env only | ✓ `stripe.ts`, `env.ts`. |
| 5 | Webhook signature verification mandatory | ✓ `stripe.ts:24-27`. |
| 6 | Email templates parameterized | ✓ For the one template that exists. |
| 7 | Test on free tiers / no Pro-only features | ✓ Two crons, no `pg_cron`, no Pro features. |
| 8 | Norwegian locale (DD.MM.YYYY, NOK, nb) | ✓ `utils.ts:3,11,19-21` uses `nb` and `nb-NO`. (Review #1 flagged the date picker still showing MM/DD — needs verification it was fixed.) |
| 9 | Two languages (no + en) | △ Seed data and templates support both; most guest-facing UI strings appear English-only (component `booking-flow.tsx` not internationalized). |
| 10 | Git hygiene | ✓ `.env.local` and `.env*.local` are gitignored; `.env.example` is committed with placeholders. |

### §18.1 — Hardcoded "Fjordview" outside the seed

The seed file is allowed to contain "Fjordview Lodge" (it is the demo property). Everywhere else is a violation. Found:

- `src/app/layout.tsx:16` — `<title>Fjordview Lodge Booking</title>` in root metadata.
- `src/app/admin/layout.tsx:67` — `href="/book/fjordview"` hardcoded link.
- `src/components/booking/booking-flow.tsx:127-128` — `localStorage.setItem("fjordview-bookings", …)`.
- `src/components/booking/booking-self-service.tsx:50` — same `localStorage.getItem("fjordview-bookings")` key.
- `src/components/booking/booking-flow.tsx:161` — `alt="Fjordview Lodge"`.
- `src/app/api/admin/reports/export/route.ts:34` — `Content-Disposition: attachment; filename=fjordview-booking-report.csv`.

All of these must be parameterized off the property record or `DEFAULT_PROPERTY_SLUG` (env). The CSV filename should derive from `property.slug`.

---

## 15. Acceptance criteria (prompt §19) — 6 of 19 met

| # | Criterion | Status |
|---|---|---|
| 1 | Guest can browse rooms and see availability for selected dates | ✓ |
| 2 | Prices reflect base + seasonal + day-of-week rules correctly | ✓ |
| 3 | Guest completes booking → pays via Stripe test checkout → gets confirmation email | ✗ Stripe + email both stubbed |
| 4 | Confirmation email renders in both NO and EN | △ Template too thin |
| 5 | Guest can view booking via self-service link (ref + email) | ✓ |
| 6 | Guest can cancel within policy → Stripe refund → cancellation email sent | ✗ All three pieces stubbed |
| 7 | Admin logs in → dashboard shows arrivals, departures, occupancy, revenue | △ Dashboard exists, no login |
| 8 | Admin can list, filter, search bookings | △ List only, no filter/search backend |
| 9 | Admin can create a manual booking (walk-in) | ✗ |
| 10 | Admin sees occupancy calendar (rooms × dates grid) | ✓ (per Review #1 BUG-1, the grid had phantom data — verify the fix) |
| 11 | Admin can manage room types and physical rooms | ✗ |
| 12 | Admin can add/edit pricing rules and preview effective price | ✗ |
| 13 | Admin sees cleaning tasks for today | △ Read-only view of seed |
| 14 | Admin can view occupancy and revenue reports | △ CSV export only, no per-report endpoints |
| 15 | All data scoped to property_id (verify with second demo property) | △ Trivially true with seed; untested under real DB |
| 16 | Booking flow works on mobile phone | ✓ |
| 17 | Admin dashboard works on tablet | ✓ |
| 18 | No hardcoded property names, colors, or contact info anywhere in code | ✗ See §14.1 findings |
| 19 | `.env.example` and `MIGRATION.md` are complete and accurate | ✓ |

**Score:** 6 ✓ / 7 △ / 6 ✗ → ~30% fully met.

---

## 16. Status of Review #1 follow-ups

Review #1 (`guesthub-review-1.md`) flagged four issues. The agent-report at `_docs/agent-reports/2026-05-16-opus-review-1-fixes.md` claims they were addressed, but the on-disk evidence is mixed — Codex should re-verify each:

- **BUG-1 (calendar phantom bookings):** Calendar API exists at `src/app/api/admin/calendar/route.ts`. Spot-check that it returns only the two seeded bookings and the page renders that, not mock data.
- **BUG-2 (date format):** Confirm the booking date picker uses `format(..., "dd.MM.yyyy", { locale: nb })` and not the default `MM/dd/yyyy`.
- **BUG-3 (pluralization):** Search booking-flow / room-card for `guests` strings and verify singular/plural branching for `maxGuests === 1`.
- **UI-1 (empty hero):** Confirm `book/[slug]` does not render a gray block when `photo_urls` is empty.

---

## 17. Code-quality smells worth fixing

- `src/lib/db/index.ts` is missing entirely. Once Drizzle migrations exist, this file should export a configured client.
- `seed.ts` exports const arrays instead of running an insert script. The `npm run seed` task is therefore a no-op.
- Reports CSV export filename hardcodes the property slug (see §14.1).
- Several GET routes do their own ad-hoc validation; standardize on Zod everywhere a query/param is touched.
- `localStorage` keys in `booking-*.tsx` couple the demo to the "fjordview" name; switch to a generic key like `gh-bookings` or derive from `property.slug`.

---

## 18. Priority-ordered fix list for Codex

These are the changes I would have Codex make in order. Each item references the prompt section and the on-disk evidence.

### P0 — Blocking for production

1. **Drizzle: add the 6 missing tables and generate migrations** (§2 above; prompt §4).
   - Add `guests`, `bookings`, `cancellation_policies`, `cleaning_tasks`, `email_log`, `admin_users` to `src/lib/db/schema.ts`.
   - Add the 7 indexes from prompt §4 lines 266-276.
   - Run `drizzle-kit generate` to produce `drizzle/migrations/`.
   - Add `src/lib/db/index.ts` exporting a Drizzle client wired to `SUPABASE_*` env vars.
   - Add SQL for `auth.property_id()` and RLS policies per prompt §4 lines 278-297.

2. **Real Stripe Checkout in `POST /api/properties/[slug]/bookings`** (prompt §10 lines 520-544; current evidence `bookings/route.ts:61-101`).
   - Replace mock response with `stripe.checkout.sessions.create({...})`.
   - Persist booking as `pending` before redirect; webhook flips to `confirmed`.

3. **Wire Stripe webhook handlers** (prompt §10 lines 556-571; current evidence `webhooks/stripe/route.ts:9-20`).
   - `checkout.session.completed` → set booking confirmed + fully_paid, auto-assign room (use LRU once fixed — see P1), send confirmation email, create cleaning task, increment guest totals, send admin notification.
   - `charge.refunded` → update payment_status, send cancellation email.

4. **Real refund flow in `POST /api/bookings/[ref]/cancel`** (prompt §10 lines 575-598).
   - Enforce `policy.deadline_hours` server-side.
   - Call `stripe.refunds.create({ payment_intent, amount })`.
   - Mark booking cancelled, free the room (set `room_id = null`), send cancellation email, write to `email_log`.

5. **Admin auth** (prompt §17 Phase 1) — *do this together with P0 #1 once the Supabase project is provisioned.*
   - Add `/login` page with Supabase magic link or password.
   - Add `middleware.ts` redirecting unauthenticated `/admin/*` to `/login`.
   - Read `admin_users` row for the session user; scope every admin query to `auth.property_id()`.

6. **Remove all hardcoded "Fjordview" references outside the seed** (§14 above; prompt §18.1).
   - `src/app/layout.tsx:16`: derive title from `property.name`.
   - `src/app/admin/layout.tsx:67`: link to `/book/${env.defaultPropertySlug}`.
   - `booking-flow.tsx:127-128,161`, `booking-self-service.tsx:50`: replace `"fjordview-bookings"` with a property-agnostic key.
   - `reports/export/route.ts:34`: filename = `${property.slug}-booking-report.csv`.

### P1 — Acceptance-criteria gaps

7. **Email templates** (prompt §11; current evidence: 1 stub at `src/emails/booking-confirmation.tsx`).
   - Build `payment-receipt`, `pre-arrival-reminder`, `post-stay-thankyou`, `cancellation-confirmation`, `invoice-email`, `admin-notification`.
   - Add `components/{email-header,email-footer,booking-detail-block}.tsx`.
   - Expand `i18n/{no,en}.ts` with all subjects and body strings.
   - Have `email.ts` write a row to `email_log` on every send (success + failure).

8. **Cron logic** (prompt §12; current evidence: `cron/{daily,cleanup}/route.ts` return early).
   - Daily: select `check_in = today+2` → reminder; `check_out = yesterday` → thank-you; `check_out = today` → create cleaning rows.
   - Cleanup: cancel `pending` bookings older than 30 min, free their rooms.

9. **Missing admin routes** (prompt §8; §7 of this review).
   - 13 endpoints to add: bookings detail/patch/delete + manual create, guests list/detail, room-types CRUD, rooms CRUD, pricing-rules CRUD, cleaning detail PATCH, reports occupancy/revenue/sources, emails resend.
   - All admin routes must filter by `auth.property_id()`.

10. **Admin pages: write paths** (prompt §13).
    - Manual booking form, room CRUD UI, pricing rule editor with price-preview tool, cleaning status cycling (`pending → in_progress → completed`), settings editor.

### P2 — Quality / correctness

11. **LRU room auto-assignment** (prompt §7 lines 426-434; current evidence `availability.ts:46-62`). Sort `available` by `Math.max(...lastCheckOut)` ascending before returning.

12. **Zod on all API routes**, including GETs that read `searchParams` and route params. The booking POST already does this — match that bar everywhere.

13. **Rate limiting beyond the two endpoints currently covered.** The webhook, `/api/bookings/[ref]/cancel`, and admin login should have limits too. The in-memory bucket in `src/lib/rate-limit.ts` is not durable across Vercel instances; for production swap to Upstash Redis or Supabase-backed counter.

14. **Internationalize guest UI strings.** `booking-flow.tsx` and `book/[slug]/page.tsx` appear to be English-only despite the prompt's two-language requirement (§18.9).

15. **Verify Review #1 fixes** (calendar phantom data, date picker locale, pluralization, empty hero) on the current branch.

### P3 — Nice to have

16. Add a `stripe_account_id` column to `properties` (prompt §4 line 110) for future Stripe Connect.
17. Add a second demo property to the seed and add a test that proves zero data leakage (prompt §19 bullet 15).
18. Replace the text/JSON invoice prototype with a real PDF generator (referenced by `ACCEPTANCE_STATUS.md` line 30).
19. Add integration tests (Playwright is in `package.json` but no test files are visible) that exercise the booking flow end to end against the Stripe test webhook.

---

## 19. Summary

The Codex output produced a credible **local-demo scaffold** that passes the eye test for the booking flow and the admin UI. But measured against the prompt, the work is roughly **30% done**:

- ✓ Pricing engine, availability logic, booking ref generator, rate-limit helper, env separation hygiene, `.env.example`/`MIGRATION.md`, project structure.
- △ Webhook signature verification (present but no handlers), admin pages (shells, no CRUD), emails (1 thin template), cron (schedules but no bodies).
- ✗ Drizzle migrations, RLS, 6 of 10 tables, Stripe Checkout, Stripe refunds, admin auth, 13 of 19 admin endpoints, full email template set, multi-language guest UI, and several Section 18 critical-rule violations (hardcoded "Fjordview" strings).

Codex should treat the P0 list as the next sprint and re-run this checklist when those items are merged.
