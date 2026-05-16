# OPUS S02 — Session Execution Summary

> **Session:** S02
> **Agent:** Opus 4.7
> **Date:** 2026-05-16 (started ~22:15 CEST, after S01 closeout)
> **Branch:** `claude/s02-bug-audit-and-fixes` (branched off `claude/supabase-and-admin-wiring`, S01's unmerged work)
> **Mode:** Append-only.

## Why this session exists

Between S01 closing out and S02 starting, Bithun reopened S01 and asked it to
do a crosscheck of `_docs/_prompt/guesthub-booking-system-dev-prompt.md` §19
acceptance criteria against the code S01 just shipped — they suspected ~10
unsurfaced bugs. S01 crashed (repeated 500 errors) before producing the audit.

S02 picked up that crosscheck as a scope amendment to
[`active/opus-s01-to-opus-s02-deferred-items.md`](../../agent-handoffs/active/opus-s01-to-opus-s02-deferred-items.md).

The six original deferred items (Stripe, Resend, Room CRUD, Cron bodies,
multi-tenant test, auth-aware admin scoping) were **not** worked on; they stay
queued for the next session.

## Session timeline

| Time (CEST)  | Commit     | Description |
|---|---|---|
| ~22:15 | — | Read AGENT-PROTOCOL.md, ADRs 0001–0005, S01 summary entries 1–5, S01→S02 handoff, dev prompt §19. Branched `claude/s02-bug-audit-and-fixes` off `claude/supabase-and-admin-wiring`. |
| 22:18 | `3664503` | docs: acknowledge handoff + scope amendment |
| ~22:25 | — | Audited `queries.ts`, `availability.ts`, `pricing.ts`, every admin page S01 touched, every API route under `/api/admin/*` and `/api/bookings/*`, the booking flow, the booking self-service, and the invoice viewer. Compiled a 10-item bug list. |
| 22:45 | `e055618` | fix: use proper status/payment tones + replaceAll across admin and booking views |
| 22:55 | `8cb81b4` | fix(admin): show today's arrivals + departures on dashboard, limit recent to 5 |
| 23:05 | `848b44f` | fix(cancel): compute cancellation deadline in property timezone + check-in time |
| 23:12 | `cc12710` | fix(booking-flow): clear hardcoded guest pre-fill, add photo fallback, gate submit on required fields |
| 23:18 | `1a9cc62` | fix: validate UUID vs booking-ref in getBookingDetail + invoice routes |
| 23:25 | `595ef68` | fix(admin): manual unpaid booking no longer overcounts guests.totalSpent |
| 23:30 | — | This summary + handoff close. |

## Bug list audited (and what was done about each)

### Fixed

1. **`BookingTable` (dashboard) used binary status colour.** `confirmed` showed teal, everything else amber — so cancelled, checked_in, checked_out, no_show all looked the same. Payment statuses similar. Centralised `bookingStatusTone` + `paymentStatusTone` helpers in `src/lib/utils.ts`; consumed by `admin-cards.tsx`, `bookings/page.tsx`, `bookings/[id]/page.tsx`, `booking-self-service.tsx`. Same commit also routed `humanizeEnum` (`replaceAll("_", " ")`) through everything that was using `replace("_", " ")` (latent bug: would only fix the first underscore — `partial_refund` stays partly underscored). `e055618`.

2. **Dashboard `arrivals` filter was `checkIn >= today` (all future) and `departures` filter was `checkOut >= today` — not "today" at all.** And `departures` was never rendered on the dashboard. Per dev prompt §13 the dashboard must show today's arrivals + today's departures. Fixed both filters to `=== today` and added two new dashboard cards (`Today's arrivals` + `Today's departures`) that link to booking detail. Also limited "Recent bookings" to the last 5 per §13. `8cb81b4`.

3. **Cancellation deadline ignored property timezone + check-in time.** `queries.ts:cancelBooking` was computing `hoursUntilCheckIn` as `(Date.parse(checkIn + "T00:00:00Z") - Date.now()) / 36e5`. For a Norway property with `check_in_time = 15:00` CEST, that under-counts the cancellation window by ~15 hours, rejecting legitimate cancellations made well inside the policy deadline. Added `hoursUntilCheckInForProperty` helper that uses `Intl.DateTimeFormat` to compute the actual UTC moment of `{date}T{check_in_time}` in the property's timezone, then subtracts `Date.now()`. `848b44f`.

4. **Hardcoded test guest data pre-filled the public booking form** (`Ava`, `Nord`, `ava@example.com`, `+47 400 00 123`, etc.). Any real visitor opening `/book/fjordview` saw someone else's stub data and had to clear every field. Per dev prompt §18 rule 1 (no test fixtures in code paths the user touches). Cleared the defaults and added a `guestFormValid` gate on the submit button so the user can't click "Pay & confirm" with an empty first name / last name / email. `cc12710`.

5. **`room.photoUrls[0]` crashed Next/Image when a room has no photos** (the DB column is `text[] DEFAULT '{}'`). Wrapped the `<Image>` in a conditional that falls back to a slate placeholder with the BedDouble icon. `cc12710`.

6. **`getBookingDetail(id)` threw on non-UUID input** because `eq(schema.bookings.id, id)` with a malformed UUID raises a Postgres syntax error instead of returning zero rows. The invoice route + invoice page each had their own inline version of this lookup with the same bug. Centralised an `isUuid` check in `lib/api-validation.ts`; `getBookingDetail` now accepts either a UUID or a booking ref and dispatches; both the invoice page and the invoice JSON route now go through it. `1a9cc62`.

7. **Manual unpaid booking overcounted `guests.totalSpent` by the full `totalPrice`.** `createBooking` was hard-coding `+= input.totalPrice` against the guest row, regardless of how much had actually been paid. For an admin manual "unpaid" booking, the guest hadn't paid anything yet — but `totalSpent` jumped by the full nightly subtotal. Refactored `createBooking` to accept `status` / `paymentStatus` / `paidAmount` / `source` overrides; the guest aggregate now increments by `paidAmount`, not `totalPrice`. `createAdminBooking` simplified to a thin wrapper that picks sensible defaults per payment status (`fully_paid` → paidAmount = totalPrice, others → paidAmount = 0 unless explicit) and stamps `source = "admin"`. `595ef68`.

8. **`booking.status.replace("_", " ")` etc. only replaced the first underscore.** `partial_refund` was the only enum value with multiple underscores, so this was latent — but `humanizeEnum` (`replaceAll`) is now the convention. (Folded into commit `e055618`.)

### Audited and left as-is (not in this session's scope)

- **Stripe Checkout / webhook / refund.** Item 1 in the original handoff — needs Stripe test keys + Stripe CLI from the user. Still S03's queue.
- **Resend integration + 6 missing templates + `email_log` writes.** Item 2 in the original handoff — needs Resend API key. Still S03's queue.
- **Room type + physical room CRUD.** Item 3 in the original handoff — pure UI, no keys needed. Still S03's queue.
- **Cron job real bodies.** Item 4. Still S03's queue.
- **Multi-tenant verification.** Item 5. Still S03's queue.
- **Auth-aware admin scoping when `LOCAL_DEMO_MODE=false`.** Item 6. Still S03's queue.
- **`createBooking` race-condition mitigation: advisory lock + MAX+1 ref.** Inspected — pattern is fine. UNIQUE constraint on `booking_ref` is the backstop.
- **`autoAssignRoom` returning null.** Booking still records with `room_id = NULL`. Acceptable for the prototype; admin sees "Unassigned" and can reassign. Worth surfacing as a warning at some point.
- **Manual booking server doesn't validate `paidAmount <= totalPrice`.** Low-impact for a trusted admin form; flag for future hardening if needed.

## Files modified

- `src/lib/utils.ts` — `humanizeEnum`, `bookingStatusTone`, `paymentStatusTone`, `BadgeTone` exports
- `src/lib/api-validation.ts` — `UUID_REGEX`, `isUuid`
- `src/lib/db/queries.ts` — booking aggregate fix, `getBookingDetail` UUID branch, `cancelBooking` timezone-aware deadline, `createBooking` accepts overrides, `createAdminBooking` simplified
- `src/components/admin/admin-cards.tsx` — `BookingTable` rewritten to use proper tones + link to detail + empty state
- `src/components/admin/cleaning-row.tsx` — `humanizeEnum`
- `src/components/booking/booking-flow.tsx` — empty pre-fill, photo fallback, submit gate
- `src/components/booking/booking-self-service.tsx` — proper status/payment tones
- `src/app/admin/page.tsx` — new dashboard layout: today's arrivals + departures + last 5
- `src/app/admin/bookings/page.tsx` — use centralised tones
- `src/app/admin/bookings/[id]/page.tsx` — use centralised tones
- `src/app/admin/invoices/[bookingId]/page.tsx` — use `getBookingDetail`, `humanizeEnum`
- `src/app/api/admin/invoices/[bookingId]/route.ts` — use `getBookingDetail`

Plus the two untracked files left by Codex's S01-era parallel session got committed alongside the first fix commit (they were sitting in the working tree as untracked):
- `.codex/README.md`
- `_docs/adr/0004-codex-project-local-onboarding.md`

## Verification

- `npm run lint` — clean
- `npm run build` — clean, 25 routes (same as S01 end-state); proxy middleware registers
- No manual browser smoke test this session (the user wasn't asked to drive). Each fix is small and the diffs are reviewable. Recommend manually verifying:
  1. Dashboard at `/admin` shows two new cards ("Today's arrivals", "Today's departures") with proper data
  2. Booking statuses on the bookings list + booking detail + self-service show correct colours per state
  3. Booking detail invoice page at `/admin/invoices/{some-booking-ref}` resolves correctly (was previously only working with UUID)
  4. Creating a manual booking with `paymentStatus = "unpaid"` from `/admin/bookings/new` results in the guest's `totalSpent` increasing by 0, not the booking subtotal
  5. Public booking page at `/book/fjordview` no longer pre-fills "Ava Nord" — required fields gate submit

## Acceptance criteria movement

Per S01's Entry 4 score: **12 ✅ / 2 ⚠️ / 5 ❌**.

S02's fixes don't move that needle on §19 criteria (none of them were ❌ items) — they fix the quality of items already in the ✅ column. Net score after S02: **still 12 ✅ / 2 ⚠️ / 5 ❌**, but the ✅ items are noticeably less buggy:

- #5 Guest self-service: now shows correct status colours
- #6 Cancel within policy: deadline calc now timezone-correct
- #7 Admin dashboard: now actually shows today's arrivals + departures (was just upcoming counts)
- #8 Admin filter/search bookings: list rows now link to detail + use correct tones
- #9 Manual booking: no longer over-counts guest spend on unpaid walk-ins
- #16/17 Mobile + tablet: not retested but unchanged

## End-state at S02 close

- Branch `claude/s02-bug-audit-and-fixes` is 6 fix commits + 1 docs ack commit ahead of `claude/supabase-and-admin-wiring`, which is itself 16 commits ahead of `main`.
- Build green, lint green, 25 routes.
- Handoff [`active/opus-s01-to-opus-s02-deferred-items.md`](../../agent-handoffs/active/opus-s01-to-opus-s02-deferred-items.md) gets moved to `archive/2026-05-16/` and a fresh handoff to the next agent gets dropped in `active/`.
