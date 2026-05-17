# Codex S05 — Auth-Aware Admin Scoping + Stripe

> **Session:** Codex S05 implementation follow-up  
> **Agent:** Codex  
> **Date:** 2026-05-17  
> **Active window:** 2026-05-17 02:54-03:07 CEST  
> **Branch:** `codex/auth-aware-admin-scoping`  
> **Context bucket:** Green, estimated ~35% of Codex 250k window

## Session Timeline

| Time (CEST) | Commit | Slice |
|---|---|---|
| 2026-05-17 02:54 | `271736e` | Acknowledged active Codex S01 and Opus S02 handoffs |
| 2026-05-17 03:07 | `cfab950` | Auth-aware admin scoping, verifier correction, tests |

## Slice: Auth-Aware Admin Scoping

Implemented the audit-recommended priority slice ahead of provider-key work:

- Added `src/lib/admin-context.ts`, resolving admin property context from:
  - `DEFAULT_PROPERTY_SLUG` only when `LOCAL_DEMO_MODE=true`
  - the signed-in Supabase user's active `admin_users.property_id` when `LOCAL_DEMO_MODE=false`
- Added query helpers for active admin user lookup, property-by-id lookup, and property-scoped admin booking detail lookup.
- Replaced admin page/API default slug resolution across bookings, calendar, guests, settings, layout, metrics, property update, invoice JSON, and invoice detail.
- Scoped admin booking and invoice detail pages/routes so a booking from another property returns not found.
- Fixed `scripts/verify-schema.ts` to check `public.current_property_id()` instead of the obsolete `auth.property_id()`.

## Tests Added

- `src/lib/admin-context.test.ts`
  - verifies demo mode uses the configured default property
  - verifies non-demo mode uses the signed-in admin mapping
  - verifies no fallback to default property when admin mapping/user is missing
- `src/lib/admin-scoping.static.test.ts`
  - guards admin surfaces against resolving property context from `DEFAULT_PROPERTY_SLUG`
  - guards admin detail surfaces against unscoped `getBookingDetail(...)`
- `scripts/verify-schema.static.test.ts`
  - guards the schema verifier against the old `auth.property_id()` check

## Verification Evidence

| Command / Check | Result |
|---|---|
| `npx tsx --test scripts\verify-schema.static.test.ts src\lib\admin-scoping.static.test.ts src\lib\admin-context.test.ts` | Pass, 7 tests |
| `npm run lint` | Pass |
| `npm run build` | Pass; pre-existing Recharts width/height warning still appears |
| `npm run db:verify` | Pass; reports `public.current_property_id() exists: yes` |
| Browser smoke, `http://127.0.0.1:3000/admin` | Pass; dashboard rendered, console warnings/errors 0 |
| Browser interaction, Dashboard → Bookings | Pass; URL became `/admin/bookings`, bookings heading and manual booking action visible |
| API smoke, `/api/admin/bookings` | HTTP 200 in local demo mode |
| API smoke, `/api/admin/calendar` | HTTP 200 in local demo mode |

## Remaining Work

The Opus S02 active handoff remains open. Remaining priority slices:

1. Stripe Checkout + webhook handlers + refund call.
2. Resend email integration + missing templates + `email_log` writes.
3. Room type CRUD + physical room CRUD.
4. Cron job real bodies.
5. Multi-tenant verification with a second property/admin user.

Second-property verification was not completed in this session because it requires additional seeded tenant/admin setup beyond the auth-aware code path.

## Slice: Stripe Checkout + Webhooks

> **Continuation window:** 2026-05-17 13:03-13:16 CEST  
> **Branch:** `codex/stripe-checkout-webhooks`  
> **Commit:** `59dd9ae`

Implemented Opus S02 priority item 1:

- Public booking creation now records `pending` / `unpaid` / `paidAmount = 0`.
- Booking creation creates a Stripe hosted Checkout Session when `STRIPE_SECRET_KEY` is present.
- The booking UI redirects to Stripe Checkout for `mode: "stripe"` and keeps local-demo fallback behavior when Stripe is unavailable.
- Stripe webhook route verifies real Stripe signatures when `STRIPE_WEBHOOK_SECRET` is present, even in `LOCAL_DEMO_MODE=true`.
- `checkout.session.completed` confirms the booking, marks it `fully_paid`, stores the Checkout Session ID and PaymentIntent ID, and records the paid amount.
- `charge.refunded` marks matching bookings refunded by PaymentIntent ID.
- Self-service cancellation issues a Stripe refund when the booking has a PaymentIntent and a refundable amount.

### Stripe Verification Evidence

| Command / Check | Result |
|---|---|
| `npx tsx --test src\lib\stripe-wiring.static.test.ts src\lib\stripe.test.ts` | Pass, 5 tests |
| `npm run lint` | Pass |
| `npm run build` | Pass; pre-existing Recharts width/height warning still appears |
| `npm run db:verify` | Pass |
| API smoke booking create | Created `FV-2026-0007`, returned `mode=stripe`, `pending/unpaid`, Checkout URL present |
| Browser Stripe Checkout smoke | Created `FV-2026-0008`, paid with Stripe test card `4242`, redirected to self-service success URL |
| Webhook state check | `FV-2026-0008` became `confirmed / fully_paid`, stored Checkout Session and PaymentIntent IDs |
| Cancellation/refund smoke | `FV-2026-0008` cancellation returned `mode=stripe`, refund id present, booking `cancelled / refunded` |

### Stripe Notes

The local Stripe CLI listener must stay running during webhook testing:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The test smoke left test-mode bookings in the local database: `FV-2026-0007` pending/unpaid and `FV-2026-0008` cancelled/refunded.
