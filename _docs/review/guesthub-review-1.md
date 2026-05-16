# GuestHub Prototype — Review #1

> **Reviewed by:** Lead developer
> **Date:** 2026-05-16
> **Scope:** Public booking page, admin dashboard, admin calendar
> **Verdict:** Strong first build. Pricing engine, data model, and admin structure are solid. Four issues to fix before moving to Stripe checkout and email template testing.

---

## Bugs (fix before next phase)

### BUG-1: Calendar displays incorrect booking data (Critical)

**Where:** Admin → Calendar page
**What's wrong:** Every booking block across all 10 rooms for the entire week shows `FV-2026-0002 · Family room`. The dashboard only has 2 actual bookings (FV-2026-0001 and FV-2026-0002), so the calendar is either rendering placeholder/dummy data instead of querying real bookings, or the seed script is creating duplicate bookings across every room with the same reference.
**Why it matters:** The calendar is the primary tool the property owner uses at reception. If it shows phantom bookings, the owner can't trust the system.
**How to fix:**
1. Check if the calendar component is using hardcoded/mock data instead of the `/api/admin/calendar` endpoint
2. Check if the seed script is accidentally creating bookings for every room
3. The calendar query should return only bookings where `status NOT IN ('cancelled', 'no_show')` for the visible date range, joined to the actual room and room_type for display
4. Verify by checking the `bookings` table directly — there should only be 2 rows from the seed

### BUG-2: Date format inconsistency on booking page (Medium)

**Where:** Public booking page → date picker inputs vs nightly breakdown
**What's wrong:** The date picker inputs display `05/23/2026` (American MM/DD/YYYY format), but the nightly price breakdown below shows `23.05.2026` (Norwegian DD.MM.YYYY format). Both should use Norwegian format.
**How to fix:**
- Set the date picker component's `locale` to `nb` (Norwegian Bokmål) from `date-fns/locale/nb`
- Set the display format to `dd.MM.yyyy`
- If using shadcn/ui's Calendar + Popover date picker, the format string is applied in the `format()` call inside the trigger button, and the Calendar component accepts a `locale` prop
- Test that the value sent to the API is still ISO format (`yyyy-MM-dd`) regardless of display format

### BUG-3: Pluralization error on single room (Low)

**Where:** Public booking page → Single room card
**What's wrong:** Badge reads "Up to 1 guests" — should be "Up to 1 guest" (singular).
**How to fix:**
```typescript
// Wherever the badge text is generated:
`Up to ${maxGuests} ${maxGuests === 1 ? 'guest' : 'guests'}`
```
- Check if the same pattern is used in Norwegian strings too: `Opptil 1 gjest` (singular) vs `Opptil 2 gjester` (plural)

---

## UI improvements (fix now or next pass)

### UI-1: Empty hero image renders as blank gray box

**Where:** Public booking page → top of page
**What's wrong:** When `photo_urls` is empty (no photos uploaded), a large gray rectangle renders at the top of the page. This is the first thing a guest sees.
**How to fix:**
- Option A: Don't render the hero/image section at all when `photo_urls` is empty or undefined
- Option B: Show a subtle placeholder with the property name and a muted background color using `primary_color` from the property record
- Option A is simpler and cleaner for the prototype

---

## Verified correct (no action needed)

### Pricing engine ✓
Spot-checked all four room types for May 23–25 (Saturday–Sunday). Weekend surcharge (+15%) applies correctly on Saturday only. Nightly breakdown and totals are accurate:

| Room type | Sat (base × 1.15) | Sun (base) | Total | Displayed | Match |
|-----------|-------------------|------------|-------|-----------|-------|
| Double ensuite | 1 489,25 | 1 295,00 | 2 784,25 | 2 784,25 | ✓ |
| Double shared | 1 029,25 | 895,00 | 1 924,25 | 1 924,25 | ✓ |
| Single | 799,25 | 695,00 | 1 494,25 | 1 494,25 | ✓ |
| Family | 2 064,25 | 1 795,00 | 3 859,25 | 3 859,25 | ✓ |

### Currency formatting ✓
Norwegian format with space as thousand separator and comma as decimal separator (`2 784,25 kr`). Correct throughout.

### Dashboard stats ✓
- Occupancy: 20% (2/10 rooms) — correct
- Revenue: 4 385 kr — matches the one `fully_paid` booking (FV-2026-0001), excludes unpaid. Correct behavior.
- Arrivals: 2 — matches booking count
- Cleaning: 1 — open housekeeping task

### Admin navigation ✓
All spec'd pages present in sidebar: Dashboard, Bookings, Calendar, Guests, Rooms, Pricing, Cleaning, Reports, Invoices, Settings. "Public booking" link in top-right is a useful addition not in the original spec.

### Booking reference format ✓
Using `FV-2026-NNNN` pattern with prefix from the property record. Will become client-specific (e.g. `BJ-2026-NNNN`) when deployed for a real client.

### Room availability ✓
All four room types show correct availability counts (3, 3, 2, 2 matching the seed data of 10 rooms).

### Multi-tenant readiness ✓
Property name, location, and branding come from the database — no hardcoded client names visible anywhere.

---

## Next review priorities

Once these fixes are in, the next review should cover:

1. **Stripe checkout flow** — complete a test booking end-to-end with `4242 4242 4242 4242`, verify webhook fires, booking status updates to `confirmed`, and room gets auto-assigned
2. **Email templates** — verify confirmation email renders in both NO and EN, contains correct booking details, self-service link works
3. **Guest cancellation flow** — cancel within policy, verify Stripe refund is issued, booking status updates, room is freed, cleaning task is removed
4. **Admin booking detail page** — verify full booking timeline, payment info, and action buttons (cancel, refund, reassign room)
5. **Rooms + Pricing CRUD** — add a room type, add a pricing rule, verify it affects the public booking page immediately
