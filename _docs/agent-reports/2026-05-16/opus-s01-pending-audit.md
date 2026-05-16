# OPUS S01 — Pending-Work Audit & Supabase Integration Plan

> **Session:** S01
> **Reviewer:** Opus 4.7 (taking over while Codex is rate-limited for ~3h)
> **Date:** 2026-05-16
> **Branch reviewed:** `codex/supabase-foundation` (HEAD `a133bf3`) — also compared to `main` (`7a27e65`) and `origin/codex/review-2-fixes` (`f0b785d`)
> **Reference:** `_docs/_prompt/guesthub-booking-system-dev-prompt.md`, `_docs/review/guesthub-review-{1,2}.md`, prior agent reports
> **Verification this session:** `npm run lint` (clean), `npm run build` (clean, 22 routes generated, proxy middleware registered)

---

## TL;DR — How many things are pending?

**38 discrete pending items**, grouped as follows:

| Bucket | Count | Who unblocks it |
|---|---:|---|
| **A. User-action prerequisites** (Supabase / Stripe / Resend config) | 7 | **You (Bithun)** |
| **B. P0 — Production wiring** (Drizzle reads/writes, Stripe Checkout, webhooks, refund, admin auth join) | 9 | Next agent (Codex) |
| **C. P1 — Acceptance-criteria gaps** (email templates, cron bodies, missing admin routes, admin write paths) | 14 | Next agent (Codex) |
| **D. P2 — Quality** (Zod everywhere, internationalize guest UI, durable rate-limit, second-property tenant test) | 5 | Next agent (Codex) |
| **E. P3 — Nice-to-have** (real PDF invoice, Playwright E2E, channel/Stripe Connect, fixtures) | 3 | Later |

**Branch hygiene news:** the "extra branch Codex couldn't merge" — `origin/codex/review-2-fixes` — is a **false alarm**. `git diff main origin/codex/review-2-fixes` returns **zero** lines. The Review-2 work was rebased into `main` as `7a27e65`. The branch is safe to delete from origin. See §1.

**Mergeability of `codex/supabase-foundation` → `main`:** ✅ **Ready.** The branch builds, lints, contains no test code that runs at boot, and only adds new files plus extends `schema.ts`. The application's runtime behavior is unchanged in `LOCAL_DEMO_MODE=true` because nothing yet imports `getDb()`. **You can merge it now without breaking the demo.** See §2.

**Supabase activation prerequisites:** 7 concrete steps you need to perform on your Supabase project before the next agent can wire feature code to Drizzle. Step-by-step in §3.

---

## 1. Branch landscape (resolving the "unmerged" confusion)

```
* a133bf3  feat: add supabase schema and admin auth foundation  ← codex/supabase-foundation (you are here)
|
* 7a27e65  Fix actionable Review #2 findings                    ← main
|
|  * f0b785d  fix: address actionable review 2 findings         ← origin/codex/review-2-fixes
|  * 785b630  chore: ignore local agent instructions
|/
*   fd33cb2  merge: codex booking prototype
```

- **`origin/codex/review-2-fixes` is functionally identical to `main`.** `git diff` between them is empty. Codex created this branch, pushed the fixes, then those same fixes landed on `main` under a single squashed commit (`7a27e65`). Nothing about the parallel commits blocks a merge — there's nothing left on that branch to merge. Recommended cleanup: `git push origin --delete codex/review-2-fixes` (after you confirm via `git diff main origin/codex/review-2-fixes` returns empty).

