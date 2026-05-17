import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBookingCheckoutSessionParams,
  getCheckoutCompletedUpdate,
  getRefundedPaymentIntentId,
} from "./stripe";

describe("Stripe booking helpers", () => {
  it("builds a hosted Checkout Session for a pending booking", () => {
    const params = buildBookingCheckoutSessionParams({
      appUrl: "https://guesthub.test",
      propertyName: "Fjordview Lodge",
      bookingRef: "FV-2026-0007",
      bookingId: "booking-1",
      propertyId: "property-1",
      roomTypeName: "Fjord Suite",
      guestEmail: "guest@example.com",
      totalAmount: 129900,
      currency: "NOK",
    });

    assert.equal(params.mode, "payment");
    assert.equal(params.customer_email, "guest@example.com");
    assert.equal(params.client_reference_id, "FV-2026-0007");
    assert.equal(params.success_url, "https://guesthub.test/booking/FV-2026-0007?success=true&email=guest%40example.com");
    assert.equal(params.cancel_url, "https://guesthub.test/book/fjordview?cancelled=true");
    assert.deepEqual(params.metadata, {
      bookingId: "booking-1",
      bookingRef: "FV-2026-0007",
      propertyId: "property-1",
    });
    assert.equal(params.line_items?.[0]?.price_data?.unit_amount, 129900);
    assert.equal(params.line_items?.[0]?.price_data?.currency, "nok");
    assert.equal(params.line_items?.[0]?.price_data?.product_data?.name, "Fjordview Lodge - Fjord Suite");
  });

  it("extracts booking payment state from checkout.session.completed", () => {
    const update = getCheckoutCompletedUpdate({
      id: "cs_test_123",
      metadata: { bookingRef: "FV-2026-0007" },
      payment_intent: "pi_123",
      amount_total: 129900,
    });

    assert.deepEqual(update, {
      bookingRef: "FV-2026-0007",
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_123",
      paidAmount: 129900,
    });
  });

  it("extracts the payment intent from charge.refunded", () => {
    assert.equal(
      getRefundedPaymentIntentId({ payment_intent: "pi_123" }),
      "pi_123",
    );
  });
});
