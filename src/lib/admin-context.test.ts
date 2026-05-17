import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAdminPropertyId } from "./admin-context";

describe("resolveAdminPropertyId", () => {
  it("uses the default property in local demo mode", async () => {
    const propertyId = await resolveAdminPropertyId({
      localDemoMode: true,
      defaultPropertyId: "property-default",
      userId: null,
      findAdminPropertyId: async () => {
        throw new Error("should not look up admin users in demo mode");
      },
    });

    assert.equal(propertyId, "property-default");
  });

  it("uses the signed-in admin user's property outside demo mode", async () => {
    const propertyId = await resolveAdminPropertyId({
      localDemoMode: false,
      defaultPropertyId: "property-default",
      userId: "auth-user-1",
      findAdminPropertyId: async (userId) => (userId === "auth-user-1" ? "property-admin" : null),
    });

    assert.equal(propertyId, "property-admin");
  });

  it("does not fall back to the default property when auth has no active admin mapping", async () => {
    const propertyId = await resolveAdminPropertyId({
      localDemoMode: false,
      defaultPropertyId: "property-default",
      userId: "unknown-user",
      findAdminPropertyId: async () => null,
    });

    assert.equal(propertyId, null);
  });

  it("does not expose any property outside demo mode without a signed-in user", async () => {
    const propertyId = await resolveAdminPropertyId({
      localDemoMode: false,
      defaultPropertyId: "property-default",
      userId: null,
      findAdminPropertyId: async () => "property-admin",
    });

    assert.equal(propertyId, null);
  });
});
