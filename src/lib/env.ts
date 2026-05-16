export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  defaultPropertySlug: process.env.DEFAULT_PROPERTY_SLUG ?? "fjordview",
  localDemoMode: process.env.LOCAL_DEMO_MODE !== "false",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "noreply@example.com",
};
