import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";

describe("cron wiring", () => {
  it("daily cron sends reminders, thank-yous, and generates cleaning tasks", () => {
    const path = "src/app/api/cron/daily/route.ts";
    assert.equal(existsSync(path), true, `${path} should exist`);

    const route = readFileSync(path, "utf8");
    assert.match(route, /getBookingRefsForCheckInDate/);
    assert.match(route, /getBookingRefsForCheckOutDate/);
    assert.match(route, /ensureCleaningTask/);
    assert.match(route, /sendEmail/);
    assert.match(route, /"reminder"/);
    assert.match(route, /"thank_you"/);
    assert.match(route, /authorization.*CRON_SECRET|CRON_SECRET.*authorization/s);
    assert.doesNotMatch(route, /"local-demo"/);
  });

  it("cleanup cron auto-cancels stale pending bookings", () => {
    const path = "src/app/api/cron/cleanup/route.ts";
    assert.equal(existsSync(path), true, `${path} should exist`);

    const route = readFileSync(path, "utf8");
    assert.match(route, /cancelStalePendingBookings/);
    assert.match(route, /STALE_PENDING_MINUTES/);
    assert.match(route, /authorization.*CRON_SECRET|CRON_SECRET.*authorization/s);
    assert.doesNotMatch(route, /"local-demo"/);
  });

  it("queries.ts exposes the cron helpers the routes depend on", () => {
    const queries = readFileSync("src/lib/db/queries.ts", "utf8");

    for (const helper of [
      "getBookingRefsForCheckInDate",
      "getBookingRefsForCheckOutDate",
      "ensureCleaningTask",
      "cancelStalePendingBookings",
    ]) {
      assert.match(queries, new RegExp(`export async function ${helper}`));
    }
  });
});
