# Prototype To Production Migration

Fjordview Lodge is demo data. A real client launch should change database seed
data and environment variables, not application code.

1. Create a dedicated Supabase project for the client.
2. Run Drizzle migrations against the new database.
3. Seed the `properties`, `room_types`, `rooms`, `pricing_rules`, and policy
   tables with the real client data.
4. Enable and verify RLS policies for every table that includes `property_id`.
5. Switch Stripe from test keys to live keys and create a production webhook.
6. Configure an email provider. The prompt recommends Resend, which is a
   transactional email service like SendGrid or Mailgun.
7. Set `NEXT_PUBLIC_APP_URL`, `DEFAULT_PROPERTY_SLUG`, and contact email values
   for the client domain.
8. Deploy to Vercel and assign the custom domain.
9. Run a full booking smoke test: availability, checkout, webhook, email,
   guest self-service, admin dashboard, cancellation, and refund path.
10. Keep client-specific names, logos, phone numbers, colors, and policies in
   database/config data only.
