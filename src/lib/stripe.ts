import Stripe from "stripe";
import { env } from "@/lib/env";

export function getStripeClient() {
  if (!env.stripeSecretKey) return null;
  return new Stripe(env.stripeSecretKey);
}

export type BookingCheckoutSessionInput = {
  appUrl: string;
  propertySlug?: string;
  propertyName: string;
  bookingRef: string;
  bookingId: string;
  propertyId: string;
  roomTypeName: string;
  guestEmail: string;
  totalAmount: number;
  currency: string;
};

export function buildBookingCheckoutSessionParams(
  input: BookingCheckoutSessionInput,
): Stripe.Checkout.SessionCreateParams {
  const appUrl = input.appUrl.replace(/\/$/, "");
  return {
    mode: "payment",
    customer_email: input.guestEmail,
    client_reference_id: input.bookingRef,
    success_url: `${appUrl}/booking/${encodeURIComponent(input.bookingRef)}?success=true&email=${encodeURIComponent(input.guestEmail)}`,
    cancel_url: `${appUrl}/book/${input.propertySlug ?? "fjordview"}?cancelled=true`,
    metadata: {
      bookingId: input.bookingId,
      bookingRef: input.bookingRef,
      propertyId: input.propertyId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.totalAmount,
          product_data: {
            name: `${input.propertyName} - ${input.roomTypeName}`,
          },
        },
      },
    ],
  };
}

export async function createBookingCheckoutSession(input: BookingCheckoutSessionInput) {
  const stripe = getStripeClient();
  if (!stripe) {
    const session = await createDemoCheckoutSession({
      bookingRef: input.bookingRef,
      email: input.guestEmail,
    });
    return { ...session, id: null };
  }

  const session = await stripe.checkout.sessions.create(buildBookingCheckoutSessionParams(input));
  return {
    mode: "stripe",
    id: session.id,
    url: session.url,
  };
}

export function getCheckoutCompletedUpdate(session: {
  id: string;
  metadata?: Stripe.Metadata | null;
  payment_intent?: string | Stripe.PaymentIntent | null;
  amount_total?: number | null;
}) {
  const bookingRef = session.metadata?.bookingRef;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!bookingRef || !paymentIntent || session.amount_total == null) {
    return null;
  }

  return {
    bookingRef,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntent,
    paidAmount: session.amount_total,
  };
}

export function getRefundedPaymentIntentId(charge: {
  payment_intent?: string | Stripe.PaymentIntent | null;
}) {
  return typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;
}

export async function refundPaymentIntent(input: {
  paymentIntentId: string;
  amount: number;
  bookingRef: string;
}) {
  const stripe = getStripeClient();
  if (!stripe) {
    return { mode: "local-demo" as const, id: null };
  }

  const refund = await stripe.refunds.create({
    payment_intent: input.paymentIntentId,
    amount: input.amount,
    metadata: { bookingRef: input.bookingRef },
  });
  return { mode: "stripe" as const, id: refund.id };
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
  if (!stripe || !env.stripeWebhookSecret) {
    return { type: "local.demo", data: { object: JSON.parse(body || "{}") } };
  }
  if (!signature) {
    throw new Error("Missing Stripe signature");
  }
  return stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
}
