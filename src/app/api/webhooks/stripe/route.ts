import { NextResponse } from "next/server";
import { confirmBookingPayment, getBookingByRef, markBookingRefundedByPaymentIntent } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import {
  constructStripeEvent,
  getCheckoutCompletedUpdate,
  getRefundedPaymentIntentId,
} from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  try {
    const event = await constructStripeEvent(body, signature);
    if (event.type === "checkout.session.completed") {
      const update = getCheckoutCompletedUpdate(event.data.object);
      if (update) {
        const booking = await confirmBookingPayment(update);
        if (booking) {
          const detail = await getBookingByRef(booking.bookingRef);
          if (detail) {
            const selfServiceUrl = `${env.appUrl}/booking/${encodeURIComponent(detail.booking.bookingRef)}?email=${encodeURIComponent(detail.guest.email)}`;
            await Promise.all([
              sendEmail({ ...detail, selfServiceUrl, type: "confirmation" }),
              sendEmail({ ...detail, selfServiceUrl, type: "receipt" }),
              sendEmail({ ...detail, selfServiceUrl, type: "admin_notification" }),
            ]);
          }
        }
      }
    }
    if (event.type === "charge.refunded") {
      const paymentIntentId = getRefundedPaymentIntentId(event.data.object);
      if (paymentIntentId) {
        await markBookingRefundedByPaymentIntent(paymentIntentId);
      }
    }
    return NextResponse.json({
      received: true,
      eventType: event.type,
      mode: event.type === "local.demo" ? "local-demo" : "stripe",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook" },
      { status: 400 },
    );
  }
}
