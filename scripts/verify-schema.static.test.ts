import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("verify-schema", () => {
  it("checks the accepted public.current_property_id() helper", () => {
    const content = readFileSync("scripts/verify-schema.ts", "utf8");

    assert.match(content, /current_property_id/);
    assert.doesNotMatch(content, /auth\.property_id|proname = 'property_id'/);
  });
});
