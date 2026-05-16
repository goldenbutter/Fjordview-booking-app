# Prototype To Production Migration

Fjordview Lodge is demo data. A real client launch should change database seed
data and environment variables, not application code.

1. Create a dedicated Supabase project for the client.
2. Set `DATABASE_URL` to the Supabase pooled Postgres connection string.
3. Run Drizzle migrations against the new database with `npx drizzle-kit migrate`.
4. Seed the `properties`, `room_types`, `rooms`, `pricing_rules`, `guests`,
   `bookings`, `cancellation_policies`, `cleaning_tasks`, `email_log`, and
   `admin_users` tables with the real client data.
5. Verify RLS policies by logging in as an admin user and confirming that only
   rows for that admin's `property_id` are visible.
6. Switch Stripe from test keys to live keys and create a production webhook.
7. Configure an email provider. The prompt recommends Resend, which is a
   transactional email service like SendGrid or Mailgun.
8. Set `NEXT_PUBLIC_APP_URL`, `DEFAULT_PROPERTY_SLUG`, and contact email values
   for the client domain.
9. Set `LOCAL_DEMO_MODE=false` after Supabase Auth and `admin_users` are ready.
10. Deploy to Vercel and assign the custom domain.
11. Run a full booking smoke test: availability, checkout, webhook, email,
   guest self-service, admin dashboard, cancellation, and refund path.
12. Keep client-specific names, logos, phone numbers, colors, and policies in
   database/config data only.