- **`codex/supabase-foundation` is straight-line ahead of `main` by one commit (`a133bf3`).** That commit adds:
  - `src/lib/db/schema.ts` — extended from 4 tables to all 10 prompt-required tables (`guests`, `bookings`, `cancellation_policies`, `cleaning_tasks`, `email_log`, `admin_users` added) with the 7 indexes, the check constraints, and the unique constraints the prompt requires.
  - `drizzle/migrations/0000_tiny_jane_foster.sql` (304 lines) — schema DDL + RLS enable on all 10 tables + `auth.property_id()` SECURITY DEFINER helper + 10 `FOR ALL TO authenticated` RLS policies.
  - `src/lib/db/index.ts` — lazy `getDb()` that opens a `postgres-js` connection on first call. Currently **never called** by feature code (intentional).
  - `src/app/login/page.tsx` + `src/app/login/actions.ts` — magic-link sign-in. Disabled (bypassed to `/admin`) when `LOCAL_DEMO_MODE=true`.
  - `src/proxy.ts` (Next.js 16 middleware) — protects `/admin/:path*` via Supabase SSR session. No-op when `LOCAL_DEMO_MODE=true`.
  - `.env.example` adds `LOCAL_DEMO_MODE=true`. `MIGRATION.md` extended with seed + RLS verification steps.

- **No code that runs at boot or in any current request path imports `getDb()` or the new tables yet.** All API routes still read from `src/lib/db/seed.ts` in-memory arrays. The branch is **scaffolding for the next phase**, not a wiring change. That is why the user observed it as "not merged" — Codex paused before activating it.

### Recommendation
1. Open a PR `codex/supabase-foundation` → `main` and merge it as-is. The local demo continues to work.
2. Delete `origin/codex/review-2-fixes`.
3. Proceed to §3 to activate Supabase. Then the next agent does §4–§7 against the real DB.

---

## 2. What `codex/supabase-foundation` actually delivers (verification)

Items below are verified by reading the files on disk, not by trusting the prior agent report.

| Deliverable | File | Status |
|---|---|---|
| All 10 prompt tables in Drizzle | `src/lib/db/schema.ts` | ✅ Present |
| 7 indexes from prompt §4 | `src/lib/db/schema.ts` | ✅ `idx_bookings_availability`, `idx_bookings_ref`, `idx_bookings_status`, `idx_rooms_type`, `idx_cleaning_date`, `idx_guests_email`, `idx_pricing_active` |
| `properties.stripe_account_id` | `schema.ts:27` | ✅ Added |
| RLS enabled on all 10 tables | `drizzle/migrations/0000_tiny_jane_foster.sql:202–221` | ✅ |
| `auth.property_id()` helper | migration `:222–234` | ✅ SECURITY DEFINER, STABLE, search_path locked |
| Per-table RLS policies | migration `:236–304` | ✅ 10 policies, `FOR ALL TO authenticated`, `USING + WITH CHECK` |
| Drizzle client | `src/lib/db/index.ts` | ✅ Lazy `getDb()` using `postgres-js`, `{ prepare: false }` for Supabase pgBouncer |
| `/login` magic-link UI | `src/app/login/page.tsx` | ✅ Calls `requestMagicLink` server action; banner when `LOCAL_DEMO_MODE=true` |
| Magic-link server action | `src/app/login/actions.ts` | ✅ Zod-validated email, `signInWithOtp`, `emailRedirectTo` honors `next` param |
| `/admin/*` proxy guard | `src/proxy.ts` | ✅ `LOCAL_DEMO_MODE !== "false"` short-circuits; otherwise `supabase.auth.getUser()` → redirect to `/login?next=...` |
| `.env.example` updated | `.env.example` | ✅ `LOCAL_DEMO_MODE=true` line added |
| `MIGRATION.md` updated | `MIGRATION.md` | ✅ 12-step playbook; `drizzle-kit migrate`, RLS verify, `LOCAL_DEMO_MODE=false` toggle |

### What the branch does **not** yet do (this is the next phase)

| Capability | Why it isn't done |
|---|---|
| Read availability from Postgres instead of `demoRooms`/`demoBookings` arrays | Requires running migration against a real DB first |
| Persist a booking on `POST /api/properties/[slug]/bookings` | Same |
| Look up booking on `GET /api/bookings/[ref]` via Drizzle | Same |
| Admin endpoints (dashboard/bookings/calendar) read via Drizzle filtered by `auth.property_id()` | Requires admin session that joins `admin_users` |
| `admin/layout.tsx` reads the property + session name from DB, not from seed | Same |
| Cron jobs hit DB | Same |
| Stripe Checkout session create | Pending — orthogonal to DB but trivially testable only once DB is live |

