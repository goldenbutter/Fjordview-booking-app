import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  demoProperty,
  demoRoomTypes,
  demoRooms,
  demoSecondaryProperty,
  demoSecondaryRoomTypes,
  demoSecondaryRooms,
} from "@/lib/db/seed";

describe("multi-tenant seed shape", () => {
  it("exports two demo properties with distinct ids and slugs", () => {
    assert.notEqual(demoProperty.id, demoSecondaryProperty.id);
    assert.notEqual(demoProperty.slug, demoSecondaryProperty.slug);
    assert.equal(demoProperty.slug, "fjordview");
    assert.equal(demoSecondaryProperty.slug, "aurora-cabin");
  });

  it("every secondary-property room type is scoped to the secondary property", () => {
    for (const rt of demoSecondaryRoomTypes) {
      assert.equal(rt.propertyId, demoSecondaryProperty.id);
    }
    for (const r of demoSecondaryRooms) {
      assert.equal(r.propertyId, demoSecondaryProperty.id);
    }
  });

  it("primary-property arrays never reference the secondary property", () => {
    for (const rt of demoRoomTypes) {
      assert.equal(rt.propertyId, demoProperty.id);
    }
    for (const r of demoRooms) {
      assert.equal(r.propertyId, demoProperty.id);
    }
  });

  it("seed script loops a bundle per property", () => {
    const seedScript = readFileSync("scripts/seed-db.ts", "utf8");
    assert.match(seedScript, /seedPropertyBundle/);
    assert.match(seedScript, /demoSecondaryProperty/);
    assert.match(seedScript, /demoProperty,\s*\n/);
  });
});
