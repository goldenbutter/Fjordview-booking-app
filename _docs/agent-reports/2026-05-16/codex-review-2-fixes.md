# Codex Review #2 Fixes

## Source

Review file: `_docs/review/guesthub-review-2.md`

## Fixed In This Pass

- Removed hardcoded demo-property references from root metadata, admin public-booking link, booking hero image alt text, local demo booking storage keys, and CSV filename generation.
- Changed local demo booking storage to a property-derived key via `demoBookingStorageKey(property.slug)`.
- Updated room auto-assignment to prefer the least-recently-used available room instead of returning the first available room.
- Added Zod validation for touched GET route params/query strings on property rooms, availability, booking lookup, and admin calendar APIs.
- Re-verified Review #1 surfaces through build/browser/API checks.

## Deferred

- Real Supabase persistence, Drizzle migrations/RLS, admin auth, Stripe Checkout/refunds/webhook side effects, full email templates, cron bodies, and admin CRUD remain production milestones. They require a larger integration slice and provider configuration rather than a safe local-demo patch.

## Verification

- `npm run lint`
- `npm run build`
- Browser checks for `/book/fjordview`, `/admin`, and `/admin/calendar`
- API checks for `/api/admin/calendar`, `/api/properties/fjordview/availability`, `/api/properties/fjordview/rooms`, invalid availability query validation, and CSV export headers
- LRU spot check with `npx tsx`
