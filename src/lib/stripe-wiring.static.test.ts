import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("Stripe route wiring", () => {
  it("creates public bookings as pending unpaid checkout sessions", () => {
    const route = readFileSync("src/app/api/properties/[slug]/bookings/route.ts", "utf8");

    assert.match(route, /createBookingCheckoutSession/);
    assert.match(route, /status:\s*"pending"/);
    assert.match(route, /paymentStatus:\s*"unpaid"/);
    assert.match(route, /paidAmount:\s*0/);
  });

  it("handles checkout completion and refund webhook events", () => {
    const route = readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8");

    assert.match(route, /checkout\.session\.completed/);
    assert.match(route, /charge\.refunded/);
    assert.match(route, /confirmBookingPayment/);
    assert.match(route, /markBookingRefundedByPaymentIntent/);
  });
});
