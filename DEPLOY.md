# Deploying to Vercel

Quick path to get this app live on Vercel. Use [MIGRATION.md](MIGRATION.md) for
the full prototype-to-production checklist when launching a real client.

## 1. Push the repo to GitHub

```bash
git push -u origin main
```

## 2. Import on Vercel

1. **New Project** → Import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Build command, install command, output directory: defaults.

## 3. Required environment variables

Set these in **Project Settings → Environment Variables** for *Production*
(and *Preview*, if you want preview deploys to work the same way).

| Variable | Required? | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | The Vercel URL — e.g. `https://your-project.vercel.app`. The booking flow uses this to build self-service links inside emails. |
| `DEFAULT_PROPERTY_SLUG` | Yes | `fjordview` for the seeded demo. |
| `LOCAL_DEMO_MODE` | Yes | `true` for the demo build (admin auth bypass, Stripe + email fall back to "logged" when keys are absent). Set to `false` once a real Supabase admin user is in place. |
| `DATABASE_URL` | Yes | Supabase **pooled** connection string (port 6543, transaction mode). Every public booking + admin page hits the DB. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Used server-side for admin queries. |
| `CRON_SECRET` | Yes | Any long random string. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; the cron routes reject other requests. |
| `STRIPE_SECRET_KEY` | Optional | Without it, public checkout falls back to a fake confirmation. |
| `STRIPE_WEBHOOK_SECRET` | Optional | Required only when running real Stripe Checkout end-to-end. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Required only with `STRIPE_SECRET_KEY`. |
| `RESEND_API_KEY` | Optional | Without it, emails are written to the server logs via `console.info("[local-email]", ...)` instead of being sent. |
| `EMAIL_FROM` | Optional | Sender address. Use `onboarding@resend.dev` while no domain is verified; bookings made from arbitrary inboxes will fail until a domain is verified in Resend. |

## 4. Seed the database

Run once locally, after env vars are filled in:

```bash
npm run seed
```

That populates the Fjordview Lodge property (default slug `fjordview`) and the
secondary `aurora-cabin` property — the second is there so multi-tenant admin
scoping can be verified by inserting a second `admin_users` row keyed to a
different Supabase auth user. The script is idempotent: re-running it skips
any property that already exists by slug.

## 5. Cron jobs

`vercel.json` already declares two crons:

| Path | Schedule | What it does |
|---|---|---|
| `/api/cron/daily` | `0 8 * * *` (08:00 UTC) | Sends pre-arrival reminders (tomorrow's check-ins), post-stay thank-yous (yesterday's check-outs), and backfills any missing cleaning tasks for today's check-outs. |
| `/api/cron/cleanup` | `*/30 * * * *` | Cancels pending bookings older than 60 minutes (auto-release stale unpaid holds). |

Both routes verify the `CRON_SECRET` bearer token sent by Vercel Cron. Sanity-check manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-project>.vercel.app/api/cron/cleanup
```

## 6. Flipping to `LOCAL_DEMO_MODE=false`

This is the production switch. Before flipping it:

1. Create a Supabase auth user for each admin (Project → Authentication → Users).
2. Insert a matching `admin_users` row tied to that `supabase_user_id` and the right `property_id`.
3. Set `LOCAL_DEMO_MODE=false` on Vercel.
4. Redeploy.

After this, `/admin/*` requires sign-in via `/login`, and admin queries scope to the signed-in admin's property — Fjordview admins cannot see Aurora data, and vice versa.

## 7. Optional but recommended before going public

- Verify a custom sending domain in Resend so guest emails actually deliver.
- Switch Stripe to live keys and register the production webhook
  (`https://<your-project>.vercel.app/api/webhooks/stripe`, events:
  `checkout.session.completed`, `charge.refunded`).
- Replace the in-memory rate limiter ([src/lib/rate-limit.ts](src/lib/rate-limit.ts))
  with Upstash or another shared store — the current map resets on every cold
  start.