---

## 3. Supabase activation prerequisites — what YOU need to do

The next development phase cannot start until these 7 steps are complete. None require code changes; they're config.

### 3.1  Create a Supabase project for the prototype
- New project on your Supabase account (Free tier is fine for prototype).
- Region: pick one geographically near you (Stockholm `aws-0-eu-north-1` is the closest for Norway).
- Note: this is the **prototype** project. When you sell to a real client, you'll create a separate Pro project per the `MIGRATION.md` checklist.

### 3.2  Copy keys into `.env.local`
Create `.env.local` (gitignored) with the values from your Supabase project's **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from API page>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from API page — keep secret>
DATABASE_URL=<pooled Postgres connection string from Project Settings → Database → Connection pooling, port 6543>
```

Critical: use the **pooled** connection string (port 6543), not the direct one (port 5432). `src/lib/db/index.ts` opens with `prepare: false` which is correct for pgBouncer transaction-mode pooling.

Keep `LOCAL_DEMO_MODE=true` for now. You'll flip it later in step 3.6.

### 3.3  Run the migration
From the project root:

```bash
npx drizzle-kit migrate
```

This applies `drizzle/migrations/0000_tiny_jane_foster.sql` to your Supabase Postgres. It creates 10 tables, 7 indexes, enables RLS on every table, creates `auth.property_id()`, and installs 10 per-table policies.

After running, verify in the Supabase SQL editor:

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All 10 GuestHub tables should show rowsecurity = true.

SELECT proname FROM pg_proc WHERE proname = 'property_id' AND pronamespace = 'auth'::regnamespace;
-- One row.
```

### 3.4  Seed the demo property (one-time, manual SQL)

The `npm run seed` task at `package.json:10` runs `tsx src/lib/db/seed.ts`. **This file currently only `export`s in-memory arrays — it does not call any `INSERT` statements.** Until the next agent rewrites it as a real insert script, do the seed manually via Supabase's SQL editor. Paste this as a single transaction:

```sql
BEGIN;

INSERT INTO properties (id, name, slug, address, city, postal_code, country, timezone, currency, contact_email, contact_phone, booking_ref_prefix, primary_color, accent_color, cancellation_info)
VALUES ('00000000-0000-0000-0000-000000000001', 'Fjordview Lodge', 'fjordview', 'Eksempelveien 42', 'Demovik', '0000', 'NO', 'Europe/Oslo', 'NOK', 'hello@fjordviewlodge.example', '+47 000 00 000', 'FV', '#0D9488', '#F59E0B', '{"no":"Gratis avbestilling inntil 48 timer før innsjekk.","en":"Free cancellation up to 48 hours before check-in."}'::jsonb);

INSERT INTO room_types (id, property_id, name, description, slug, has_bathroom, max_guests, base_price, amenities, photo_urls, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '{"no":"Dobbeltrom med eget bad","en":"Double room with private bathroom"}', '{"no":"Lyst rom med fjordutsikt.","en":"Bright room with fjord view."}', 'double-ensuite', true, 2, 129500, '["wifi","tv","private_bathroom"]', ARRAY['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80'], 1),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '{"no":"Dobbeltrom uten bad","en":"Double room, shared bathroom"}',           '{"no":"Komfortabelt dobbeltrom.","en":"Comfortable double room."}',           'double-shared',   false, 2,  89500, '["wifi","tv","shared_bathroom"]',  ARRAY['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'], 2),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '{"no":"Enkeltrom","en":"Single room"}',                                       '{"no":"Rolig enkeltrom.","en":"Quiet single room."}',                          'single',          false, 1,  69500, '["wifi","tv","shared_bathroom"]',  ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'], 3),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '{"no":"Familierom","en":"Family room"}',                                       '{"no":"Romslig familierom.","en":"Spacious family room."}',                    'family',          true,  4, 179500, '["wifi","tv","private_bathroom","extra_beds"]', ARRAY['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80'], 4);

INSERT INTO rooms (property_id, room_type_id, room_number, floor) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '101', 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '102', 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '103', 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '201', 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '202', 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', '203', 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', '301', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', '302', 3),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014', '401', 1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000014', '402', 1);

INSERT INTO pricing_rules (property_id, name, rule_type, modifier_pct, start_date, end_date, priority) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Summer season',      'seasonal',    25, '2026-06-15', '2026-08-15', 1),
  ('00000000-0000-0000-0000-000000000001', 'Christmas/New Year', 'seasonal',    30, '2026-12-20', '2027-01-02', 3);

INSERT INTO pricing_rules (property_id, name, rule_type, modifier_pct, days_of_week, priority) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Weekend surcharge', 'day_of_week', 15, ARRAY[4,5], 2);

INSERT INTO cancellation_policies (property_id, name, description, refund_pct, deadline_hours, is_default) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Standard',
   '{"no":"Gratis avbestilling inntil 48 timer før innsjekk.","en":"Free cancellation up to 48 hours before check-in."}'::jsonb,
   100, 48, true);

COMMIT;
```

