# Codex Supabase Foundation

## Goal

Start the Review #2 production-hardening slice for Supabase persistence, RLS,
and admin auth.

## Implemented

- Added missing Drizzle tables from the prompt: `guests`, `bookings`,
  `cancellation_policies`, `cleaning_tasks`, `email_log`, and `admin_users`.
- Added `properties.stripe_account_id`, prompt indexes, uniqueness constraints,
  status/language/source checks, and generated `drizzle/migrations/`.
- Added RLS enablement, `auth.property_id()`, and authenticated admin policies
  scoped by `admin_users.property_id`.
- Added lazy `getDb()` Drizzle client using `DATABASE_URL`.
- Added live-mode Supabase admin auth shell:
  - `src/proxy.ts` protects `/admin/*` when `LOCAL_DEMO_MODE=false`.
  - `/login` requests Supabase magic links.
  - Local demo mode still bypasses auth so the current prototype remains usable.
- Updated `.env.example` and `MIGRATION.md`.

## Still Pending

- Apply migrations to a real Supabase project and run advisors.
- Seed real `admin_users` rows tied to Supabase Auth user ids.
- Move API reads/writes from seed arrays to Drizzle queries.
- Implement Stripe Checkout/webhook/refunds, email templates/logging calls,
  cron bodies, and admin CRUD.
