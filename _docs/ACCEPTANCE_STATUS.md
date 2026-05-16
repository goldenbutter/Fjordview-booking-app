# Acceptance Status

This file maps the OPUS prompt acceptance criteria to the current prototype.

## Demo-Ready In Local Mode

- Guest can browse rooms and search availability for dates.
- Prices reflect base price plus seasonal and day-of-week rules.
- Guest can complete a local-demo booking and see a confirmation state.
- Guest can open self-service details for browser-created bookings.
- Guest can cancel locally in the self-service page.
- Admin dashboard shows occupancy, revenue, recent bookings, and cleaning.
- Admin has pages for bookings, calendar, guests, rooms, pricing, cleaning,
  reports, settings, and invoices.
- Reports include a CSV export endpoint.
- Booking flow works on mobile and desktop in browser verification.
- Admin dashboard works in desktop/tablet-style layout.
- `.env.example`, `MIGRATION.md`, phase reports, and OPUS dispatch prompt exist.

## Integration-Ready But Not Connected

- Stripe checkout and webhook verification code paths exist, but real test keys
  have not been configured or exercised.
- Resend send path exists, but local demo logs emails until `RESEND_API_KEY` is
  configured.
- Supabase SSR client and Drizzle schema scaffolding exist, but real migrations,
  RLS deployment, and persistence are not connected.
- Cron routes exist for Vercel Hobby limits, but real scheduled delivery is not
  deployed.
- Invoice generation is text/JSON prototype output, not production PDF output.

## Known Gaps For OPUS Review

- Full database schema from the prompt is only partially represented in Drizzle.
- Admin CRUD API matrix is not complete.
- Real auth guard for `/admin` is not enabled.
- Confirmation/cancellation email React templates are minimal.
- Multi-tenant isolation must be verified after Supabase persistence is added.
- Public rate limiting is an in-memory prototype helper; production should use
  a durable edge/runtime store.