The fixed UUIDs above are intentional — they let the next agent's Drizzle wiring code reference the seed data by deterministic ID.

### 3.5  Create the admin user

In **Supabase Authentication → Users → Add user**: create the user with your email (`bithun@ibithun.com`). Use "Send invite" or set a password.

Then link that user to the property in SQL editor:

```sql
INSERT INTO admin_users (property_id, supabase_user_id, email, name, role)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  email,
  'Bithun',
  'owner'
FROM auth.users
WHERE email = 'bithun@ibithun.com';
```

Verify `auth.property_id()` resolves correctly **as the authenticated user** (run from SQL editor with "Run as authenticated user" toggled):

```sql
SELECT auth.property_id();
-- Should return the property UUID above. If it returns NULL, your auth user is not joined or admin_users.active = false.
```

### 3.6  Stripe & Resend (can be deferred until later)

- **Stripe (test mode)**: from your Stripe dashboard, copy `sk_test_...`, `pk_test_...`. The webhook signing secret (`whsec_...`) is created when you register the production webhook endpoint in step 7 below. For local testing, use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and Stripe CLI prints a per-session `whsec_...`.
- **Resend**: free tier; add domain or use the default `onboarding@resend.dev` from address for early testing. Set `RESEND_API_KEY` and `EMAIL_FROM`.

These two can stay placeholder strings until the next agent wires the Stripe Checkout and email sending — the existing code paths fall back to local-demo behavior when keys are missing.

### 3.7  Flip the demo-mode flag (only after 3.1–3.5 complete and code is wired)

Do **not** do this yet. After the next phase's code lands and you've verified the public booking flow against the seeded DB, set:

```
LOCAL_DEMO_MODE=false
```

in `.env.local`. The proxy will now enforce auth, the booking POST will write to Drizzle, etc. If anything breaks, set it back to `true`.

### Quick checklist for you

