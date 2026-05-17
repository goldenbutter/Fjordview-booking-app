import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";

describe("email wiring", () => {
  it("ships the required React Email templates and shared components", () => {
    const paths = [
      "src/emails/booking-confirmation.tsx",
      "src/emails/payment-receipt.tsx",
      "src/emails/pre-arrival-reminder.tsx",
      "src/emails/post-stay-thankyou.tsx",
      "src/emails/cancellation-confirmation.tsx",
      "src/emails/invoice-email.tsx",
      "src/emails/admin-notification.tsx",
      "src/emails/components/email-header.tsx",
      "src/emails/components/email-footer.tsx",
      "src/emails/components/booking-detail-block.tsx",
    ];

    for (const path of paths) {
      assert.equal(existsSync(path), true, `${path} should exist`);
      assert.doesNotMatch(readFileSync(path, "utf8"), /Fjordview|fjordview/);
    }
  });

  it("writes every send attempt to email_log", () => {
    const email = readFileSync("src/lib/email.ts", "utf8");
    const queries = readFileSync("src/lib/db/queries.ts", "utf8");

    assert.match(email, /logEmail/);
    assert.match(queries, /export async function logEmail/);
    assert.match(queries, /insert\(schema\.emailLog\)/);
  });

  it("sends confirmation/admin emails after Stripe checkout and cancellation email after cancel", () => {
    const stripeWebhook = readFileSync("src/app/api/webhooks/stripe/route.ts", "utf8");
    const cancelRoute = readFileSync("src/app/api/bookings/[ref]/cancel/route.ts", "utf8");

    assert.match(stripeWebhook, /sendEmail/);
    assert.match(stripeWebhook, /type:\s*"confirmation"/);
    assert.match(stripeWebhook, /type:\s*"admin_notification"/);
    assert.match(cancelRoute, /sendEmail/);
    assert.match(cancelRoute, /type:\s*"cancellation"/);
  });
});
