import Stripe from "stripe";
import { env } from "@/lib/env";

export function getStripeClient() {
  if (!env.stripeSecretKey) return null;
  return new Stripe(env.stripeSecretKey);
}

export async function createDemoCheckoutSession(input: {
  bookingRef: string;
  email: string;
}) {
  return {
    mode: "local-demo",
    url: `/booking/${input.bookingRef}?success=true&email=${encodeURIComponent(input.email)}`,
  };
}

export async function constructStripeEvent(body: string, signature: string | null) {
  const stripe = getStripeClient();
  if (!stripe || !env.stripeWebhookSecret || env.localDemoMode) {
    return { type: "local.demo", data: { object: JSON.parse(body || "{}") } };
  }
  if (!signature) {
    throw new Error("Missing Stripe signature");
  }
  return stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
}