- [ ] 3.1 Supabase project created
- [ ] 3.2 Four env vars in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`)
- [ ] 3.3 `npx drizzle-kit migrate` run; tables + RLS verified in Supabase SQL editor
- [ ] 3.4 Seed SQL run; 4 room_types, 10 rooms, 3 pricing_rules visible
- [ ] 3.5 Auth user invited, `admin_users` row inserted, `auth.property_id()` returns the property UUID under your session
- [ ] 3.6 Stripe test keys + Resend API key in `.env.local` (placeholder OK for now)
- [ ] 3.7 (later) Flip `LOCAL_DEMO_MODE=false`

Once items 3.1–3.5 are done, ping the next agent with the dispatch prompt at the bottom of this report.

---

## 4. Pending work — P0 (production wiring)

These items unblock the "live Supabase + Stripe" demo. Estimated ~3 days of focused agent work.

1. **Rewrite `src/lib/db/seed.ts` as a real insert script** so `npm run seed` is no longer a no-op. The current file `export`s constants. Convert to an idempotent insert using Drizzle `onConflictDoNothing()`. Keep the seed-as-config story by having it re-read from a JSON or TS object so the demo property can be swapped per client without code changes.

2. **Wire `src/app/api/properties/[slug]/availability/route.ts` to Drizzle.** Replace the seed-array read with the LATERAL-JOIN query at prompt §5. Keep `LOCAL_DEMO_MODE` fallback so the demo still works offline.

3. **Wire `src/app/api/properties/[slug]/rooms/route.ts` and `src/app/api/properties/[slug]/bookings` GET (if added) to Drizzle.** Same pattern.

4. **Real Stripe Checkout in `POST /api/properties/[slug]/bookings`.** Today it returns a hand-rolled local URL (`bookings/route.ts:95-103`). Spec at prompt §10 lines 520-544: persist booking as `pending`, then create a `stripe.checkout.sessions.create({ mode: 'payment', line_items, metadata: { booking_id, property_id }, success_url, cancel_url, customer_email, locale })`, return the Stripe URL. The webhook flips status to `confirmed`.

5. **Wire `POST /api/webhooks/stripe`.** Current stub at `webhooks/stripe/route.ts:9-20` just returns `{ received: true }`. Add `checkout.session.completed` (set booking to `confirmed`+`fully_paid`, auto-assign room with LRU, send confirmation email, create cleaning_task for checkout date, increment guest totals, send admin notification email) and `charge.refunded` (mark payment_status, send cancellation email).

6. **Real refund flow in `POST /api/bookings/[ref]/cancel`.** Current code at `cancel/route.ts:5-32` returns a calculated amount but never calls `stripe.refunds.create()`. Add server-side enforcement of `policy.deadline_hours`, call `stripe.refunds.create({ payment_intent, amount })`, mark booking cancelled, set `room_id = null`, send cancellation email, write to `email_log`.

7. **`admin/layout.tsx`: read session + property from DB.** Currently displays hardcoded "Demo Admin" (`layout.tsx:65`). When `!localDemoMode`, look up the Supabase user → `admin_users` row → property via Drizzle. Also fix the `demoProperty.name` import at `layout.tsx:41` to load from DB.

8. **Admin API routes filter by `auth.property_id()`.** The 4 admin routes that exist today (`/api/admin/dashboard`, `/bookings`, `/calendar`, `/invoices/[bookingId]`) currently read seed arrays. Replace with Drizzle queries that scope to the admin's property via the RLS helper.

9. **Verify multi-tenant isolation.** After P0 #1–#8, add a second demo property to seed and test that admin A cannot see admin B's bookings (prompt §19 bullet 15). This is the single most important multi-tenant safety check.

---

## 5. Pending work — P1 (acceptance-criteria gaps)

10. **Email templates: 6 missing.** Today only `src/emails/booking-confirmation.tsx` exists, and it's a 22-line `<div>`. Prompt §11 requires 7 templates plus 3 shared components plus full i18n. Templates: `payment-receipt`, `pre-arrival-reminder`, `post-stay-thankyou`, `cancellation-confirmation`, `invoice-email`, `admin-notification`. Shared components: `email-header`, `email-footer`, `booking-detail-block`. Expand `src/emails/i18n/{no,en}.ts` from 3 strings to the full set.

11. **`email.ts` writes to `email_log`.** `src/lib/email.ts:14-43` returns `{ status }` but never inserts an `email_log` row. Add Drizzle insert on every send (success or failure).

12. **Daily cron body.** `src/app/api/cron/daily/route.ts:14-18` returns a placeholder. Implement: (a) `check_in = today+2` → send reminder; (b) `check_out = yesterday` → send thank-you; (c) `check_out = today` → create cleaning_tasks rows.

13. **Cleanup cron body.** `src/app/api/cron/cleanup/route.ts` is also a stub. Cancel `pending` bookings older than 30 min, set room_id to null, log how many were swept.

14. **Missing admin endpoints (13 of them, per Review #2 §7).**
    - `GET /api/admin/bookings/[id]` — full detail
    - `POST /api/admin/bookings` — manual booking (walk-in)
    - `PATCH /api/admin/bookings/[id]` — update status/notes/assign room
    - `DELETE /api/admin/bookings/[id]` — cancel + optional refund
    - `GET /api/admin/guests`, `GET /api/admin/guests/[id]`
    - CRUD `/api/admin/room-types`
    - CRUD `/api/admin/rooms`
    - CRUD `/api/admin/pricing-rules`
    - `GET /api/admin/cleaning`, `PATCH /api/admin/cleaning/[id]`
    - `GET /api/admin/reports/occupancy`, `/revenue`, `/sources`
    - `POST /api/admin/emails/resend/[logId]`

15. **Admin page write paths.** Today every admin page under `src/app/admin/*` is read-only over seed data (line counts: dashboard 26, bookings 31, calendar 15, guests 36, rooms 26, pricing 48, cleaning 15, reports 41, invoices 33, settings 32). Build the UI for: manual booking form, room CRUD, pricing rule editor with price-preview tool, cleaning status cycling (pending → in_progress → completed), settings editor.

16. **Filter / search / paginate in `/api/admin/bookings` GET.** Today it just returns `demoBookings` flat (`bookings/route.ts:4-6`). Add status/date-range/room-type/payment-status filters, guest-name/email/ref search, and `limit/offset` pagination.

17. **Real PDF invoice generation.** `src/lib/invoice.ts` currently writes text/JSON. Use `@react-pdf/renderer` or `pdf-lib` to produce a true PDF, signed for the property. `ACCEPTANCE_STATUS.md:30` calls this out as a known gap.

18. **Internationalize guest UI strings.** `src/components/booking/booking-flow.tsx` is English-only. Prompt §18.9 + acceptance criterion #4 require both `no` and `en` everywhere. Wire `language` state through to all visible strings using the same i18n approach as the email templates.

19. **Calendar page UI.** `src/app/admin/calendar/page.tsx` is 15 lines. Build the proper rooms-rows × dates-columns grid with status-colored blocks (confirmed teal, checked-in green, pending yellow), click-to-side-panel detail.

20. **Reports page with charts.** `src/app/admin/reports/page.tsx` is 41 lines and shows nothing meaningful. Add Recharts occupancy line, revenue bars, source pie. `recharts` is already in `package.json`.

21. **CSV export per report.** Today there's a generic `/api/admin/reports/export`. Add per-report CSV with the appropriate columns for occupancy/revenue/sources.

22. **Settings page wiring.** Build property-info, check-in/check-out time, cancellation policies CRUD, admin-users invite UI. All gated by `role = 'owner'`.

23. **Pricing preview tool.** "Room X on Date Y costs Z kr, applied rule = Q" (prompt §13 Pricing block). Useful for the property owner to debug their own rule stack.

---

## 6. Pending work — P2 (quality)

24. **Zod on every API entry.** `src/app/api/admin/bookings/route.ts:4-6` and `src/app/api/admin/dashboard/route.ts` have zero validation. The bar already exists in `src/lib/api-validation.ts`; apply it everywhere.

25. **Durable rate limiting.** `src/lib/rate-limit.ts` is an in-memory `Map`. On Vercel that's per-instance — useless under any real load. Swap to Upstash Redis (`@upstash/ratelimit`) — `.env` already has nowhere to put a Redis URL, so add `UPSTASH_REDIS_REST_URL` / `_TOKEN`. Apply to `/api/webhooks/stripe` (signature-fail flood), `/api/bookings/[ref]/cancel`, and `/api/login` actions.

26. **Webhook idempotency.** Stripe will retry. Persist `stripe_event_id` on processed events; reject duplicates. A small `processed_stripe_events(event_id PRIMARY KEY, processed_at)` table is enough — or piggyback on `bookings.stripe_checkout_session_id` if you accept that any given session is processed once.

27. **`booking-ref` sequence is racy.** `src/lib/booking-ref.ts` + the call site at `bookings/route.ts:57` use `demoBookings.length + 1`. Once Drizzle is wired, switch to a per-property Postgres sequence (`CREATE SEQUENCE` or `nextval()` of a counter row) to avoid collisions under concurrent POSTs.

28. **Re-check Review #1 fixes against the live DB.** Calendar phantom-data (BUG-1) was fixed in the seed-array world; verify it still holds when `demoBookings` is replaced with a Drizzle query.

---

## 7. Pending work — P3 (nice-to-have)

29. **Stripe Connect.** `properties.stripe_account_id` column is in the schema but nothing reads it. Future: route checkout per-client to their own Stripe account when reselling.

30. **Playwright E2E suite.** `@playwright/test` is in `devDependencies` but no spec files exist. Add at minimum: guest booking flow happy path, guest cancellation, admin login + dashboard render.

31. **Seed via Drizzle + script-driven** so `npm run seed` actually runs. Already covered by P0 #1 but listed here because the prompt expected it from Phase 1.

---

## 8. Section-18 critical-rule status (re-check after Review #2)

| Rule | Status | Evidence |
|---|---|---|
| 1. No client names in code outside seed | ✅ Fixed in main | `git grep -i 'fjordview'` finds only `src/lib/db/seed.ts`, `MIGRATION.md`, `_docs/`, screenshots, and `package.json#name` — the last one is the npm package name and is acceptable for the prototype repo. `src/app/admin/layout.tsx:41,68` now reads `demoProperty.name` and `env.defaultPropertySlug`, not hardcoded strings. |
| 2. Prices in smallest currency unit | ✅ | `Math.round` everywhere |
| 3. Every DB query includes `property_id` | △ Trivially true on seed; will be enforced by RLS once wired |
| 4. Stripe keys env-only | ✅ |
| 5. Webhook signature verification | ✅ `src/lib/stripe.ts:24-27` |
| 6. Email templates parameterized | △ For the one template that exists |
| 7. No Pro-only features | ✅ |
| 8. Norwegian locale | ✅ Verified — booking-flow now uses `dd.mm.yyyy` and the price breakdown shows `2 784,25 kr` in the screenshot |
| 9. Two languages | △ Email i18n stubs exist (3 strings); booking-flow UI is English-only |
| 10. Git hygiene | ✅ |

**Net: 7 ✅ / 3 △ / 0 ✗.** Up from Review #2's "Mixed compliance" — the §14.1 hardcoded-Fjordview violations are fully cleared.

---

## 9. Review-#1 follow-ups: re-verified

All four issues from `_docs/review/guesthub-review-1.md` are still fixed on the current branch:

- **BUG-1 (calendar phantom bookings):** `src/app/api/admin/calendar/route.ts:27-31` correctly filters `demoBookings` by status and overlap; calendar UI consumes that endpoint.
- **BUG-2 (date format):** `src/components/booking/booking-flow.tsx:182,195` uses `dd.mm.yyyy` placeholder, and `formatInputDate` / `parseInputDate` in `src/lib/utils.ts` handle the conversion.
- **BUG-3 (singular guest):** `booking-flow.tsx:270` — `room.maxGuests === 1 ? "guest" : "guests"`.
- **UI-1 (empty hero):** `booking-flow.tsx:159` — `property.heroImageUrl ? (…) : null`. The seed's `demoProperty.heroImageUrl` is populated, so the hero shows in the demo.

---

## 10. Verification I ran this session

```
git status                                    → clean
git diff main origin/codex/review-2-fixes     → empty (branch already in main)
git diff origin/codex/review-2-fixes..HEAD    → 13 files / +2252 / -37  (the supabase-foundation work)
git log --graph --all                         → linear; no real branch divergence
npm run lint                                  → clean
npm run build                                 → clean; 22 routes; proxy middleware registered
```

Screenshots in `_docs/verification/` reviewed:
- `booking-desktop.png` — fjord hero, 4 room cards, Norwegian dates `23.05.2026 / 25.05.2026`, "2 nights total" totals, `dd.mm.yyyy` inputs.
- `admin-dashboard.png` — sidebar nav present (note: from an earlier phase, lacks the Invoices entry the current code shows), occupancy 20%, revenue 4 385 kr, 2 recent bookings with status badges.
- `booking-confirmed.png`, `phase5-*` — confirmation, invoices list, reports.

No dev server is running. Confirmed via `netstat`-equivalent check via the build output (Next dev server would conflict with `next build`).

---

## 11. Recommended next steps

### For you (Bithun), before re-spawning a coding agent

1. Merge `codex/supabase-foundation` → `main`. (Optional but cleans up the tree.)
2. Delete `origin/codex/review-2-fixes` since it's already represented on `main`.
3. Work through §3.1–§3.5 to get Supabase live. Stop at 3.6 — don't flip `LOCAL_DEMO_MODE=false` yet.
4. When Codex comes back, paste the dispatch prompt below.

### For the next agent (use this dispatch prompt)

> **Branch:** start a new branch `codex/supabase-wire-phase-1` from `main`.
>
> **Read first:** `_docs/_prompt/guesthub-booking-system-dev-prompt.md`, `_docs/review/guesthub-review-2.md`, and `_docs/agent-reports/2026-05-16/opus-s01-pending-audit.md` (this file).
>
> **Phase goal:** activate Supabase reads/writes for the public booking flow without breaking the local-demo mode. Land §4 P0 items 1, 2, 3 (seed script, availability via Drizzle, rooms via Drizzle) + the matching guest booking POST persistence (subset of P0 #4: write the booking as `pending` to Drizzle, but keep returning the local checkout URL until Stripe wiring lands in the next phase). Defer Stripe Checkout creation, webhook handlers, refund, admin auth join, and admin endpoints to phase 2.
>
> **Verification gate:**
> - `npm run lint` and `npm run build` must stay clean.
> - With `LOCAL_DEMO_MODE=true` (no DB env vars), the demo must continue to work — `/book/fjordview` lists rooms, search shows availability, "Pay & confirm" produces a local success page.
> - With `LOCAL_DEMO_MODE=false` and a real `DATABASE_URL`, the same endpoints must return rows from Postgres. Smoke test the availability LATERAL-JOIN query in `psql` against the seeded DB and document the result in your session report.
>
> **Commit policy:** one focused commit per file group (seed script; availability route; rooms route; bookings POST). Write `_docs/agent-reports/<YYYY-MM-DD>/codex-supabase-wire-phase-1.md` listing what landed, what was deferred, and verification evidence.
>
> **Boundaries:**
> - Do **not** touch the Stripe webhook route, the cancel route, the admin endpoints, or the cron bodies in this phase. Those are phase 2.
> - Do **not** rip out the seed arrays — keep them as the demo-mode fallback. Use `if (env.localDemoMode) { …seed reads… } else { …Drizzle reads… }` blocks.
> - Email templates remain unchanged in this phase.
>
> **Open questions to surface to Bithun if you hit them:**
> - If the LATERAL-JOIN query is slow on Supabase free-tier, propose a CTE or materialized view alternative.
> - If RLS blocks a public booking POST (anon role can't insert), document the policy change needed (insert with `WITH CHECK (property_id = (SELECT id FROM properties WHERE slug = …))` for the `anon` role) and either add it as part of this phase or defer to phase 2 — but state explicitly what you chose.

---

## 12. Summary count

**38 pending items.** Distribution:

- **7** Bithun's pre-work (Supabase project, env vars, migration, seed, admin user, Stripe/Resend keys, flip flag)
- **9** P0 production wiring
- **14** P1 acceptance-criteria gaps
- **5** P2 quality
- **3** P3 nice-to-have

**Estimated agent-time to reach "live Supabase demo passing prompt §19 fully":** roughly 5–7 focused Codex sessions (~3–4 work days) once Supabase is provisioned.

**Estimated agent-time to reach "merge-ready PR for first paying client":** add another 3–4 sessions for P2 #25–27 (durable rate limit, webhook idempotency, safe booking-ref) and a Playwright E2E pass.

The pricing engine, availability math, booking-ref generator, RLS schema, and proxy guard are solid. The work ahead is wiring, not architecture redesign.
